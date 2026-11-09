import { useEffect, useRef, useState } from 'react'
import Strip from './components/Strip.jsx'
import { useCamera } from './hooks/useCamera.js'
import { useWakeLock } from './hooks/useWakeLock.js'
import { frames } from './frames/index.js'
import { MODES } from './constants.js'
import { ResetIcon } from './components/Icons.jsx'
import FilterCarousel from './components/FilterCarousel.jsx'
import { filters, defaultFilterIndex } from './filters.js'
import { randomNotes } from './effects/notes.js'
import { captureWarped } from './effects/warp.js'

const SWIPE_PX = 40 // drag distance that commits a frame change
const LOCK_PX = 8 // movement before a gesture is classified horizontal/vertical
const SETTLE_MS = 210 // matches the .track.settling transition
const IDLE = { dx: 0, settling: false, dir: 0 }
// Ignore Delete taps right after it appears, so a double-tap on a photo can't delete it.
const DELETE_GUARD_MS = 350

function initialIndex() {
  const id = new URLSearchParams(window.location.search).get('frame')
  const i = frames.filter((f) => f.mode !== 'mono').findIndex((f) => f.id === id) // app starts in strip mode
  return i >= 0 ? i : 0
}

const MESSAGES = {
  loading: 'Starting camera…',
  denied: 'Camera access was blocked. Allow the camera in your browser settings, then reload.',
  unsupported:
    'This browser can’t open the camera. Open this page in Safari or Chrome instead.',
  error: 'Couldn’t start the camera. Close other apps using it and reload.',
}

// Grab the current video frame, cropped exactly like the cell shows it (object-fit: cover),
// and mirrored so the saved photo matches the mirrored preview.
function captureFrame(video, filter, overlay, warp) {
  // Distortion filters go through the same WebGL shader as the live preview (null = no WebGL: plain capture).
  if (warp) {
    const warped = captureWarped(video, warp, filter)
    if (warped) return warped
  }
  const cw = video.clientWidth
  const ch = video.clientHeight
  const vw = video.videoWidth
  const vh = video.videoHeight
  if (!cw || !ch || !vw || !vh) return null

  const sw = Math.min(vw, (vh * cw) / ch)
  const sh = (sw * ch) / cw
  const sx = (vw - sw) / 2
  const sy = (vh - sh) / 2

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(sw)
  canvas.height = Math.round(sh)
  const ctx = canvas.getContext('2d')
  ctx.translate(canvas.width, 0)
  ctx.scale(-1, 1)
  if (filter && filter !== 'none' && 'filter' in ctx) ctx.filter = filter // same look as the preview
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
  // Effect overlay (e.g. music notes): already mirrored and cropped like the cell, so copy as-is.
  if (overlay?.width) {
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.filter = 'none'
    ctx.drawImage(overlay, 0, 0, canvas.width, canvas.height)
  }
  return canvas.toDataURL('image/jpeg', 0.92)
}

function App() {
  const [frameIndex, setFrameIndex] = useState(initialIndex)
  const [mode, setMode] = useState('strip')
  const [filterIndex, setFilterIndex] = useState(defaultFilterIndex) // starts on Normal
  const filter = filters[filterIndex]
  // Photos are kept per mode, so toggling Mono on and off doesn't lose either set.
  const [photosByMode, setPhotosByMode] = useState(() =>
    Object.fromEntries(Object.entries(MODES).map(([m, { cells }]) => [m, Array(cells).fill(null)])),
  )
  const photos = photosByMode[mode]
  const setPhotos = (update) =>
    setPhotosByMode((prev) => ({ ...prev, [mode]: update(prev[mode]) }))
  // Cell showing the floating delete button (capture phase only).
  const [selected, setSelected] = useState(null)
  const selectedAt = useRef(0)
  const [swipe, setSwipe] = useState(IDLE) // { dx: track offset px, settling, dir: -1 | 0 | 1 }
  const gesture = useRef(null)
  const suppressClick = useRef(false)
  const pagerRef = useRef(null)
  const videoRef = useRef(null)
  // Notes effect: a new random mix of note shapes/colours for each cell.
  const [notes, setNotes] = useState(randomNotes)
  const overlayRef = useRef(null) // effect canvas over the live cell, if the filter has one
  const { stream, status } = useCamera()
  useWakeLock()

  // Frames offered in the current mode, and the one on screen (falls back to the first if the
  // previously selected frame doesn't exist in this mode).
  const shown = frames.filter((f) => !f.mode || f.mode === mode)
  const n = shown.length
  const current = frameIndex < n ? frameIndex : 0

  const activeIndex = photos.indexOf(null) // next empty cell, -1 when every cell is filled
  const full = activeIndex === -1
  const reorderable = full && photos.length > 1 // a single photo has nothing to reorder

  const setMono = (mono) => {
    setMode(mono ? 'mono' : 'strip')
    setFrameIndex(0) // each mode starts on its own default frame (mono: Navy, strip: first)
    setSelected(null)
  }

  // After the snap animation: commit the frame change, then reset the track without animating
  // (the new current frame is already sitting at offset 0, so nothing visibly jumps).
  useEffect(() => {
    if (!swipe.settling) return
    const t = setTimeout(() => {
      if (swipe.dir) setFrameIndex((i) => ((i < n ? i : 0) + swipe.dir + n) % n)
      setSwipe(IDLE)
    }, SETTLE_MS)
    return () => clearTimeout(t)
  }, [swipe, n])

  const takePicture = () => {
    if (full || !videoRef.current) return
    const shot = captureFrame(videoRef.current, filter.css, filter.effect ? overlayRef.current : null, filter.warp)
    if (!shot) return
    setPhotos((prev) => prev.map((p, i) => (i === activeIndex ? shot : p)))
    setNotes(randomNotes()) // the next cell gets different notes
    setSelected(null)
  }

  const deletePhoto = (i) => {
    if (Date.now() - selectedAt.current < DELETE_GUARD_MS) return
    setPhotos((prev) => prev.map((p, idx) => (idx === i ? null : p)))
    setSelected(null)
  }

  const onCellClick = (i) => {
    if (!photos[i]) return
    if (selected === i) {
      setSelected(null)
    } else {
      selectedAt.current = Date.now()
      setSelected(i)
    }
  }

  const movePhoto = (from, to) => {
    setSelected(null)
    setPhotos((prev) => {
      const next = [...prev]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return next
    })
  }

  const startOver = () => {
    setPhotos((prev) => prev.map(() => null))
    setSelected(null)
  }

  // Frame swipe: the track follows the finger, then snaps to the next/previous frame or back.
  const onPointerDown = (e) => {
    if (swipe.settling) return
    suppressClick.current = false
    gesture.current = {
      x: e.clientX,
      y: e.clientY,
      t: performance.now(),
      width: pagerRef.current.offsetWidth,
      locked: null, // 'h' once the gesture is clearly horizontal, 'v' if vertical
    }
  }

  const onPointerMove = (e) => {
    const g = gesture.current
    if (!g) return
    const dx = e.clientX - g.x
    const dy = e.clientY - g.y
    if (!g.locked) {
      if (Math.hypot(dx, dy) < LOCK_PX) return
      g.locked = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v'
      if (g.locked === 'h') e.currentTarget.setPointerCapture(e.pointerId)
    }
    if (g.locked === 'h' && n > 1) setSwipe({ dx, settling: false, dir: 0 })
  }

  const endSwipe = (e, cancelled) => {
    const g = gesture.current
    gesture.current = null
    if (!g || g.locked !== 'h') return
    suppressClick.current = true // the drag must not count as a tap on whatever is underneath
    const dx = e.clientX - g.x
    const speed = Math.abs(dx) / Math.max(1, performance.now() - g.t)
    const commit = !cancelled && (Math.abs(dx) >= SWIPE_PX || (Math.abs(dx) > 15 && speed > 0.4))
    const dir = commit && n > 1 ? (dx < 0 ? 1 : -1) : 0
    setSwipe({ dx: -dir * g.width, settling: true, dir })
  }

  return (
    <main
      className="stage"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(e) => endSwipe(e, false)}
      onPointerCancel={(e) => endSwipe(e, true)}
      onClickCapture={(e) => {
        if (suppressClick.current) {
          suppressClick.current = false
          e.stopPropagation()
        }
      }}
      onClick={(e) => {
        if (!e.target.closest('.strip')) setSelected(null)
      }}
    >
      <div className="pager" ref={pagerRef}>
        <div
          className={swipe.settling ? 'track settling' : 'track'}
          style={{ transform: `translateX(${swipe.dx}px)` }}
        >
          {shown.map((f, i) => {
            // -1 = previous frame, 0 = current, 1 = next (wrapping around)
            const rel = n < 2 ? 0 : ((((i - current + 1) % n) + n) % n) - 1
            if (rel < -1 || rel > 1) return null
            return (
              <div
                key={f.id}
                className={rel === 0 ? 'page' : 'page ghost'}
                style={{ left: `${rel * 100}%` }}
              >
                <Strip
                  frame={f}
                  ghost={rel !== 0}
                  mono={mode === 'mono'}
                  onSetMono={setMono}
                  photos={photos}
                  activeIndex={activeIndex}
                  selected={selected}
                  reorderable={reorderable}
                  stream={stream}
                  videoRef={videoRef}
                  filter={filter.css}
                  warp={filter.warp}
                  effect={filter.effect}
                  overlayRef={overlayRef}
                  notes={notes}
                  onCellClick={onCellClick}
                  onDelete={deletePhoto}
                  onMove={movePhoto}
                />
              </div>
            )
          })}
        </div>
      </div>

      {status !== 'ready' && <p className="notice">{MESSAGES[status]}</p>}

      <div className="controls" style={{ color: shown[current].ink }}>
        {full ? (
          <button type="button" className="reset-btn" aria-label="Start over" onClick={startOver}>
            <ResetIcon size={32} />
          </button>
        ) : (
          <FilterCarousel
            filters={filters}
            index={filterIndex}
            onIndex={setFilterIndex}
            onShutter={takePicture}
            disabled={status !== 'ready'}
            shutterLabel={`Take picture (${photos.filter(Boolean).length} of ${photos.length} taken)`}
          />
        )}
      </div>
    </main>
  )
}

export default App
