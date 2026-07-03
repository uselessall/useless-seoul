/* ============================================================
   main.js — 스크롤 리빌 + 향 테마 전환 + 상단바
   의존성 0
   ============================================================ */
(function () {
  "use strict";

  /* ---- 향 테마 팔레트 (CSS var + 파티클 색)
     색값 출처: 1B RAG PoC 무드보드 authored 팔레트
     (NightFog #98A8FF / RainOnWarmWood #C68B59·#D8B89A·#F2E6D8 / Petrichor #5FC5FF) ---- */
  var THEMES = {
    base:    { accent: "#c9a86a", rgb: [201, 168, 106] }, // 중립 웜 골드
    hangang: { accent: "#9bb0f0", rgb: [152, 168, 255] }, // 여름밤 한강 — NightFog 라일락-블루
    seongsu: { accent: "#aeb87e", rgb: [170, 184, 126] }, // 성수 무화과 — 그린 피그 + 카페우드
    hotel:   { accent: "#dcc8a8", rgb: [216, 184, 154] }, // 호텔 블랭킷 — RainOnWarmWood 린넨/우드
    tea:     { accent: "#cca468", rgb: [206, 168, 104] }  // 애프터눈 티 — 티 앰버
  };

  var root = document.documentElement;
  var current = "base";

  function applyTheme(name) {
    var t = THEMES[name] || THEMES.base;
    if (name === current) return;
    current = name;
    root.style.setProperty("--accent", t.accent);
    root.style.setProperty("--accent-rgb", t.rgb.join(", "));
    root.style.setProperty("--glow", "rgba(" + t.rgb.join(",") + ",0.5)");
    if (window.ScentTheme) window.ScentTheme.set(t.rgb);
  }

  /* ---- 스크롤 리빌 ---- */
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          var d = parseInt(en.target.getAttribute("data-d") || "0", 10);
          en.target.style.transitionDelay = (d * 0.09) + "s";
          en.target.classList.add("is-in");
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.16, rootMargin: "0px 0px -8% 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ---- 향 섹션 진입 시 테마 전환 ---- */
  var scents = document.querySelectorAll("[data-theme]");
  if ("IntersectionObserver" in window && scents.length) {
    var themeIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && en.intersectionRatio > 0.4) {
          applyTheme(en.target.getAttribute("data-theme"));
        }
      });
    }, { threshold: [0.4, 0.6] });
    scents.forEach(function (el) { themeIO.observe(el); });

    // 향 라인업 밖(히어로/스토리/푸터)으로 나가면 base 복귀
    var neutralIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && en.intersectionRatio > 0.5) applyTheme("base");
      });
    }, { threshold: [0.5] });
    ["hero", "story", "footer"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) neutralIO.observe(el);
    });
  }

  /* ---- 스크롤: 워프 부스트 + 히어로 깊이 줌 + 상단바 ---- */
  var topbar = document.getElementById("topbar");
  var heroInner = document.querySelector(".hero__inner");
  var heroBg = document.querySelector(".hero__bg img");
  var heroCue = document.querySelector(".hero__cue");
  var lastY = window.scrollY;
  var ticking = false;
  var reducedM = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function frame() {
    var y = window.scrollY;
    var vh = window.innerHeight || 1;

    // 상단바
    if (topbar) topbar.classList.toggle("is-scrolled", y > 40);

    if (!reducedM) {
      // 스크롤 속도 → 워프 가속 (빨려드는 느낌)
      var dv = Math.abs(y - lastY) / vh;
      window.__warpBoost = Math.min(0.06, (window.__warpBoost || 0) + dv * 0.9);

      // 히어로: 차분한 에디토리얼 — 사진 패럴랙스 + 텍스트 페이드(절제)
      var p = Math.min(1, y / vh);
      if (heroBg) {
        heroBg.style.transform = "scale(" + (1.04 + p * 0.1) + ") translateY(" + (p * 6) + "%)";
      }
      if (heroInner) {
        heroInner.style.transform = "translateY(" + (p * -40) + "px)";
        heroInner.style.opacity = String(Math.max(0, 1 - p * 1.3));
      }
      if (heroCue) heroCue.style.opacity = String(Math.max(0, 1 - p * 2.4));
    }

    lastY = y;
    ticking = false;
  }
  function onScroll() {
    if (!ticking) { requestAnimationFrame(frame); ticking = true; }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  frame();
})();
