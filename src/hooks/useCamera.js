import { useEffect, useState } from 'react'

// Test mode: open the app with ?cam=grey to use a grey placeholder instead of the real camera.
// A running counter is drawn on it so individual photos can be told apart.
const useGreyCam = new URLSearchParams(window.location.search).get('cam') === 'grey'

function createGreyStream() {
  const canvas = document.createElement('canvas')
  canvas.width = 720
  canvas.height = 720
  const ctx = canvas.getContext('2d')
  let n = 0

  const draw = () => {
    ctx.fillStyle = '#8a8a8a'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#5a5a5a'
    ctx.font = 'bold 160px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(n++ % 1000), canvas.width / 2, canvas.height / 2)
  }
  draw()
  const timer = setInterval(draw, 100)
  const stream = canvas.captureStream(10)
  return {
    stream,
    stop: () => {
      clearInterval(timer)
      stream.getTracks().forEach((t) => t.stop())
    },
  }
}

// Opens the front camera once and exposes the stream plus a status.
// status: 'loading' | 'ready' | 'denied' | 'unsupported' | 'error'
export function useCamera() {
  const supported = useGreyCam || Boolean(navigator.mediaDevices?.getUserMedia)
  const [stream, setStream] = useState(null)
  const [status, setStatus] = useState(supported ? 'loading' : 'unsupported')

  useEffect(() => {
    if (!supported) return
    let cancelled = false
    let stop = null

    const ready = (s, stopFn) => {
      if (cancelled) {
        stopFn()
        return
      }
      stop = stopFn
      setStream(s)
      setStatus('ready')
    }

    if (useGreyCam) {
      const grey = createGreyStream()
      Promise.resolve().then(() => ready(grey.stream, grey.stop))
    } else {
      navigator.mediaDevices
        .getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 1280 } },
          audio: false,
        })
        .then((s) => ready(s, () => s.getTracks().forEach((t) => t.stop())))
        .catch((err) => {
          if (cancelled) return
          setStatus(err?.name === 'NotAllowedError' ? 'denied' : 'error')
        })
    }

    return () => {
      cancelled = true
      stop?.()
    }
  }, [supported])

  return { stream, status }
}
