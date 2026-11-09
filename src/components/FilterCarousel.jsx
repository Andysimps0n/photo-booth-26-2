import { useRef, useState } from 'react'

const SPACING = 84 // px between button centres
const DRAG_START_PX = 6
const clamp = (n, min, max) => Math.min(max, Math.max(min, n))

// A row of shutter-style buttons, one per filter. The centred one is the real shutter; swiping
// slides the row so another filter lands in the centre. Tapping a side button centres it.
export default function FilterCarousel({ filters, index, onIndex, onShutter, disabled, shutterLabel }) {
  const [dragPos, setDragPos] = useState(null) // fractional position while the finger is down
  const gesture = useRef(null) // { x, start, moved, pos }
  const last = filters.length - 1
  const pos = dragPos ?? index

  const onPointerDown = (e) => {
    e.stopPropagation() // keep the stage's frame-swipe out of this gesture
    gesture.current = { x: e.clientX, start: index, moved: false, pos: index }
  }

  const onPointerMove = (e) => {
    const g = gesture.current
    if (!g) return
    const dx = e.clientX - g.x
    if (!g.moved) {
      if (Math.abs(dx) < DRAG_START_PX) return
      g.moved = true
      e.currentTarget.setPointerCapture(e.pointerId)
    }
    g.pos = clamp(g.start - dx / SPACING, 0, last)
    setDragPos(g.pos)
  }

  const endDrag = (e) => {
    const g = gesture.current
    gesture.current = null
    if (!g?.moved) return
    let next = Math.round(g.pos)
    // A short flick still moves one step in the swipe direction.
    const dx = e.clientX - g.x
    if (next === g.start && Math.abs(dx) > 24) next = clamp(g.start + (dx < 0 ? 1 : -1), 0, last)
    onIndex(next)
    setDragPos(null)
  }

  return (
    <div
      className="filter-carousel"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      {filters.map((f, i) => {
        const d = Math.min(1, Math.abs(i - pos))
        const far = Math.abs(i - pos) > 2.6
        const current = i === index
        return (
          <button
            key={f.id}
            type="button"
            className="filter-item"
            data-current={current}
            aria-label={current ? shutterLabel : `${f.name} filter`}
            disabled={current && disabled}
            tabIndex={far ? -1 : 0}
            style={{
              transform: `translate(-50%, -50%) translateX(${(i - pos) * SPACING}px) scale(${1 - 0.3 * d})`,
              opacity: far ? 0 : 1 - 0.35 * d,
              pointerEvents: far ? 'none' : undefined,
              borderColor: `color-mix(in srgb, currentColor ${Math.round(75 * d)}%, transparent)`,
              transition: dragPos === null ? 'transform 0.2s ease, opacity 0.2s ease' : 'none',
            }}
            onClick={() => (current ? onShutter() : onIndex(i))}
          >
            <span className="filter-disc" style={{ background: f.swatch, filter: f.css }}>
              {f.icon}
            </span>
          </button>
        )
      })}
      <span className="filter-name" aria-hidden="true">
        {filters[index].name}
      </span>
    </div>
  )
}
