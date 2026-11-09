// Music-note shapes for the Notes effect, each drawn in a 100 x 100 box.
function shape(build) {
  const p = new Path2D()
  build(p)
  return p
}

const QUARTER = shape((p) => {
  p.ellipse(36, 80, 20, 14, -0.35, 0, Math.PI * 2)
  p.rect(49, 8, 8, 72)
})

const EIGHTH = shape((p) => {
  p.ellipse(34, 80, 20, 14, -0.35, 0, Math.PI * 2)
  p.rect(47, 8, 8, 72)
  p.moveTo(55, 8)
  p.bezierCurveTo(72, 18, 88, 30, 80, 58)
  p.bezierCurveTo(76, 42, 66, 36, 55, 33)
  p.closePath()
})

const SIXTEENTH = shape((p) => {
  p.ellipse(34, 82, 20, 14, -0.35, 0, Math.PI * 2)
  p.rect(47, 6, 8, 76)
  for (const dy of [0, 22]) {
    p.moveTo(55, 6 + dy)
    p.bezierCurveTo(70, 14 + dy, 84, 22 + dy, 80, 44 + dy)
    p.bezierCurveTo(75, 32 + dy, 66, 28 + dy, 55, 26 + dy)
    p.closePath()
  }
})

const BEAMED = shape((p) => {
  p.ellipse(22, 82, 16, 11, -0.35, 0, Math.PI * 2)
  p.ellipse(74, 72, 16, 11, -0.35, 0, Math.PI * 2)
  p.rect(32, 20, 7, 62)
  p.rect(84, 10, 7, 62)
  p.moveTo(32, 20)
  p.lineTo(91, 8)
  p.lineTo(91, 24)
  p.lineTo(32, 36)
  p.closePath()
})

const SHAPES = [QUARTER, EIGHTH, SIXTEENTH, BEAMED]

// Colours taken from the Navy frame artwork.
const COLORS = ['#F0C23E', '#5A55C4', '#F5EFDD', '#E5484D', '#4A5BC8', '#E6AD6A']

// Where each of the three notes floats, relative to the head (x, y in face widths from the
// top-centre of the face). Positions stay fixed; shape and colour are random.
const SLOTS = [
  { x: -0.75, y: -0.25, size: 0.42, phase: 0 },
  { x: 0.05, y: -0.7, size: 0.5, phase: 2.1 },
  { x: 0.8, y: -0.35, size: 0.38, phase: 4.2 },
]

const pick = (list) => list[Math.floor(Math.random() * list.length)]

// A fresh set of three notes: random shapes, three different random colours.
export function randomNotes() {
  const colors = [...COLORS].sort(() => Math.random() - 0.5)
  return SLOTS.map((slot, i) => ({ ...slot, shape: pick(SHAPES), color: colors[i] }))
}
