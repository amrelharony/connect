// markov-chain.js — Pure Markov Chain + MLP forward pass
// Zero DOM, no localStorage, no network. Takes numeric state indices.
(function() {
  'use strict';

  /**
   * Create a new Markov chain state.
   * @param {number} numStates
   * @returns {{ matrix: Float32Array, numStates: number, totalTransitions: number }}
   */
  function create(numStates) {
    return {
      matrix: new Float32Array(numStates * numStates),
      numStates: numStates,
      totalTransitions: 0
    };
  }

  /**
   * Record one transition from state fromIdx to toIdx.
   * @param {Object} mc  - Markov chain state
   * @param {number} fromIdx
   * @param {number} toIdx
   */
  function transition(mc, fromIdx, toIdx) {
    if (fromIdx < 0 || fromIdx >= mc.numStates || toIdx < 0 || toIdx >= mc.numStates) return;
    mc.matrix[fromIdx * mc.numStates + toIdx]++;
    mc.totalTransitions++;
  }

  /**
   * Predict next states from a given state index.
   * @param {Object} mc
   * @param {number} stateIdx
   * @param {number} threshold  - minimum probability to include
   * @param {number} maxResults - max entries to return
   * @returns {Array<{idx: number, prob: number}>}
   */
  function predict(mc, stateIdx, threshold, maxResults) {
    threshold = threshold !== undefined ? threshold : 0.15;
    maxResults = maxResults !== undefined ? maxResults : 3;
    var N = mc.numStates;
    var row = mc.matrix.subarray(stateIdx * N, stateIdx * N + N);
    var sum = 0;
    for (var i = 0; i < N; i++) sum += row[i];
    if (sum === 0) return [];
    var probs = [];
    for (var i = 0; i < N; i++) {
      var p = row[i] / sum;
      if (p >= threshold) probs.push({ idx: i, prob: p });
    }
    probs.sort(function(a, b) { return b.prob - a.prob; });
    return probs.slice(0, maxResults);
  }

  /**
   * Seed the matrix with cold-start prior pairs.
   * @param {Object} mc
   * @param {Array<[number,number]>} priorPairs - [[fromIdx, toIdx], ...]
   * @param {number} weight - how much to add per pair (default 2)
   */
  function applyColdPrior(mc, priorPairs, weight) {
    weight = weight !== undefined ? weight : 2;
    var N = mc.numStates;
    for (var i = 0; i < priorPairs.length; i++) {
      mc.matrix[priorPairs[i][0] * N + priorPairs[i][1]] += weight;
    }
    var total = 0;
    for (var i = 0; i < mc.matrix.length; i++) total += mc.matrix[i];
    mc.totalTransitions = total;
  }

  /**
   * Serialize the matrix to a JSON-compatible array (pure, no localStorage).
   */
  function serialize(mc) {
    return JSON.stringify(Array.from(mc.matrix));
  }

  /**
   * Deserialize a matrix string back into a Markov chain.
   */
  function deserialize(str, numStates) {
    var mc = create(numStates);
    try {
      var arr = JSON.parse(str);
      if (arr.length === numStates * numStates) {
        mc.matrix.set(arr);
        var total = 0;
        for (var i = 0; i < mc.matrix.length; i++) total += mc.matrix[i];
        mc.totalTransitions = total;
      }
    } catch (_) {}
    return mc;
  }

  // ── MLP forward pass (CPU fallback for WebNN) ──

  /**
   * ReLU hidden layer + softmax output.
   * @param {Float32Array} features  - input vector [inputDim]
   * @param {Float32Array} W1       - weights [inputDim * hiddenDim]
   * @param {Float32Array} B1       - biases  [hiddenDim]
   * @param {Float32Array} W2       - weights [hiddenDim * outputDim]
   * @param {Float32Array} B2       - biases  [outputDim]
   * @param {number} inputDim
   * @param {number} hiddenDim
   * @param {number} outputDim
   * @returns {Float32Array} probabilities [outputDim]
   */
  function mlpForward(features, W1, B1, W2, B2, inputDim, hiddenDim, outputDim) {
    // Hidden = ReLU(features * W1 + B1)
    var hidden = new Float32Array(hiddenDim);
    for (var h = 0; h < hiddenDim; h++) {
      var s = B1[h];
      for (var i = 0; i < inputDim; i++) s += features[i] * W1[i * hiddenDim + h];
      hidden[h] = s > 0 ? s : 0; // ReLU
    }

    // Output = softmax(hidden * W2 + B2)
    var logits = new Float32Array(outputDim);
    var maxLogit = -Infinity;
    for (var o = 0; o < outputDim; o++) {
      var s = B2[o];
      for (var h = 0; h < hiddenDim; h++) s += hidden[h] * W2[h * outputDim + o];
      logits[o] = s;
      if (s > maxLogit) maxLogit = s;
    }

    var sumExp = 0;
    var probs = new Float32Array(outputDim);
    for (var o = 0; o < outputDim; o++) {
      probs[o] = Math.exp(logits[o] - maxLogit);
      sumExp += probs[o];
    }
    for (var o = 0; o < outputDim; o++) probs[o] /= sumExp;
    return probs;
  }

  /**
   * Initialize MLP weights seeded from a Markov chain's transition matrix.
   * @param {Object} mc        - Markov chain state
   * @param {number} inputDim  - e.g. 6
   * @param {number} hiddenDim - e.g. 8
   * @returns {{ W1: Float32Array, B1: Float32Array, W2: Float32Array, B2: Float32Array }}
   */
  function initWeightsFromMarkov(mc, inputDim, hiddenDim) {
    var N = mc.numStates;
    var W1 = new Float32Array(inputDim * hiddenDim);
    var B1 = new Float32Array(hiddenDim);
    var W2 = new Float32Array(hiddenDim * N);
    var B2 = new Float32Array(N);

    for (var i = 0; i < W1.length; i++) W1[i] = (Math.random() - 0.5) * 0.5;
    for (var i = 0; i < B1.length; i++) B1[i] = 0.01;
    B2.fill(0);

    var total = mc.totalTransitions || 1;
    for (var h = 0; h < hiddenDim; h++) {
      for (var o = 0; o < N; o++) {
        var val = 0;
        for (var s = 0; s < N; s++) {
          val += mc.matrix[s * N + o] / total;
        }
        W2[h * N + o] = val * 2 - (1 / N);
      }
    }

    return { W1: W1, B1: B1, W2: W2, B2: B2 };
  }

  window.MarkovChain = {
    create: create,
    transition: transition,
    predict: predict,
    applyColdPrior: applyColdPrior,
    serialize: serialize,
    deserialize: deserialize,
    mlpForward: mlpForward,
    initWeightsFromMarkov: initWeightsFromMarkov
  };
})();
