/* USÉLESS SEOUL — 실사 360° 스핀 컴포넌트 (프레임 스크럽)
   사용: <div data-spin data-spin-base="assets/3d/spin/f" data-spin-count="40" ...></div>
   옵션:
   - data-spin-scroll="1"   페이지 스크롤 연동 회전 (+드래그 합산)
   - data-spin-speed="2"    스크롤 회전 배속
   - data-spin-auto="1"     상시 슬로 자동 회전 (대기 없이)
   - data-spin-offset="13"  시작 프레임 오프셋 (여러 개 위상 차이용)
   - data-spin-theater="1"  스크롤 시어터 — 병이 따라 내려오며 축소·페이드 (index 히어로 전용)
   - 프레임 파일: {base}{01..count}.jpg (2자리 패딩)
   - JS 실패 시: 컨테이너 안의 <img>(정지컷)가 그대로 남음
   - prefers-reduced-motion: 스핀·시어터 전부 비활성 (정지컷 유지)
   + hover 스핀: .product__img (index/shop 카드, 동적 렌더)에 위임 — 마우스 올리면 반회전 */
(function () {
  "use strict";

  var REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (REDUCED) return; // 모션 최소화 — 전부 정지컷

  var BASE_DEFAULT = "assets/3d/spin/f";
  var N_DEFAULT = 40;

  /* ---- 공유 프레임 캐시 (같은 base는 한 번만 로드) ---- */
  var cache = {};
  function loadFrames(base, N, onFirst) {
    var key = base + "|" + N;
    if (cache[key]) {
      if (cache[key].some(function (im) { return im.complete && im.naturalWidth; })) onFirst();
      else cache[key][0].addEventListener("load", onFirst, { once: true });
      return cache[key];
    }
    var frames = new Array(N);
    var fired = false;
    function pad(n) { return (n < 10 ? "0" : "") + n; }
    for (let i = 0; i < N; i++) {
      var im = new Image();
      im.decoding = "async";
      im.src = base + pad(i + 1) + ".jpg";
      im.onload = function () { if (!fired) { fired = true; onFirst(); } };
      frames[i] = im;
    }
    cache[key] = frames;
    return frames;
  }

  function makeCanvas(el) {
    var canvas = document.createElement("canvas");
    canvas.className = "spin-canvas";
    return canvas;
  }

  function drawFrame(ctx, canvas, frames, N, raw) {
    function ready(i) { var im = frames[i]; return im && im.complete && im.naturalWidth; }
    var i = ((Math.round(raw) % N) + N) % N;
    if (!ready(i)) {
      var found = -1;
      for (var d = 1; d < N; d++) {
        if (ready((i + d) % N)) { found = (i + d) % N; break; }
        if (ready((i - d + N) % N)) { found = (i - d + N) % N; break; }
      }
      if (found < 0) return;
      i = found;
    }
    var im = frames[i];
    var cw = canvas.width, ch = canvas.height;
    ctx.clearRect(0, 0, cw, ch);
    var s = Math.min(cw / im.naturalWidth, ch / im.naturalHeight);
    var dw = im.naturalWidth * s, dh = im.naturalHeight * s;
    ctx.drawImage(im, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
  }

  /* ---- 메인 스핀 마운트 ---- */
  function mount(el) {
    var base = el.getAttribute("data-spin-base") || BASE_DEFAULT;
    var N = parseInt(el.getAttribute("data-spin-count") || N_DEFAULT, 10);
    var useScroll = el.getAttribute("data-spin-scroll") === "1";
    var auto = el.getAttribute("data-spin-auto") === "1";
    var theater = el.getAttribute("data-spin-theater") === "1";
    var offset = parseFloat(el.getAttribute("data-spin-offset") || "0");
    var speed = parseFloat(el.getAttribute("data-spin-speed") || "1");
    if (!base || !N) return;

    var canvas = makeCanvas(el);
    var ctx = canvas.getContext("2d");
    var ph = el.querySelector("img");

    var dragIdx = 0, vel = 0, dragging = false, lastX = 0, idleMs = 0, autoIdx = 0;

    var frames = loadFrames(base, N, function () {
      el.appendChild(canvas); resize();
      if (ph) ph.style.visibility = "hidden";
    });

    function scrollIdx() {
      if (!useScroll) return 0;
      var r = el.getBoundingClientRect();
      var vh = window.innerHeight || 1;
      var p = 1 - (r.top + r.height / 2) / (vh + r.height);
      return p * N * speed;
    }

    function draw() { drawFrame(ctx, canvas, frames, N, scrollIdx() + dragIdx + autoIdx + offset); }

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = el.clientWidth * dpr;
      canvas.height = el.clientHeight * dpr;
      draw();
    }
    window.addEventListener("resize", resize);
    if (window.ResizeObserver) new ResizeObserver(resize).observe(el);

    el.addEventListener("pointerdown", function (e) {
      el.setPointerCapture(e.pointerId);
      dragging = true; lastX = e.clientX; vel = 0; idleMs = 0;
      el.classList.add("spin-touched");
    });
    el.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      var dx = e.clientX - lastX;
      lastX = e.clientX;
      var step = dx * (N / Math.max(el.clientWidth, 1)) * 1.4;
      dragIdx += step; vel = step;
    });
    function up() { dragging = false; }
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);

    /* 스크롤 시어터 — 병이 따라 내려오며 축소·페이드 (히어로 전용) */
    function theaterTransform() {
      if (!theater) return;
      var y = window.scrollY || 0;
      var vh = window.innerHeight || 1;
      var p = Math.min(y / (vh * 0.95), 1);          // 히어로 구간 진행도 0..1
      var ty = y * 0.42;                              // 스크롤의 42%만 위로 = 따라오는 느낌
      var sc = 1 - p * 0.28;
      var op = p < 0.72 ? 1 : Math.max(0, 1 - (p - 0.72) / 0.28);
      el.style.transform = "translateY(" + ty + "px) scale(" + sc + ")";
      el.style.opacity = op;
      el.style.pointerEvents = op < 0.15 ? "none" : "";
    }

    var last = performance.now();
    function tick(now) {
      var dt = now - last; last = now;
      if (!dragging) {
        idleMs += dt;
        if (Math.abs(vel) > 0.01) { dragIdx += vel; vel *= 0.92; }
        else if (auto) { autoIdx += dt * 0.005; }
        else if (!useScroll && idleMs > 8000) { autoIdx += dt * 0.006; }
      }
      theaterTransform();
      draw();
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* ---- hover 스핀 (카드 위임 — 동적 렌더 대응) ---- */
  var hovered = new WeakMap();
  function hoverMount(box) {
    var state = { canvas: makeCanvas(box), idx: 0, target: 0, raf: 0 };
    state.canvas.classList.add("spin-hover-canvas");
    var ctx = state.canvas.getContext("2d");
    var frames = loadFrames(BASE_DEFAULT, N_DEFAULT, function () {});
    function size() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      state.canvas.width = box.clientWidth * dpr;
      state.canvas.height = box.clientHeight * dpr;
    }
    function anim() {
      state.idx += (state.target - state.idx) * 0.07;
      drawFrame(ctx, state.canvas, frames, N_DEFAULT, state.idx);
      if (Math.abs(state.target - state.idx) > 0.2 || box.matches(":hover")) state.raf = requestAnimationFrame(anim);
      else { box.classList.remove("spin-hovering"); state.raf = 0; }
    }
    box.addEventListener("mouseenter", function () {
      size();
      if (!state.canvas.parentNode) box.appendChild(state.canvas);
      box.classList.add("spin-hovering");
      state.target += N_DEFAULT / 2;                 // 반 바퀴
      if (!state.raf) state.raf = requestAnimationFrame(anim);
    });
    return state;
  }
  document.addEventListener("mouseover", function (e) {
    var box = e.target && e.target.closest && e.target.closest(".product__img");
    if (!box || hovered.has(box)) return;
    hovered.set(box, hoverMount(box));
    box.dispatchEvent(new Event("mouseenter"));
  });

  function init() { document.querySelectorAll("[data-spin]").forEach(mount); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
