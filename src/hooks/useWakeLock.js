import { useEffect } from 'react'

// Keeps the screen on while the page is visible so the booth doesn't dim mid-photo.
export function useWakeLock() {
  useEffect(() => {
    if (!('wakeLock' in navigator)) return
    let lock = null
    let released = false

    const acquire = async () => {
      try {
        lock = await navigator.wakeLock.request('screen')
        if (released) lock.release()
      } catch {
        // Ignored: denied (e.g. low battery) or unsupported.
      }
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') acquire()
    }

    acquire()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      released = true
      document.removeEventListener('visibilitychange', onVisible)
      lock?.release()
    }
  }, [])
}
