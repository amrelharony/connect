// spatial-worker.js — MediaPipe Vision Web Worker
// Runs FaceLandmarker + HandLandmarker on ImageBitmap frames via CPU delegate
// Loaded as classic worker with dynamic import()

const CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18';
const MODELS = 'https://storage.googleapis.com/mediapipe-models';

let face = null, hand = null;

self.onmessage = async (e) => {
  if (e.data.type === 'init') {
    try {
      const V = await import(CDN + '/vision_bundle.mjs');
      const fs = await V.FilesetResolver.forVisionTasks(CDN + '/wasm');

      [face, hand] = await Promise.all([
        V.FaceLandmarker.createFromOptions(fs, {
          baseOptions: {
            modelAssetPath: MODELS + '/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'CPU'
          },
          runningMode: 'VIDEO',
          numFaces: 1,
          minFaceDetectionConfidence: 0.7,
          minFacePresenceConfidence: 0.7,
          minTrackingConfidence: 0.6,
          outputFaceBlendshapes: false,
          outputFacialTransformationMatrixes: false
        }),
        V.HandLandmarker.createFromOptions(fs, {
          baseOptions: {
            modelAssetPath: MODELS + '/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'CPU'
          },
          runningMode: 'VIDEO',
          numHands: 1,
          minHandDetectionConfidence: 0.7,
          minHandPresenceConfidence: 0.7,
          minTrackingConfidence: 0.6
        })
      ]);

      self.postMessage({ type: 'ready' });
    } catch (err) {
      self.postMessage({ type: 'error', msg: err.message || String(err) });
    }
  }

  else if (e.data.type === 'frame') {
    const { bitmap, timestamp } = e.data;
    if (!bitmap) { self.postMessage({ type: 'result', face: null, hands: [] }); return; }
    if (!face || !hand) { bitmap.close(); self.postMessage({ type: 'result', face: null, hands: [] }); return; }
    const out = { type: 'result', face: null, hands: [] };

    try {
      const fr = face.detectForVideo(bitmap, timestamp);
      if (fr.faceLandmarks?.length) {
        const L = fr.faceLandmarks[0];
        if (L.length < 478) throw new Error('Insufficient landmarks');
        // Iris centers (468=left, 473=right)
        const li = L[468], ri = L[473];
        // Eye lids: top/bottom for vertical gaze
        const lt = L[159], lb = L[145], rt = L[386], rb = L[374];
        // Eye corners: outer/inner for horizontal gaze
        const lo = L[33], lI = L[133], ro = L[362], rI = L[263];
        const lh = lb.y - lt.y, rh = rb.y - rt.y;
        const lw = Math.abs(lI.x - lo.x), rw = Math.abs(rI.x - ro.x);
        out.face = {
          gazeX: ((li.x - lo.x) / Math.max(lw, .001) + (ri.x - ro.x) / Math.max(rw, .001)) / 2,
          gazeY: ((li.y - lt.y) / Math.max(lh, .001) + (ri.y - rt.y) / Math.max(rh, .001)) / 2,
          blinkL: lh < .008,
          blinkR: rh < .008
        };
      }
    } catch (_) {}

    try {
      const hr = hand.detectForVideo(bitmap, timestamp);
      if (hr.landmarks) for (const h of hr.landmarks) {
        if (!h || h.length < 21) continue;
        out.hands.push({
          x: h[9].x, y: h[9].y, z: h[9].z || 0,
          wristY: h[0].y,
          thumbX: h[4].x, thumbY: h[4].y,
          indexX: h[8].x, indexY: h[8].y,
          pinch: Math.hypot(h[4].x - h[8].x, h[4].y - h[8].y, (h[4].z || 0) - (h[8].z || 0)),
          fingers: [h[4].y < h[3].y, h[8].y < h[6].y, h[12].y < h[10].y, h[16].y < h[14].y, h[20].y < h[18].y]
        });
      }
    } catch (_) {}

    bitmap.close();
    self.postMessage(out);
  }
};
