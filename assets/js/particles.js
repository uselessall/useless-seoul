/* ============================================================
   향 보케(bokeh) — 의존성 0 vanilla canvas
   "빛 속을 떠다니는 향" 미감 (Aesop/Byredo 류 럭셔리):
   - 소프트 오브 + 피사계심도(DOF) 보케
   - 천천히 깊이로 다가옴 → 스크롤하면 살짝 빨려드는 풀(HAL 감각, 절제)
   - 마우스 패럴랙스(소실점 미세 이동)
   - 향 테마 색을 부드럽게 lerp (스프라이트 재생성)
   기법 참고: 오프스크린 스프라이트 drawImage = 저비용 고급 보케,
   depth→size 스케일(_universe_refs/particle-network)
   ============================================================ */
(function () {
  "use strict";

  var canvas = document.getElementById("scent-canvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");

  var reduced = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var W = 0, H = 0, cx = 0, cy = 0, focal = 1;
  var motes = [];

  // 색 lerp + 스프라이트
  var cur = { r: 201, g: 168, b: 106 };
  var tgt = { r: 201, g: 168, b: 106 };
  var sprite = document.createElement("canvas");
  var sctx = sprite.getContext("2d");
  var SPR = 128;

  // 마우스 패럴랙스 + 스크롤 풀
  var par = { x: 0, y: 0, tx: 0, ty: 0 };
  window.__warpBoost = 0;

  function rand(a, b) { return a + Math.random() * (b - a); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  function buildSprite(r, g, b) {
    sprite.width = SPR; sprite.height = SPR;
    var c = SPR / 2;
    var grad = sctx.createRadialGradient(c, c, 0, c, c, c);
    grad.addColorStop(0.0, "rgba(" + r + "," + g + "," + b + ",0.95)");
    grad.addColorStop(0.18, "rgba(" + r + "," + g + "," + b + ",0.55)");
    grad.addColorStop(0.5, "rgba(" + r + "," + g + "," + b + ",0.14)");
    grad.addColorStop(1.0, "rgba(" + r + "," + g + "," + b + ",0)");
    sctx.clearRect(0, 0, SPR, SPR);
    sctx.fillStyle = grad;
    sctx.beginPath();
    sctx.arc(c, c, c, 0, Math.PI * 2);
    sctx.fill();
  }

  function makeMote(far) {
    // baseR 분포: 대부분 작고 일부 큰 전경 보케
    var big = Math.random() < 0.18;
    return {
      ox: rand(0.02, 0.98),          // 스크린 전역 앵커 (중앙 뭉침 방지)
      oy: rand(0.04, 0.96),
      z: far ? rand(2.6, 3.6) : rand(0.4, 3.6),
      baseR: big ? rand(46, 78) : rand(9, 26),
      driftA: rand(0, Math.PI * 2),
      driftS: rand(0.0003, 0.0011),
      driftR: rand(5, 16),
      twk: rand(0.0007, 0.0022),
      tw: rand(0, Math.PI * 2),
      aMul: big ? rand(0.22, 0.4) : rand(0.4, 0.8)
    };
  }

  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    cx = W / 2; cy = H / 2;
    focal = Math.min(W, H);
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var count = Math.round(Math.min(16, Math.max(7, (W * H) / 110000)));
    motes = [];
    for (var i = 0; i < count; i++) motes.push(makeMote(false));
    motes.sort(function (a, b) { return b.z - a.z; });
  }

  function step() {
    cur.r = lerp(cur.r, tgt.r, 0.03);
    cur.g = lerp(cur.g, tgt.g, 0.03);
    cur.b = lerp(cur.b, tgt.b, 0.03);
    buildSprite(Math.round(cur.r), Math.round(cur.g), Math.round(cur.b));

    par.x = lerp(par.x, par.tx, 0.05);
    par.y = lerp(par.y, par.ty, 0.05);

    window.__warpBoost *= 0.9;
    var pull = 0.0006 + Math.min(0.004, window.__warpBoost);

    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";

    var needSort = false;
    for (var i = 0; i < motes.length; i++) {
      var m = motes[i];
      m.z -= pull * (0.4 + m.z * 0.5);
      m.driftA += m.driftS;
      m.tw += m.twk;

      if (m.z < 0.35) { motes[i] = makeMote(true); needSort = true; continue; }

      // 스크린 앵커 + z기반 크기 + 중심에서 살짝 밀려나며 다가옴(빨려드는 풀)
      var depth = (1 / m.z);              // 가까울수록 큼
      var bx = m.ox * W, by = m.oy * H;
      var outward = (1 - m.z / 3.6) * 0.16; // 다가올수록 중심에서 바깥으로
      var sx = bx + (bx - cx) * outward
             + par.x * depth * 16 + Math.cos(m.driftA) * m.driftR;
      var sy = by + (by - cy) * outward
             + par.y * depth * 16 + Math.sin(m.driftA) * m.driftR;

      var size = m.baseR * depth;
      if (size < 1) continue;
      if (sx < -size || sx > W + size || sy < -size || sy > H + size) continue;

      // DOF: 초점면(z≈1.0)에서 멀수록 투명
      var dof = 1 - Math.min(1, Math.abs(m.z - 1.0) / 2.4);
      var depthA = Math.min(1, (3.6 - m.z) / 3.2);
      var twinkle = 0.85 + 0.15 * Math.sin(m.tw);
      var a = m.aMul * (0.1 + dof * 0.34) * depthA * twinkle;
      if (a <= 0.008) continue;

      ctx.globalAlpha = Math.min(0.2, a);
      ctx.drawImage(sprite, sx - size, sy - size, size * 2, size * 2);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    if (needSort) motes.sort(function (a, b) { return b.z - a.z; });

    requestAnimationFrame(step);
  }

  function drawStatic() {
    cur = { r: tgt.r, g: tgt.g, b: tgt.b };
    buildSprite(tgt.r, tgt.g, tgt.b);
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";
    for (var i = 0; i < 18; i++) {
      var s = rand(40, 160);
      ctx.globalAlpha = rand(0.05, 0.2);
      ctx.drawImage(sprite, rand(0, W) - s, rand(0, H) - s, s * 2, s * 2);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  window.addEventListener("pointermove", function (e) {
    par.tx = (e.clientX - cx) / cx;
    par.ty = (e.clientY - cy) / cy;
  }, { passive: true });
  window.addEventListener("pointerleave", function () { par.tx = 0; par.ty = 0; });

  window.addEventListener("resize", function () {
    resize(); if (reduced) drawStatic();
  });

  window.ScentTheme = {
    set: function (rgbArr) {
      if (!rgbArr) return;
      tgt = { r: rgbArr[0], g: rgbArr[1], b: rgbArr[2] };
      if (reduced) drawStatic();
    }
  };

  resize();
  if (reduced) drawStatic();
  else requestAnimationFrame(step);
})();
