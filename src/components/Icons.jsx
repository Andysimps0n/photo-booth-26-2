import { useId } from 'react'

// Stroke icons (Feather-style, 24x24) that inherit their color from `currentColor`.
const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.4,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

export function TrashIcon({ size = 24 }) {
  return (
    <svg {...base} width={size} height={size}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  )
}

export function ResetIcon({ size = 24 }) {
  return (
    <svg {...base} width={size} height={size}>
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  )
}

// Solid "people" glyphs. Each person standing behind another is masked with a thin gap
// around the front person, like the reference pictures.
function People({ size, children, gapShapes, id }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
        <rect width="24" height="24" fill="#fff" />
        <g fill="#000" stroke="#000" strokeWidth="2.4" strokeLinejoin="round">
          {gapShapes}
        </g>
      </mask>
      {children(id)}
    </svg>
  )
}

export function TwoPeopleIcon({ size = 20 }) {
  const id = useId()
  const frontBody = 'M7.5 21.5C7.5 16.8 10.4 14 14.6 14s7.1 2.8 7.1 7.5z'
  return (
    <People
      size={size}
      id={id}
      gapShapes={
        <>
          <circle cx="14.6" cy="8.4" r="3.6" />
          <path d={frontBody} />
        </>
      }
    >
      {(maskId) => (
        <>
          <g mask={`url(#${maskId})`}>
            <circle cx="8.4" cy="7.2" r="3.2" />
            <path d="M1.8 19.5C1.8 15.3 4.6 12.8 8.4 12.8s6.6 2.5 6.6 6.7z" />
          </g>
          <circle cx="14.6" cy="8.4" r="3.6" />
          <path d={frontBody} />
        </>
      )}
    </People>
  )
}

export function ThreePeopleIcon({ size = 20 }) {
  const id = useId()
  const centerBody = 'M5.6 21.5C5.6 16.9 8.4 14.2 12 14.2s6.4 2.7 6.4 7.3z'
  return (
    <People
      size={size}
      id={id}
      gapShapes={
        <>
          <circle cx="12" cy="8.8" r="3.5" />
          <path d={centerBody} />
        </>
      }
    >
      {(maskId) => (
        <>
          <g mask={`url(#${maskId})`}>
            <circle cx="4.9" cy="9.4" r="2.7" />
            <path d="M0.6 19.6C0.6 16.2 2.5 14.2 4.9 14.2s4.3 2 4.3 5.4z" />
            <circle cx="19.1" cy="9.4" r="2.7" />
            <path d="M14.8 19.6c0-3.4 1.9-5.4 4.3-5.4s4.3 2 4.3 5.4z" />
          </g>
          <circle cx="12" cy="8.8" r="3.5" />
          <path d={centerBody} />
        </>
      )}
    </People>
  )
}

export function DownloadIcon({ size = 24 }) {
  return (
    <svg {...base} width={size} height={size}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}
