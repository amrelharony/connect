// isolation-forest.js — Pure Isolation Forest (Liu et al. 2008)
// Zero DOM dependencies. Takes arrays of numeric feature vectors, returns anomaly scores.
(function() {
  'use strict';

  function avgPathC(n) {
    if (n <= 1) return 0;
    if (n === 2) return 1;
    return 2 * (Math.log(n - 1) + 0.5772156649) - 2 * (n - 1) / n;
  }

  function itree(data, maxD, depth) {
    if (data.length <= 1 || depth >= maxD) return { leaf: true, size: data.length };
    var fi = Math.floor(Math.random() * data[0].length);
    var lo = Infinity, hi = -Infinity;
    for (var k = 0; k < data.length; k++) {
      if (data[k][fi] < lo) lo = data[k][fi];
      if (data[k][fi] > hi) hi = data[k][fi];
    }
    if (lo === hi) return { leaf: true, size: data.length };
    var sv = lo + Math.random() * (hi - lo);
    var L = [], R = [];
    for (var k = 0; k < data.length; k++) (data[k][fi] < sv ? L : R).push(data[k]);
    return { fi: fi, sv: sv, l: itree(L, maxD, depth + 1), r: itree(R, maxD, depth + 1) };
  }

  function ipath(node, pt, depth) {
    if (node.leaf) return depth + avgPathC(node.size);
    return ipath(pt[node.fi] < node.sv ? node.l : node.r, pt, depth + 1);
  }

  function iforest(data, nTrees, maxD, subSampleSize) {
    var sub = Math.min(subSampleSize || 256, data.length);
    var trees = [];
    for (var i = 0; i < nTrees; i++) {
      var s = [];
      for (var j = 0; j < sub; j++) s.push(data[Math.floor(Math.random() * data.length)]);
      trees.push(itree(s, maxD, 0));
    }
    return trees;
  }

  function iscore(forest, pt, n) {
    var avg = 0;
    for (var i = 0; i < forest.length; i++) avg += ipath(forest[i], pt, 0);
    avg /= forest.length;
    return Math.pow(2, -avg / avgPathC(n));
  }

  window.IsolationForest = {
    avgPathC: avgPathC,
    itree: itree,
    ipath: ipath,
    iforest: iforest,
    iscore: iscore
  };
})();
