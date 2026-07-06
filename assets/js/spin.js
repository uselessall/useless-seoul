/* USÉLESS SEOUL — 실사 360° 스핀 컴포넌트 (프레임 스크럽)
   사용: <div data-spin data-spin-base="assets/3d/spin/f" data-spin-count="40" data-spin-scroll="1"></div>
   - 프레임 파일: {base}{01..count}{.jpg} (2자리 패딩)
   - data-spin-scroll="1" → 페이지 스크롤에 연동해 회전 (+드래그 오프셋 합산)
   - data-spin-scroll 없음 → 드래그 + 8초 idle 자동 회전
   - JS 실패 시: 컨테이너 안의 <img>(첫 프레임)가 그대로 남음 (노스크립트 폴백) */
(function () {
  "use strict";

  function mount(el) {
    var base = el.getAttribute("data-spin-base");
    var N = parseInt(el.getAttribute("data-spin-count") || "40", 10);
    var useScroll = el.getAttribute("data-spin-scroll") === "1";
    var speed = parseFloat(el.getAttribute("data-spin-speed") || "1"); // 스크롤 회전 배속
    if (!base || !N) return;

    var canvas = document.createElement("canvas");
    canvas.className = "spin-canvas";
    var ctx = canvas.getContext("2d");
    var ph = el.querySelector("img"); // 폴백 이미지 — 첫 그리기 후 제거

    var frames = new Array(N);
    var loadedFirst = false;
    var dragIdx = 0;      // 드래그 누적 오프셋 (프레임 단위)
    var vel = 0;
    var dragging = false;
    var lastX = 0;
    var idleMs = 0;

    function pad(n) { return (n < 10 ? "0" : "") + n; }

    for (let i = 0; i < N; i++) {
      var im = new Image();
      im.decoding = "async";
      im.src = base + pad(i + 1) + ".jpg";
      im.onload = function () {
        if (!loadedFirst) { loadedFirst = true; el.appendChild(canvas); resize(); if (ph) ph.style.visibility = "hidden"; }
      };
      frames[i] = im;
    }

    function scrollIdx() {
      if (!useScroll) return 0;
      // 요소 중심이 뷰포트 하단→상단을 지나는 동안 speed회전
      var r = el.getBoundingClientRect();
      var vh = window.innerHeight || 1;
      var p = 1 - (r.top + r.height / 2) / (vh + r.height); // 0..1
      return p * N * speed;
    }

    function ready(i) { var im = frames[i]; return im && im.complete && im.naturalWidth; }

    function draw() {
      var raw = scrollIdx() + dragIdx;
      var i = ((Math.round(raw) % N) + N) % N;
      if (!ready(i)) {
        // 미로드 프레임 → 가장 가까운 로드된 프레임으로 대체 (빈 캔버스 방지)
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

    var last = performance.now();
    function tick(now) {
      var dt = now - last; last = now;
      if (!dragging) {
        idleMs += dt;
        if (Math.abs(vel) > 0.01) { dragIdx += vel; vel *= 0.92; }
        else if (!useScroll && idleMs > 8000) { dragIdx += dt * 0.006; }
      }
      draw();
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function init() {
    document.querySelectorAll("[data-spin]").forEach(mount);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
