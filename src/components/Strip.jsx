import { useCallback, useRef, useState } from 'react'
import { EDGE_SLOTS } from '../constants.js'
import { ThreePeopleIcon, TrashIcon, TwoPeopleIcon } from './Icons.jsx'
import HeadNotes from '../effects/HeadNotes.jsx'
import WarpCanvas from '../effects/WarpCanvas.jsx'

const DRAG_START_PX = 6

// Today as YYYY.MM.DD in the visitor's local time.
function todayLabel() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`
}

// Position/size of one piece of frame text. Art pixels become % of the strip and cqw, so the text
// keeps its proportions on any screen (the art itself is stretched, the font never is).
function textStyle(t, { width, height }) {
  const tx = t.rotate || t.align === 'center' ? -50 : t.align === 'right' ? -100 : 0
  return {
    left: `${(t.x / width) * 100}%`,
    top: `${(t.y / height) * 100}%`,
    fontSize: `${(t.size / width) * 100}cqw`,
    color: t.color,
    transform: `translate(${tx}%, -50%)${t.rotate ? ` rotate(${t.rotate}deg)` : ''}`,
  }
}

const clamp = (n, min, max) => Math.min(max, Math.max(min, n))

// Live camera preview; only mounted in the cell that will receive the next photo.
function LiveVideo({ stream, videoRef, filter, warp }) {
  // Distortion filters draw the video through a WebGL canvas; if WebGL fails we show the plain video.
  const [warpFailed, setWarpFailed] = useState(false)
  const warping = Boolean(warp) && !warpFailed
  const setRef = useCallback(
    (el) => {
      videoRef.current = el
      if (el && stream && el.srcObject !== stream) {
        el.srcObject = stream
        el.play().catch(() => {})
      }
    },
    [stream, videoRef],
  )
  return (
    <>
      {/* Kept (invisible) while warping: it is the source the canvas, the capture and face tracking read. */}
      <video ref={setRef} playsInline muted autoPlay style={{ filter, opacity: warping ? 0 : undefined }} />
      {warping && (
        <WarpCanvas videoRef={videoRef} warp={warp} filter={filter} onFail={() => setWarpFailed(true)} />
      )}
    </>
  )
}

function Cell({
  photo,
  live,
  selected,
  reorderable,
  dragging,
  shifting,
  offset,
  stream,
  videoRef,
  filter,
  warp,
  effect,
  overlayRef,
  notes,
  onClick,
  onDelete,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}) {
  const className = [
    'cell',
    photo && 'filled',
    selected && 'selected',
    reorderable && 'reorderable',
    dragging && 'dragging',
    shifting && 'shifting',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={className}
      style={offset ? { transform: `translateY(${offset}px)` } : undefined}
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      {photo ? (
        <img src={photo} alt="" draggable={false} />
      ) : live ? (
        <>
          <LiveVideo stream={stream} videoRef={videoRef} filter={filter} warp={warp} />
          {effect === 'notes' && <HeadNotes videoRef={videoRef} canvasRef={overlayRef} notes={notes} />}
        </>
      ) : null}

      {selected && (
        <button
          type="button"
          className="delete-btn"
          aria-label="Delete photo"
          // Keep the press away from the cell's drag handling (it captures the pointer).
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
        >
          <TrashIcon size={20} />
        </button>
      )}
    </div>
  )
}

export default function Strip({
  frame,
  ghost = false, // neighbouring frame shown while swiping: display only, never owns the camera ref
  mono,
  onSetMono,
  photos,
  activeIndex,
  selected,
  reorderable,
  stream,
  videoRef,
  filter,
  warp,
  effect,
  overlayRef,
  notes,
  onCellClick,
  onDelete,
  onMove,
}) {
  const count = photos.length
  const ghostVideoRef = useRef(null)
  const camRef = ghost ? ghostVideoRef : videoRef
  // While a photo is dragged: which cell, how far it has moved, and the slot size.
  const [drag, setDrag] = useState(null) // { from, dy, step }
  const gesture = useRef(null) // { from, startY, step, moved }
  const justDragged = useRef(false) // a drag ends with a click on the cell: don't treat it as a tap

  // Slot the dragged photo would land in if released now.
  const target = drag ? clamp(drag.from + Math.round(drag.dy / drag.step), 0, count - 1) : null

  // Vertical offset of each cell: the dragged one follows the finger, the ones it passes
  // over slide one slot out of the way so the user sees the resulting order.
  const offsetOf = (i) => {
    if (!drag) return 0
    if (i === drag.from) return drag.dy
    if (drag.from < target && i > drag.from && i <= target) return -drag.step
    if (drag.from > target && i >= target && i < drag.from) return drag.step
    return 0
  }

  const onPointerDown = (e, i) => {
    if (!reorderable || count < 2) return
    e.stopPropagation() // keep the stage's horizontal frame-swipe out of this gesture
    justDragged.current = false
    e.currentTarget.setPointerCapture(e.pointerId)
    const row = e.currentTarget.parentElement
    gesture.current = {
      from: i,
      startY: e.clientY,
      step: row.children[1].offsetTop - row.children[0].offsetTop,
      moved: false,
    }
  }

  const onPointerMove = (e) => {
    const g = gesture.current
    if (!g) return
    const delta = e.clientY - g.startY
    if (!g.moved && Math.abs(delta) < DRAG_START_PX) return
    g.moved = true
    setDrag({
      from: g.from,
      step: g.step,
      dy: clamp(delta, -g.from * g.step, (count - 1 - g.from) * g.step),
    })
  }

  const endDrag = (cancelled) => {
    const g = gesture.current
    gesture.current = null
    if (!g) return
    justDragged.current = g.moved
    if (g.moved && !cancelled && drag && target !== g.from) onMove(g.from, target)
    setDrag(null)
  }

  const style = {
    '--ink': frame.ink,
    '--divider': frame.divider,
    background: frame.bg,
  }
  if (frame.art) {
    // The art covers the whole screen, so header and bottom zone are plain fractions of its height.
    const { height, top, bottom } = frame.artSize
    style['--logo-h'] = `${(top / height) * 100}%`
    style['--footer-h'] = `${(bottom / height) * 100}%`
    style['--pad-bottom'] = '0px'
  }

  return (
    <div className="strip" style={style}>
      {frame.art && <img className="strip-art" src={frame.art} alt="" draggable={false} />}
      {frame.texts && (
        <div className="strip-art-text" aria-hidden="true">
          {frame.texts.map((t, i) => (
            <span key={i} style={textStyle(t, frame.artSize)}>
              {t.text.replace('{date}', todayLabel())}
            </span>
          ))}
        </div>
      )}

      <div className="strip-logo">
        <span>{frame.logo}</span>
        {/* One switch: tapping anywhere on it flips the mode and the white thumb slides across.
            Left = strip mode (two-people icon), right = mono / single photo (three-people icon). */}
        <button
          type="button"
          role="switch"
          aria-checked={mono}
          aria-label="Single photo mode"
          className="mode-toggle"
          data-mono={mono}
          onClick={() => onSetMono(!mono)}
        >
          <span className="mode-thumb" />
          <span className="mode-seg" data-mode="strip" data-active={!mono}>
            <TwoPeopleIcon size={20} />
          </span>
          <span className="mode-seg" data-mode="mono" data-active={mono}>
            <ThreePeopleIcon size={20} />
          </span>
        </button>
      </div>

      <div className="strip-body">
        <div className="cells" style={{ gridTemplateRows: `repeat(${count}, 1fr)` }}>
          {Array.from({ length: count }, (_, i) => (
            <Cell
              key={i}
              photo={photos[i]}
              live={i === activeIndex}
              selected={!ghost && i === selected}
              reorderable={reorderable}
              dragging={drag?.from === i}
              shifting={drag != null && drag.from !== i}
              offset={offsetOf(i)}
              stream={stream}
              videoRef={camRef}
              filter={filter}
              warp={warp}
              effect={ghost ? undefined : effect} // face tracking only runs on the visible frame
              overlayRef={overlayRef}
              notes={notes}
              onClick={() => {
                if (justDragged.current) {
                  justDragged.current = false
                  return
                }
                onCellClick(i)
              }}
              onDelete={() => onDelete(i)}
              onPointerDown={(e) => onPointerDown(e, i)}
              onPointerMove={onPointerMove}
              onPointerUp={() => endDrag(false)}
              onPointerCancel={() => endDrag(true)}
            />
          ))}
        </div>

        {/* Film-edge details: arrows + numbers on the left, vertical text on the right. */}
        <div className="edge edge-left" aria-hidden="true">
          {frame.numbers.length > 0 &&
            Array.from({ length: EDGE_SLOTS }, (_, i) => (
              <div key={i} className="edge-slot">
                <span className="arrow">▲</span>
                <span className="num">{frame.numbers[i] || ''}</span>
              </div>
            ))}
        </div>
        <div className="edge edge-right" aria-hidden="true">
          {frame.sideText.length > 0 &&
            Array.from({ length: EDGE_SLOTS }, (_, i) => (
              <div key={i} className="edge-slot">
                <span className="vtext">{frame.sideText[i] || ''}</span>
              </div>
            ))}
        </div>
      </div>

      <div className="strip-footer">{frame.footer}</div>
    </div>
  )
}
