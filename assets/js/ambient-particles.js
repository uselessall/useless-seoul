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
        var LR = 95;                                   // 물방울 렌즈 반경
        var MAG = 1.85;                                // 렌즈 배율 (향료 돋보기)
        var hasLens = mouse.x > -999;
        var i, p, dx, dy, d2, d;

        /* 물리 — 렌즈 링 바깥에서만 부드러운 반발 (렌즈 안은 관찰 대상) */
        for (i = 0; i < parts.length; i++) {
          p = parts[i];
          var tx = p.hx + Math.sin(t * 0.4 + p.ph) * 14;
          var ty = p.hy + Math.cos(t * 0.32 + p.ph * 1.7) * 12;
          dx = p.x - mouse.x; dy = p.y - mouse.y;
          d2 = dx * dx + dy * dy;
          var R = 230;
          if (d2 > LR * LR && d2 < R * R) {
            d = Math.sqrt(d2);
            var f = (1 - d / R) * 2.2;
            p.vx += (dx / d) * f * dt;
            p.vy += (dy / d) * f * dt;
          }
          p.vx += (tx - p.x) * 0.012 * dt;
          p.vy += (ty - p.y) * 0.012 * dt;
          p.vx *= 0.9; p.vy *= 0.9;
          p.x += p.vx * dt; p.y += p.vy * dt;
        }

        /* 1) 렌즈 밖 입자 */
        for (i = 0; i < parts.length; i++) {
          p = parts[i];
          dx = p.x - mouse.x; dy = p.y - mouse.y;
          if (hasLens && dx * dx + dy * dy < LR * LR) continue;
          drawPart(p, p.x, p.y, 1, 0.85);
        }

        if (hasLens) {
          /* 2) 물방울 유리 바닥 — 미묘한 앰버 틴트 (향료 오일) */
          ctx.save();
          ctx.beginPath();
          ctx.arc(mouse.x, mouse.y, LR, 0, Math.PI * 2);
          ctx.clip();
          var g = ctx.createRadialGradient(mouse.x - LR * 0.3, mouse.y - LR * 0.35, LR * 0.1, mouse.x, mouse.y, LR);
          g.addColorStop(0, "rgba(255,252,246,0.55)");
          g.addColorStop(0.7, "rgba(244,238,226,0.28)");
          g.addColorStop(1, "rgba(216,206,186,0.42)");
          ctx.fillStyle = g;
          ctx.fillRect(mouse.x - LR, mouse.y - LR, LR * 2, LR * 2);

          /* 3) 렌즈 안 입자 — 굴절 확대 (중심 기준 방사 확대) */
          for (i = 0; i < parts.length; i++) {
            p = parts[i];
            dx = p.x - mouse.x; dy = p.y - mouse.y;
            d2 = dx * dx + dy * dy;
            if (d2 >= LR * LR) continue;
            var lx = mouse.x + dx * MAG;
            var ly = mouse.y + dy * MAG;
            drawPart(p, lx, ly, MAG, 0.95);
          }
          ctx.restore();

          /* 4) 물방울 림 + 하이라이트 */
          ctx.save();
          ctx.beginPath();
          ctx.arc(mouse.x, mouse.y, LR, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(120,112,96,0.35)";
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(mouse.x, mouse.y, LR - 4, -2.2, -0.9);
          ctx.strokeStyle = "rgba(255,255,255,0.85)";
          ctx.lineWidth = 3;
          ctx.lineCap = "round";
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(mouse.x, mouse.y, LR - 7, 0.7, 1.6);
          ctx.strokeStyle = "rgba(255,255,255,0.4)";
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.restore();
        }
      }

      function drawPart(p, x, y, scale, alpha) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(p.rot + p.vx * 0.05);
        ctx.fillStyle = p.c;
        ctx.globalAlpha = alpha;
        ctx.fillRect((-p.r / 2) * scale, (-p.len / 2) * scale, p.r * scale, p.len * scale);
        ctx.restore();
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
