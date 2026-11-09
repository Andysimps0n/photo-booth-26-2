// Lazy-loads MediaPipe's face detector (BlazeFace short range, ~230 KB model) the first time a
// face effect is used, so the rest of the app never pays for it.
// The wasm runtime comes from the CDN; keep its version in sync with @mediapipe/tasks-vision in package.json.
const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.2/wasm'
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite'

let loading = null

async function create() {
  const { FilesetResolver, FaceDetector } = await import('@mediapipe/tasks-vision')
  const fileset = await FilesetResolver.forVisionTasks(WASM_URL)
  const options = (delegate) => ({
    baseOptions: { modelAssetPath: MODEL_URL, delegate },
    runningMode: 'VIDEO',
    minDetectionConfidence: 0.5,
  })
  try {
    return await FaceDetector.createFromOptions(fileset, options('GPU'))
  } catch {
    return FaceDetector.createFromOptions(fileset, options('CPU')) // no WebGL: slower but works
  }
}

export function loadFaceDetector() {
  if (!loading) {
    loading = create()
    loading.catch(() => {
      loading = null // allow a retry (e.g. after coming back online)
    })
  }
  return loading
}
