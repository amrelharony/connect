// emotion-worker.js — Off-thread face emotion classifier
// Uses MediaPipe FaceLandmarker blendshapes to detect emotional state.
// Receives ImageBitmap frames, returns { emotion, confidence } objects.

const CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18';
const FACE_MODEL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

let lander = null;
let ready = false;

async function init() {
  try {
    const V = await import(CDN + '/vision_bundle.mjs');
    const fs = await V.FilesetResolver.forVisionTasks(CDN + '/wasm');
    lander = await V.FaceLandmarker.createFromOptions(fs, {
      baseOptions: { modelAssetPath: FACE_MODEL, delegate: 'CPU' },
      runningMode: 'VIDEO',
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: false,
      numFaces: 1
    });
    ready = true;
    self.postMessage({ type: 'ready' });
  } catch (e) {
    self.postMessage({ type: 'error', msg: e.message || String(e) });
  }
}

function classify(shapes) {
  const get = (name) => {
    const s = shapes.find(b => b.categoryName === name);
    return s ? s.score : 0;
  };

  const smileL = get('mouthSmileLeft');
  const smileR = get('mouthSmileRight');
  const cheekL = get('cheekSquintLeft');
  const cheekR = get('cheekSquintRight');
  const browDownL = get('browDownLeft');
  const browDownR = get('browDownRight');
  const browUpL = get('browOuterUpLeft');
  const browUpR = get('browOuterUpRight');
  const eyeWideL = get('eyeWideLeft');
  const eyeWideR = get('eyeWideRight');
  const jawOpen = get('jawOpen');

  const happy = (smileL + smileR) * 0.35 + (cheekL + cheekR) * 0.15;
  const focused = (browDownL + browDownR) * 0.5;
  const surprised = (browUpL + browUpR) * 0.25 + (eyeWideL + eyeWideR) * 0.15 + jawOpen * 0.2;

  let totalVariance = 0;
  for (const s of shapes) totalVariance += s.score * s.score;
  const calm = Math.max(0, 1 - Math.sqrt(totalVariance / Math.max(1, shapes.length)) * 4);

  const scores = { happy, focused, surprised, calm };
  let best = 'neutral', bestVal = 0.18;
  for (const [k, v] of Object.entries(scores)) {
    if (v > bestVal) { bestVal = v; best = k; }
  }
  return { emotion: best, confidence: Math.min(1, bestVal) };
}

self.onmessage = function(e) {
  if (e.data.type === 'init') { init(); return; }

  if (e.data.type === 'detect' && ready && lander) {
    try {
      const result = lander.detectForVideo(e.data.bitmap, Math.round(e.data.ts));
      e.data.bitmap.close();
      if (result.faceBlendshapes && result.faceBlendshapes.length > 0) {
        const shapes = result.faceBlendshapes[0].categories;
        const cls = classify(shapes);
        self.postMessage({ type: 'emotion', ...cls });
      } else {
        self.postMessage({ type: 'emotion', emotion: 'neutral', confidence: 0 });
      }
    } catch (_) {
      if (e.data.bitmap && e.data.bitmap.close) e.data.bitmap.close();
      self.postMessage({ type: 'emotion', emotion: 'neutral', confidence: 0 });
    }
  }
};
