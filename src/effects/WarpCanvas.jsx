import { useEffect, useRef } from 'react'
import { createWarpRenderer } from './warp.js'

const MAX_DPR = 2

// Live distorted camera picture for the cell. It reads the (hidden) <video> in `videoRef` every
// frame and draws it through the warp shader. The canvas already contains the mirrored picture.
// If WebGL is unavailable or lost, `onFail` is called so the plain video can be shown instead.
export default function WarpCanvas({ videoRef, warp, filter, onFail }) {
  const canvasRef = useRef(null)
  // The draw loop reads the latest warp / callback from refs, so changing filters never restarts GL.
  const warpRef = useRef(warp)
  const failRef = useRef(onFail)
  useEffect(() => {
    warpRef.current = warp
    failRef.current = onFail
  })

  useEffect(() => {
    const canvas = canvasRef.current
    const renderer = createWarpRenderer(canvas)
    if (!renderer) {
      failRef.current()
      return
    }
    let raf = 0
    const onLost = (e) => {
      e.preventDefault()
      failRef.current()
    }
    canvas.addEventListener('webglcontextlost', onLost)

    const tick = () => {
      raf = requestAnimationFrame(tick)
      const video = videoRef.current
      if (!video) return
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
      const w = Math.round(canvas.clientWidth * dpr)
      const h = Math.round(canvas.clientHeight * dpr)
      if (!w || !h) return
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
      renderer.draw(video, warpRef.current)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      canvas.removeEventListener('webglcontextlost', onLost)
      renderer.dispose()
      // Release the GPU context only if the canvas really left the page (a StrictMode re-mount
      // keeps it connected and re-uses the same context).
      queueMicrotask(() => {
        if (!canvas.isConnected) renderer.lose()
      })
    }
  }, [videoRef])

  return <canvas ref={canvasRef} className="warp-canvas" style={{ filter }} />
}
