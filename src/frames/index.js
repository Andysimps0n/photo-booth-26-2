// `mode` (optional) limits a frame to 'strip' or 'mono'; omit it to offer the frame in both.
// Each frame is plain data; add a theme by adding one object here.
// `bg` is any CSS background, `ink` the text/arrow color, `cellBg` shows while the camera loads.
export const frames = [
  {
    // Artwork frame, strip only. `texts` are live text drawn over the art in the Poor Story font
    // (x, y = anchor point in art pixels, size in art pixels; `rotate` turns it clockwise).
    // text: '{date}' is replaced with today's date (YYYY.MM.DD).
    id: 'strip-navy',
    name: 'Navy strip',
    mode: 'strip',
    art: '/frames/strip-navy.svg',
    artSize: { width: 1080, height: 2340, top: 187, bottom: 94 },
    texts: [
      { text: '즉흥적 새벽 두 시', x: 97, y: 93, size: 78, color: '#F9D617', align: 'left' },
      { text: '26-2 정기공연', x: 1028, y: 489, size: 58, color: '#B3B3B3', rotate: 90 },
      { text: "How'd You Feel?", x: 1030, y: 1216, size: 58, color: '#B3B3B3', rotate: 90 },
      { text: 'I Feel:', x: 1030, y: 1797, size: 58, color: '#B3B3B3', rotate: 90 },
      { text: 'Impromptu 2Am', x: 145, y: 2296, size: 58, color: '#B3B3B3', align: 'left' },
      { text: '{date}', x: 929, y: 2296, size: 58, color: '#B3B3B3', align: 'right' },
    ],
    bg: '#1e205c',
    ink: '#fff',
    divider: '#1e205c',
    logo: '',
    sideText: [],
    numbers: [],
    footer: '',
  },
  {
    // Artwork frame, mono only: `art` is drawn over the strip and has the photo window cut out.
    id: 'mono-navy',
    name: 'Navy',
    mode: 'mono',
    art: '/frames/mono-navy.svg',
    // Art canvas in its own pixels: header / bottom border heights decide where the photo window is.
    // The art covers the whole screen; the camera window ends where the bottom bar starts; the shutter floats over the camera.
    artSize: { width: 1080, height: 2340, top: 187, bottom: 94 },
    bg: '#1e205c',
    ink: '#fff',
    divider: '#1e205c',
    logo: '',
    sideText: [],
    numbers: [],
    footer: '',
  },
  {
    id: 'black',
    name: 'Black',
    bg: '#000',
    ink: '#fff',
    divider: '#000',
    logo: 'photobooth',
    sideText: ['KEEP YOURSELF ALIVE', 'PHOTOBOOTH 50', 'KEEP YOURSELF ALIVE'],
    numbers: ['5', '4', '49'],
    footer: '',
  },
  {
    id: 'white',
    name: 'White',
    bg: '#fff',
    ink: '#111',
    divider: '#e4e4e4',
    logo: 'photobooth',
    sideText: ['KEEP YOURSELF ALIVE', 'PHOTOBOOTH 50', 'KEEP YOURSELF ALIVE'],
    numbers: ['5', '4', '49'],
    footer: '',
  },
  {
    id: 'concert',
    name: 'Concert',
    bg: 'linear-gradient(180deg, #5b3fa0 0%, #8a63b8 55%, #e68ab8 100%)',
    ink: '#fff',
    divider: 'rgba(255,255,255,0.35)',
    logo: 'LIVE 2026',
    sideText: [],
    numbers: [],
    footer: 'keep yourself alive at photobooth',
  },
]
