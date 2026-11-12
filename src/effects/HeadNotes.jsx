import { useEffect } from 'react'
import { loadFaceDetector } from './faceDetector.js'
import { randomNotes } from './notes.js'

const SMOOTH = 0.35 // how fast the notes catch up with the head (0..1 per frame)
const LOST_FADE_MS = 400 // fade-out time after a face is lost
const MAX_FACES = 6
const MATCH_DIST = 1.2 // a detection belongs to a tracked head if its centre is within this many face widths

// Overlay canvas for the live cell: tracks every face in `videoRef` and draws music notes above
// each head. The canvas holds the final (already mirrored) picture, so capture can copy it as-is.
// `notes` (from randomNotes() in notes.js, a new mix for every cell) goes to the first person;
// anyone else who appears gets their own random mix.
export default function HeadNotes({ videoRef, canvasRef, notes }) {
  useEffect(() => {
    let cancelled = false
    let raf = 0
    let detector = null
    const heads = [] // { x, y, w, seenAt, mix } — one per tracked face
    const mixes = [notes] // note sets handed out to heads; a set is reused once its head is gone

    loadFaceDetector()
      .then((d) => {
        if (!cancelled) {
          detector = d
          raf = requestAnimationFrame(tick)
        }
      })
      .catch((err) => console.warn('Face detector failed to load', err))

    let lastTs = 0
    function tick(now) {
      raf = requestAnimationFrame(tick)
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas || video.readyState < 2 || !video.videoWidth) return

      // Keep the canvas at the cell's size (in device pixels).
      const cw = canvas.clientWidth
      const ch = canvas.clientHeight
      const dpr = window.devicePixelRatio || 1
      if (canvas.width !== Math.round(cw * dpr) || canvas.height !== Math.round(ch * dpr)) {
        canvas.width = Math.round(cw * dpr)
        canvas.height = Math.round(ch * dpr)
      }

      // Detect (timestamps must strictly increase).
      const ts = Math.max(now, lastTs + 1)
      lastTs = ts
      let boxes = []
      try {
        boxes = detector
          .detectForVideo(video, ts)
          .detections.map((d) => d.boundingBox)
          .filter(Boolean)
          .slice(0, MAX_FACES)
      } catch {
        // a frame the detector couldn't read; just skip it
      }

      // Video pixels -> cell pixels (object-fit: cover), then mirror like the preview.
      const vw = video.videoWidth
      const vh = video.videoHeight
      const s = Math.max(cw / vw, ch / vh)
      const ox = (cw - vw * s) / 2
      const oy = (ch - vh * s) / 2
      const faces = boxes.map((b) => ({
        x: cw - (ox + (b.originX + b.width / 2) * s),
        y: oy + b.originY * s,
        w: b.width * s,
      }))

      // Match each face to the nearest tracked head (closest pairs first), so every person keeps
      // their own notes while moving around.
      const pairs = []
      faces.forEach((f, fi) =>
        heads.forEach((h, hi) => {
          const d = Math.hypot(f.x - h.x, f.y - h.y)
          if (d < MATCH_DIST * Math.max(f.w, h.w)) pairs.push({ fi, hi, d })
        }),
      )
      pairs.sort((a, b) => a.d - b.d)
      const usedFace = new Set()
      const usedHead = new Set()
      for (const { fi, hi } of pairs) {
        if (usedFace.has(fi) || usedHead.has(hi)) continue
        usedFace.add(fi)
        usedHead.add(hi)
        const f = faces[fi]
        const h = heads[hi]
        h.x += (f.x - h.x) * SMOOTH
        h.y += (f.y - h.y) * SMOOTH
        h.w += (f.w - h.w) * SMOOTH
        h.seenAt = now
      }

      // Drop heads that have fully faded, then start tracking any new faces.
      for (let i = heads.length - 1; i >= 0; i--) {
        if (now - heads[i].seenAt >= LOST_FADE_MS) heads.splice(i, 1)
      }
      faces.forEach((f, fi) => {
        if (usedFace.has(fi)) return
        // Lowest free note set: the cell's own mix first, then extra random ones.
        let mix = 0
        while (heads.some((h) => h.mix === mix)) mix++
        if (mix >= mixes.length) mixes.push(randomNotes())
        heads.push({ ...f, seenAt: now, mix })
      })

      const ctx = canvas.getContext('2d')
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      if (!heads.length) return

      const t = now / 1000
      ctx.shadowColor = 'rgba(0, 0, 0, 0.35)'
      ctx.shadowBlur = 6 * dpr
      for (const head of heads) {
        ctx.globalAlpha = 1 - Math.min(1, (now - head.seenAt) / LOST_FADE_MS)
        const offset = head.mix * 1.3 // so different people's notes don't bob in sync
        for (const n of mixes[head.mix]) {
          const size = n.size * head.w * dpr
          const bob = Math.sin(t * 2.2 + n.phase + offset) * 0.08 * head.w
          ctx.setTransform(1, 0, 0, 1, 0, 0)
          ctx.translate((head.x + n.x * head.w) * dpr, (head.y + n.y * head.w + bob) * dpr)
          ctx.rotate(Math.sin(t * 1.6 + n.phase + offset) * 0.25)
          ctx.scale(size / 100, size / 100)
          ctx.translate(-50, -50)
          ctx.fillStyle = n.color
          ctx.fill(n.shape)
        }
      }
      ctx.globalAlpha = 1
    }

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
    }
  }, [videoRef, canvasRef, notes])

  return <canvas ref={canvasRef} className="effect-overlay" />
}
