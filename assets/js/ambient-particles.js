/* USÉLESS SEOUL — 앰비언트 인터랙티브 입자 (antigravity.google 문법)
   화이트 섹션에 성긴 입자가 떠 있고, 커서가 다가가면 밀려나며 흐른다.
   사용: <div data-ambient> 컨테이너에 자동 마운트 (canvas 2D, 의존성 0)
   reduced-motion 비활성 · 뷰포트 밖 정지 · pointer-events 없음(콘텐츠 방해 X) */
(function () {
  "use strict";
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var COLORS = ["#b9b9c2", "#c7c7cc", "#a9a9b2",            // 회색 다수
                "#b8a7e0", "#e0b98a", "#8fb3e0"];            // 3향 컬러 소량

  function mount(host) {
    var canvas = document.createElement("canvas");
    canvas.className = "ambient-canvas";
    host.appendChild(canvas);
    var ctx = canvas.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = 0, H = 0;
    var parts = [];
    var mouse = { x: -9999, y: -9999 };
    var visible = false;

    function resize() {
      W = host.clientWidth; H = host.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    }

    function seed() {
      var count = Math.round((W * H) / 16000);   // 밀도: 성기게
      parts = [];
      for (var i = 0; i < count; i++) {
        var big = Math.random() < 0.12;
        parts.push({
          hx: Math.random() * W, hy: Math.random() * H,   // 홈 위치
          x: 0, y: 0, vx: 0, vy: 0,
          r: big ? 2.2 + Math.random() * 1.6 : 0.9 + Math.random() * 1.1,
          c: COLORS[(Math.random() * COLORS.length) | 0],
          ph: Math.random() * Math.PI * 2,
          rot: Math.random() * Math.PI,                    // 색종이 조각 기울기
          len: 3 + Math.random() * 5,
        });
      }
      parts.forEach(function (p) { p.x = p.hx; p.y = p.hy; });
    }

    host.addEventListener("pointermove", function (e) {
      var r = host.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    });
    host.addEventListener("pointerleave", function () { mouse.x = -9999; mouse.y = -9999; });
    window.addEventListener("resize", resize);

    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; },
      { rootMargin: "100px 0px" }).observe(host);

    var last = performance.now();
    function tick(now) {
      var dt = Math.min((now - last) / 16.7, 3); last = now;
      if (visible) {
        ctx.clearRect(0, 0, W, H);
        var t = now * 0.001;
        for (var i = 0; i < parts.length; i++) {
          var p = parts[i];
          /* 홈 주위 부유 */
          var tx = p.hx + Math.sin(t * 0.4 + p.ph) * 14;
          var ty = p.hy + Math.cos(t * 0.32 + p.ph * 1.7) * 12;
          /* 커서 반발 (antigravity 느낌 — 부드럽게 밀려남) */
          var dx = p.x - mouse.x, dy = p.y - mouse.y;
          var d2 = dx * dx + dy * dy;
          var R = 210;
          if (d2 < R * R && d2 > 0.01) {
            var d = Math.sqrt(d2);
            var f = (1 - d / R) * 4.2;
            p.vx += (dx / d) * f * dt;
            p.vy += (dy / d) * f * dt;
          }
          /* 홈 복원 + 감쇠 */
          p.vx += (tx - p.x) * 0.012 * dt;
          p.vy += (ty - p.y) * 0.012 * dt;
          p.vx *= 0.9; p.vy *= 0.9;
          p.x += p.vx * dt; p.y += p.vy * dt;

          /* 색종이 조각 렌더 (속도 따라 기울기 살짝) */
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot + p.vx * 0.05);
          ctx.fillStyle = p.c;
          ctx.globalAlpha = 0.85;
          ctx.fillRect(-p.r / 2, -p.len / 2, p.r, p.len);
          ctx.restore();
        }
      }
      requestAnimationFrame(tick);
    }
    resize();
    requestAnimationFrame(tick);
  }

  function init() { document.querySelectorAll("[data-ambient]").forEach(mount); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
