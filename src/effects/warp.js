// Space-distortion filters (like Mac Photo Booth's Bulge / Dent / Twirl / Stretch), done in a
// WebGL fragment shader that reads the camera <video> as a texture. The very same shader draws the
// live preview and the captured photo, so the photo looks exactly like the preview.
//
// Every warp acts inside a circle in the middle of the cell (as wide as the cell allows) and leaves
// everything outside it untouched, so the effect blends into the rest of the picture.

export const WARP_IDS = { bulge: 0, pinch: 1, twirl: 2, stretch: 3 }

const VERT = `
attribute vec2 a;
varying vec2 v;
void main() {
  v = vec2(a.x * 0.5 + 0.5, 0.5 - a.y * 0.5); // (0,0) = top-left of the cell
  gl_Position = vec4(a, 0.0, 1.0);
}`

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 v;
uniform sampler2D tex;
uniform float aspect; // cell width / height
uniform vec2 vis;     // part of the video that is visible (object-fit: cover)
uniform float warp;

void main() {
  // Centre-based coordinates where the cell is 'aspect' wide and 1 tall, so circles stay round.
  vec2 s = (v - 0.5) * vec2(aspect, 1.0);
  float R = 0.5 * min(aspect, 1.0);
  float r = length(s) / R;

  if (r < 1.0) {
    if (warp < 0.5) {            // bulge: the middle swells (about 2.9x at the centre)
      s *= 1.0 - 0.65 * (1.0 - r * r);
    } else if (warp < 1.5) {     // pinch: the middle shrinks (about 0.45x at the centre)
      float k = 1.0 - r;
      s *= 1.0 + 1.2 * k * k;
    } else if (warp < 2.5) {     // twirl: the middle is turned, fading out towards the rim
      float k = 1.0 - r;
      float a = 3.4 * k * k;
      float c = cos(a);
      float n = sin(a);
      s = mat2(c, -n, n, c) * s;
    } else {                     // stretch: the middle is pulled out sideways (about 2.2x)
      s.x *= 0.45 + 0.55 * r * r;
    }
  }

  vec2 p = s / vec2(aspect, 1.0) + 0.5;      // back to 0..1 cell coordinates
  vec2 t = (p - 0.5) * vis + 0.5;            // cover-crop into the video
  t.x = 1.0 - t.x;                           // mirror, like a selfie preview
  gl_FragColor = texture2D(tex, clamp(t, 0.0, 1.0));
}`

function compile(gl, type, source) {
  const shader = gl.createShader(type)
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn('Warp shader failed to compile:', gl.getShaderInfoLog(shader))
    return null
  }
  return shader
}

// Returns { draw(video, warp), dispose() }, or null when WebGL isn't available.
// `warp` is a key of WARP_IDS. draw() sizes nothing: set canvas.width/height before calling it.
export function createWarpRenderer(canvas) {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false })
  if (!gl) return null

  const vs = compile(gl, gl.VERTEX_SHADER, VERT)
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG)
  if (!vs || !fs) return null
  const program = gl.createProgram()
  gl.attachShader(program, vs)
  gl.attachShader(program, fs)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null
  gl.useProgram(program)

  // One big triangle that covers the whole canvas.
  const buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  const loc = gl.getAttribLocation(program, 'a')
  gl.enableVertexAttribArray(loc)
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

  const texture = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

  const u = {
    aspect: gl.getUniformLocation(program, 'aspect'),
    vis: gl.getUniformLocation(program, 'vis'),
    warp: gl.getUniformLocation(program, 'warp'),
  }

  return {
    draw(video, warp) {
      if (video.readyState < 2 || !video.videoWidth) return false
      const { width, height } = canvas
      const cellAspect = width / height
      const videoAspect = video.videoWidth / video.videoHeight
      gl.viewport(0, 0, width, height)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, video)
      gl.uniform1f(u.aspect, cellAspect)
      gl.uniform2f(
        u.vis,
        videoAspect > cellAspect ? cellAspect / videoAspect : 1,
        videoAspect > cellAspect ? 1 : videoAspect / cellAspect,
      )
      gl.uniform1f(u.warp, WARP_IDS[warp] ?? 0)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      return true
    },
    // Frees the GL objects but keeps the context alive, so a canvas can be re-used right away
    // (React StrictMode mounts, unmounts and re-mounts a component on the same canvas element).
    dispose() {
      gl.deleteTexture(texture)
      gl.deleteBuffer(buffer)
      gl.deleteProgram(program)
    },
    // Also gives the GPU context back. Only for canvases that are being thrown away.
    lose() {
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    },
  }
}

// One captured photo: same crop as the preview (object-fit: cover of the cell), warped, then run
// through the filter's CSS colour filter if it has one. Returns a JPEG data URL, or null if WebGL
// (or the video) isn't ready, in which case the caller falls back to the plain capture.
export function captureWarped(video, warp, cssFilter) {
  const cw = video.clientWidth
  const ch = video.clientHeight
  const vw = video.videoWidth
  const vh = video.videoHeight
  if (!cw || !ch || !vw || !vh) return null

  const sw = Math.min(vw, (vh * cw) / ch)
  const sh = (sw * ch) / cw
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(sw)
  canvas.height = Math.round(sh)

  const renderer = createWarpRenderer(canvas)
  if (!renderer) return null
  let url = null
  if (renderer.draw(video, warp)) {
    let out = canvas
    if (cssFilter && cssFilter !== 'none') {
      out = document.createElement('canvas')
      out.width = canvas.width
      out.height = canvas.height
      const ctx = out.getContext('2d')
      if ('filter' in ctx) ctx.filter = cssFilter
      ctx.drawImage(canvas, 0, 0) // must happen before the GL canvas is handed back to the compositor
    }
    url = out.toDataURL('image/jpeg', 0.92)
  }
  renderer.dispose()
  renderer.lose() // this canvas is never used again
  return url
}
