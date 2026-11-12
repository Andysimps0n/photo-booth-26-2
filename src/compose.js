// Turns the strip on screen into one downloadable image: background, photos, frame art and text,
// all measured from the live DOM so the saved picture matches what the user sees.

const OUTPUT_WIDTH = 1080 // plain frames: art frames use their own artSize instead
const TEXT_SELECTOR = '.strip-logo span, .strip-art-text span, .edge .arrow, .edge .num, .vtext, .strip-footer'

const artCache = new Map()
function loadImage(src) {
  if (!artCache.has(src)) {
    artCache.set(
      src,
      new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = () => {
          artCache.delete(src)
          reject(new Error(`Couldn't load ${src}`))
        }
        img.src = src
      }),
    )
  }
  return artCache.get(src)
}

// Split on commas that aren't inside parentheses (so rgba(...) stays whole).
function splitTopLevel(s) {
  const parts = []
  let depth = 0
  let start = 0
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '(') depth++
    else if (s[i] === ')') depth--
    else if (s[i] === ',' && depth === 0) {
      parts.push(s.slice(start, i).trim())
      start = i + 1
    }
  }
  parts.push(s.slice(start).trim())
  return parts
}

// Frame backgrounds are a solid colour or a top-to-bottom linear-gradient; `height` is the
// strip's full height on the canvas (the gradient spans it, even when the output is cropped).
function backgroundFill(ctx, bg, height) {
  const m = /^linear-gradient\((.*)\)$/s.exec(bg.trim())
  if (!m) return bg
  const args = splitTopLevel(m[1])
  if (/^(180deg|to bottom)$/.test(args[0])) args.shift()
  else if (/deg$|^to /.test(args[0])) args.shift() // other directions: approximated top-to-bottom
  const grad = ctx.createLinearGradient(0, 0, 0, height)
  args.forEach((stop, i) => {
    const pm = /\s([\d.]+)%$/.exec(stop)
    const color = pm ? stop.slice(0, pm.index).trim() : stop
    const pos = pm ? Number(pm[1]) / 100 : i / Math.max(1, args.length - 1)
    grad.addColorStop(Math.min(1, Math.max(0, pos)), color)
  })
  return grad
}

// Rotation of an element from its computed transform, in radians.
function rotationOf(style) {
  const t = style.transform
  if (!t || t === 'none') return 0
  const m = /matrix\(([^)]+)\)/.exec(t)
  if (!m) return 0
  const [a, b] = m[1].split(',').map(Number)
  return Math.atan2(b, a)
}

export async function composeStrip(stripEl, frame) {
  const stripRect = stripEl.getBoundingClientRect()
  if (!stripRect.width || !stripRect.height) throw new Error('Strip is not visible')

  const width = frame.art ? frame.artSize.width : OUTPUT_WIDTH
  const fullHeight = frame.art
    ? frame.artSize.height
    : Math.round((OUTPUT_WIDTH * stripRect.height) / stripRect.width)
  const sx = width / stripRect.width
  const sy = fullHeight / stripRect.height

  // Plain frames reserve an empty shutter zone at the bottom: crop it off below the footer.
  let height = fullHeight
  const footer = stripEl.querySelector('.strip-footer')
  if (!frame.art && footer) {
    height = Math.round((footer.getBoundingClientRect().bottom - stripRect.top) * sy)
  }

  const rectOf = (el) => {
    const r = el.getBoundingClientRect()
    return {
      x: (r.left - stripRect.left) * sx,
      y: (r.top - stripRect.top) * sy,
      w: r.width * sx,
      h: r.height * sy,
    }
  }

  const fontsReady = Promise.all([
    document.fonts?.load(`${Math.round(40 * sx)}px "Poor Story"`).catch(() => {}),
    document.fonts?.ready,
  ])
  const art = frame.art ? loadImage(frame.art) : null
  await fontsReady

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  // 1. Background
  ctx.fillStyle = backgroundFill(ctx, frame.bg, fullHeight)
  ctx.fillRect(0, 0, width, height)

  // 2. Photos, cropped like object-fit: cover
  for (const cell of stripEl.querySelectorAll('.cell')) {
    const img = cell.querySelector('img')
    if (!img) continue
    await img.decode?.().catch(() => {})
    if (!img.naturalWidth) continue
    const r = rectOf(cell)
    const scale = Math.max(r.w / img.naturalWidth, r.h / img.naturalHeight)
    const sw = r.w / scale
    const sh = r.h / scale
    ctx.drawImage(
      img,
      (img.naturalWidth - sw) / 2,
      (img.naturalHeight - sh) / 2,
      sw,
      sh,
      r.x,
      r.y,
      r.w,
      r.h,
    )
  }

  // 3. Frame art over the photos (its photo window is transparent)
  if (art) ctx.drawImage(await art, 0, 0, width, fullHeight)

  // 4. Text
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (const el of stripEl.querySelectorAll(TEXT_SELECTOR)) {
    const text = el.textContent.trim()
    if (!text) continue
    const style = getComputedStyle(el)
    const r = rectOf(el)
    const fontSize = parseFloat(style.fontSize) * sx
    const spacing = style.letterSpacing === 'normal' ? 0 : parseFloat(style.letterSpacing) * sx || 0
    let angle = rotationOf(style)
    if (style.writingMode.startsWith('vertical')) angle += Math.PI / 2

    ctx.save()
    ctx.globalAlpha = Number(style.opacity) || 1
    ctx.fillStyle = style.color
    ctx.font = `${style.fontStyle} ${style.fontWeight} ${fontSize}px ${style.fontFamily}`
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${spacing}px`
    ctx.translate(r.x + r.w / 2, r.y + r.h / 2)
    ctx.rotate(angle)
    // letter-spacing also trails the last glyph; shift back by half so the text stays centred
    ctx.fillText(text, 'letterSpacing' in ctx ? spacing / 2 : 0, 0)
    ctx.restore()
  }

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Export failed'))), 'image/jpeg', 0.92),
  )
}

export function stripFilename(date = new Date()) {
  const p = (n) => String(n).padStart(2, '0')
  const d = `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}`
  const t = `${p(date.getHours())}${p(date.getMinutes())}${p(date.getSeconds())}`
  return `photobooth-${d}-${t}.jpg`
}

// Phones: share sheet (so "Save Image" goes to Photos). Elsewhere: a normal file download.
export async function saveImage(blob, filename) {
  const file = new File([blob], filename, { type: blob.type })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
      return
    } catch (err) {
      if (err.name === 'AbortError') return // user closed the sheet
      // e.g. NotAllowedError: fall through to a plain download
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
