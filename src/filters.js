// Camera filters. `css` is a CSS filter() string: it is applied to the live preview and to the
// canvas when a photo is captured, so what you see is what you get. Add a filter by adding one object.
// `effect` (optional) adds a live overlay drawn over the camera, e.g. 'notes' = music notes that
// follow your head (MediaPipe face detection, loaded only when picked). `icon` shows on its button.
// `swatch` is the little preview colour shown on the carousel button (also run through the filter).
const SWATCH = 'linear-gradient(135deg, #ff7e5f 0%, #feb47b 40%, #6dd5ed 100%)'

// Order = position in the carousel, left to right. The app starts on Normal (the shutter in the
// middle): space-distortion filters sit to its left (swipe right to reach them, nearest first),
// the Notes filter and the colour filters to its right.
export const filters = [
  // Space distortion (like Mac Photo Booth). `warp` picks the shader effect in src/effects/warp.js;
  // the swatches just hint at the shape. Listed furthest-left first, so Bulge is next to Normal.
  { id: 'stretch', name: 'Stretch', css: 'none', warp: 'stretch', swatch: 'repeating-linear-gradient(90deg, #ff7e5f 0 5px, #feb47b 5px 15px, #6dd5ed 15px 36px)' },
  { id: 'twirl', name: 'Twirl', css: 'none', warp: 'twirl', swatch: 'conic-gradient(#ff7e5f, #feb47b, #6dd5ed, #ff7e5f)' },
  { id: 'pinch', name: 'Pinch', css: 'none', warp: 'pinch', swatch: 'radial-gradient(circle, #fff 0 12%, #feb47b 13% 40%, #6dd5ed 41%)' },
  { id: 'bulge', name: 'Bulge', css: 'none', warp: 'bulge', swatch: 'radial-gradient(circle, #fff 0 30%, #feb47b 31% 60%, #6dd5ed 61%)' },
  { id: 'none', name: 'Normal', css: 'none', swatch: '#fff' },
  { id: 'notes', name: 'Notes', css: 'none', effect: 'notes', swatch: '#1e205c', icon: '♪' },
  { id: 'bw', name: 'B&W', css: 'grayscale(1) contrast(1.15)', swatch: SWATCH },
  { id: 'noir', name: 'Noir', css: 'grayscale(1) contrast(1.6) brightness(0.9)', swatch: SWATCH },
  { id: 'sepia', name: 'Sepia', css: 'sepia(0.8) contrast(1.05)', swatch: SWATCH },
  { id: 'warm', name: 'Warm', css: 'sepia(0.3) saturate(1.4) hue-rotate(-10deg) brightness(1.05)', swatch: SWATCH },
  { id: 'cool', name: 'Cool', css: 'saturate(1.2) hue-rotate(20deg) brightness(1.05) contrast(1.05)', swatch: SWATCH },
  { id: 'vivid', name: 'Vivid', css: 'saturate(1.7) contrast(1.1)', swatch: SWATCH },
  { id: 'fade', name: 'Fade', css: 'contrast(0.85) brightness(1.1) saturate(0.8)', swatch: SWATCH },
]

// Where the carousel starts: the plain, unfiltered camera.
export const defaultFilterIndex = filters.findIndex((f) => f.id === 'none')
