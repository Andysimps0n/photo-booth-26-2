import { useEffect } from 'react'
import { loadFaceDetector } from './faceDetector.js'

const SMOOTH = 0.35 // how fast the notes catch up with the head (0..1 per frame)
const LOST_FADE_MS = 400 // fade-out time after the face is lost

// Overlay canvas for the live cell: tracks the face in `videoRef` and draws music notes above the
// head. The canvas holds the final (already mirrored) picture, so capture can copy it as-is.
// `notes` comes from randomNotes() in notes.js (a new mix for every cell).
export default function HeadNotes({ videoRef, canvasRef, notes }) {
  useEffect(() => {
    let cancelled = false
    let raf = 0
    let detector = null
    const head = { x: 0, y: 0, w: 0, seenAt: -Infinity, ready: false }

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
      let face = null
      try {
        face = detector.detectForVideo(video, ts).detections[0]?.boundingBox ?? null
      } catch {
        // a frame the detector couldn't read; just skip it
      }

      if (face) {
        // Video pixels -> cell pixels (object-fit: cover), then mirror like the preview.
        const vw = video.videoWidth
        const vh = video.videoHeight
        const s = Math.max(cw / vw, ch / vh)
        const ox = (cw - vw * s) / 2
        const oy = (ch - vh * s) / 2
        const x = cw - (ox + (face.originX + face.width / 2) * s)
        const y = oy + face.originY * s
        const w = face.width * s
        if (!head.ready) Object.assign(head, { x, y, w, ready: true })
        head.x += (x - head.x) * SMOOTH
        head.y += (y - head.y) * SMOOTH
        head.w += (w - head.w) * SMOOTH
        head.seenAt = now
      }

      const ctx = canvas.getContext('2d')
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const alpha = head.ready ? 1 - Math.min(1, (now - head.seenAt) / LOST_FADE_MS) : 0
      if (alpha <= 0) return

      const t = now / 1000
      ctx.globalAlpha = alpha
      ctx.shadowColor = 'rgba(0, 0, 0, 0.35)'
      ctx.shadowBlur = 6 * dpr
      for (const n of notes) {
        const size = n.size * head.w * dpr
        const bob = Math.sin(t * 2.2 + n.phase) * 0.08 * head.w
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.translate((head.x + n.x * head.w) * dpr, (head.y + n.y * head.w + bob) * dpr)
        ctx.rotate(Math.sin(t * 1.6 + n.phase) * 0.25)
        ctx.scale(size / 100, size / 100)
        ctx.translate(-50, -50)
        ctx.fillStyle = n.color
        ctx.fill(n.shape)
      }
    }

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
    }
  }, [videoRef, canvasRef, notes])

  return <canvas ref={canvasRef} className="effect-overlay" />
}
