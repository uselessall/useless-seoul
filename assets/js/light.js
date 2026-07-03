/* ============================================================
   light.js — 라이트 에디토리얼 인터랙션 레이어
   - 깊이 풀인 스크롤 리빌 (perspective translateZ)
   - 히어로 제품 마우스 3D 틸트
   - 제품 이미지 스크롤 패럴랙스 (프레임 내 드리프트)
   - 커서 추종 웜 스포트라이트
   전부 transform/rAF — 가볍고 부드럽게
   ============================================================ */
(function () {
  "use strict";

  var reduced = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- 깊이 풀인 리빌 ---- */
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.14, rootMargin: "0px 0px -8% 0px" });
    reveals.forEach(function (e) { io.observe(e); });
  } else {
    reveals.forEach(function (e) { e.classList.add("in"); });
  }

  /* ---- nav solid ---- */
  var nav = document.getElementById("nav");
  function navToggle() { if (nav) nav.classList.toggle("solid", window.scrollY > 40); }
  window.addEventListener("scroll", navToggle, { passive: true });
  navToggle();

  if (reduced) return; // 모션 최소화 사용자: 인터랙션 생략

  /* ---- 커서 웜 스포트라이트 ---- */
  var spot = document.createElement("div");
  spot.className = "cursor-spot";
  document.body.appendChild(spot);

  /* ---- 상태 ---- */
  var mx = 0.5, my = 0.5;          // 정규화 마우스(0~1)
  var cmx = 0.5, cmy = 0.5;        // lerp된 값
  var px = 0, py = 0;              // 픽셀 마우스
  var cpx = 0, cpy = 0;
  var hero = document.querySelector(".hero__img");
  var parallax = document.querySelectorAll(".card__img img, .hero__img img, .objet__item img");

  window.addEventListener("pointermove", function (e) {
    mx = e.clientX / window.innerWidth;
    my = e.clientY / window.innerHeight;
    px = e.clientX; py = e.clientY;
  }, { passive: true });

  function lerp(a, b, t) { return a + (b - a) * t; }

  // 이미지 base transform 저장(스크롤 패럴랙스가 덮어씀)
  var pData = [];
  parallax.forEach(function (img) { pData.push({ el: img, cur: 0 }); });

  var vh = window.innerHeight;
  window.addEventListener("resize", function () { vh = window.innerHeight; }, { passive: true });

  function frame() {
    cmx = lerp(cmx, mx, 0.07);
    cmy = lerp(cmy, my, 0.07);
    cpx = lerp(cpx, px, 0.12);
    cpy = lerp(cpy, py, 0.12);

    // 스포트라이트
    spot.style.transform = "translate(" + cpx + "px," + cpy + "px)";

    // 히어로 3D 틸트
    if (hero) {
      var rx = (0.5 - cmy) * 7;
      var ry = (cmx - 0.5) * 9;
      hero.style.transform = "perspective(1100px) rotateX(" + rx + "deg) rotateY(" + ry + "deg)";
    }

    // 이미지 스크롤 패럴랙스 (프레임 내 드리프트)
    for (var i = 0; i < pData.length; i++) {
      var d = pData[i];
      var r = d.el.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) continue;
      var center = r.top + r.height / 2;
      var prog = (center - vh / 2) / vh;          // -0.5~0.5 근방
      var target = -prog * 26;                     // px 드리프트
      d.cur = lerp(d.cur, target, 0.1);
      d.el.style.transform = "scale(1.12) translateY(" + d.cur + "px)";
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
