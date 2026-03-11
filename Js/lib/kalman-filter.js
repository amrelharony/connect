// kalman-filter.js — Pure 2D Kalman Filter (constant-velocity model)
// Zero DOM dependencies. Operates on plain state objects {x, P, initialized}.
(function() {
  'use strict';

  var DEFAULTS = { sigmaQ: 0.001, sigmaR: 0.01 };

  function create() {
    var kf = {
      x: new Float64Array(4),   // state: [x, y, vx, vy]
      P: new Float64Array(16),  // 4x4 covariance (row-major)
      initialized: false
    };
    for (var i = 0; i < 4; i++) kf.P[i * 4 + i] = 1.0;
    return kf;
  }

  function predict(kf, dt, sigmaQ) {
    sigmaQ = sigmaQ !== undefined ? sigmaQ : DEFAULTS.sigmaQ;

    var x0 = kf.x[0], x1 = kf.x[1], x2 = kf.x[2], x3 = kf.x[3];
    kf.x[0] = x0 + x2 * dt;
    kf.x[1] = x1 + x3 * dt;

    var dt2 = dt * dt, dt3 = dt2 * dt, dt4 = dt3 * dt;
    var q11 = sigmaQ * dt4 / 4, q13 = sigmaQ * dt3 / 2, q33 = sigmaQ * dt2;

    // F * P * F^T
    var oP = new Float64Array(kf.P);
    for (var i = 0; i < 4; i++) {
      kf.P[i * 4]     = oP[i * 4] + oP[i * 4 + 2] * dt;
      kf.P[i * 4 + 1] = oP[i * 4 + 1] + oP[i * 4 + 3] * dt;
    }
    var oP2 = new Float64Array(kf.P);
    for (var j = 0; j < 4; j++) {
      kf.P[j]      = oP2[j] + oP2[8 + j] * dt;
      kf.P[4 + j]  = oP2[4 + j] + oP2[12 + j] * dt;
    }

    // + Q
    kf.P[0] += q11; kf.P[2] += q13; kf.P[5] += q11; kf.P[7] += q13;
    kf.P[8] += q13; kf.P[10] += q33; kf.P[13] += q13; kf.P[15] += q33;
  }

  function update(kf, mx, my, sigmaR) {
    sigmaR = sigmaR !== undefined ? sigmaR : DEFAULTS.sigmaR;

    if (!kf.initialized) {
      kf.x[0] = mx; kf.x[1] = my; kf.x[2] = 0; kf.x[3] = 0;
      kf.initialized = true;
      return;
    }

    var R0 = sigmaR, R3 = sigmaR;

    var S00 = kf.P[0] + R0, S01 = kf.P[1];
    var S10 = kf.P[4], S11 = kf.P[5] + R3;
    var det = S00 * S11 - S01 * S10;
    if (Math.abs(det) < 1e-12) return;
    var invDet = 1 / det;
    var Si00 = S11 * invDet, Si01 = -S01 * invDet;
    var Si10 = -S10 * invDet, Si11 = S00 * invDet;

    // Kalman gain K = P * H^T * S^-1 (H = [I2, 0])
    var K = new Float64Array(8);
    for (var i = 0; i < 4; i++) {
      K[i * 2]     = kf.P[i * 4] * Si00 + kf.P[i * 4 + 1] * Si10;
      K[i * 2 + 1] = kf.P[i * 4] * Si01 + kf.P[i * 4 + 1] * Si11;
    }

    // State update
    var y0 = mx - kf.x[0], y1 = my - kf.x[1];
    for (var i = 0; i < 4; i++) {
      kf.x[i] += K[i * 2] * y0 + K[i * 2 + 1] * y1;
    }

    // Covariance update: P = (I - K*H) * P
    var I_KH = new Float64Array(16);
    for (var i = 0; i < 4; i++) I_KH[i * 4 + i] = 1;
    for (var i = 0; i < 4; i++) {
      I_KH[i * 4]     -= K[i * 2];
      I_KH[i * 4 + 1] -= K[i * 2 + 1];
    }
    var newP = new Float64Array(16);
    for (var i = 0; i < 4; i++) {
      for (var j = 0; j < 4; j++) {
        var s = 0;
        for (var k = 0; k < 4; k++) s += I_KH[i * 4 + k] * kf.P[k * 4 + j];
        newP[i * 4 + j] = s;
      }
    }
    kf.P.set(newP);
  }

  function getPosition(kf) {
    return { x: kf.x[0], y: kf.x[1], vx: kf.x[2], vy: kf.x[3] };
  }

  function extrapolate(kf, dt) {
    return {
      x: kf.x[0] + kf.x[2] * dt,
      y: kf.x[1] + kf.x[3] * dt,
      vx: kf.x[2],
      vy: kf.x[3]
    };
  }

  window.KalmanFilter2D = {
    DEFAULTS: DEFAULTS,
    create: create,
    predict: predict,
    update: update,
    getPosition: getPosition,
    extrapolate: extrapolate
  };
})();
