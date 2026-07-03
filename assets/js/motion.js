/* ============================================================
   motion.js — USÉLESS SEOUL "SEOUL, BOTTLED." (블랙 아카이브)
   GPT 방향: 덜 보여주기 / 병1개→잔상링→진입 / 암전 전환 /
   한 장면 한 움직임 / "빨려듦"은 히어로 1회만
   Lenis + GSAP ScrollTrigger. 미로드/reduced-motion 시 정적 폴백.
   ============================================================ */
(function () {
  "use strict";

  var root = document.documentElement;
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- 향 테마(포인트색 5% 이하 — 빛/반사/그림자/라벨) ---- */
  var THEMES = {
    base:    { accent: "#A66E3A", glow: "rgba(166,110,58,0.40)" },
    hangang: { accent: "#B8793D", glow: "rgba(184,121,61,0.36)" },   // 소듐 오렌지
    seongsu: { accent: "#8A6A4A", glow: "rgba(120,96,66,0.34)" },    // 브릭/우드
    hotel:   { accent: "#A66E3A", glow: "rgba(166,110,58,0.34)" },   // 램프 앰버
    tea:     { accent: "#8A6038", glow: "rgba(138,96,56,0.34)" }     // 티 브라운
  };
  var current = "";
  function setTheme(n) {
    if (n === current) return; current = n;
    var t = THEMES[n] || THEMES.base;
    root.style.setProperty("--accent", t.accent);
    root.style.setProperty("--glow", t.glow);
  }

  /* ---- 상단바 ---- */
  var topbar = document.getElementById("topbar");
  function navToggle() { if (topbar) topbar.classList.toggle("solid", window.scrollY > 40); }
  window.addEventListener("scroll", navToggle, { passive: true });
  navToggle();

  /* ---- reveal ---- */
  var revs = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    revs.forEach(function (e) { io.observe(e); });
  } else { revs.forEach(function (e) { e.classList.add("in"); }); }

  var hasGSAP = window.gsap && window.ScrollTrigger;

  /* ---- 폴백 ---- */
  if (reduced || !hasGSAP) {
    var ld0 = document.getElementById("loader"); if (ld0) ld0.classList.add("is-done");
    setTheme("hangang");
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  /* ---- 네이티브 스크롤 사용(Lenis 제거) — 맥 트랙패드 관성과 충돌 안 함, 끊김↓ ---- */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var id = a.getAttribute("href");
      if (id.length > 1) { var el = document.querySelector(id); if (el) { e.preventDefault(); el.scrollIntoView({ behavior: "smooth", block: "start" }); } }
    });
  });

  /* ---- 인트로 로더 → 히어로 등장(opacity+letter-spacing, fade-up 금지) ---- */
  var loader = document.getElementById("loader");
  var bar = loader && loader.querySelector(".loader__bar i");
  var heroKids = gsap.utils.toArray(".kicker, .hero__title, .hero__warn, .hero__kr, .hero__cue");
  var heroBottle = document.querySelector(".hero__bottle");
  gsap.set(heroKids, { autoAlpha: 0, letterSpacing: "0.14em" });
  gsap.set(heroBottle, { autoAlpha: 0, scale: 1.06 });
  var intro = gsap.timeline();
  if (bar) intro.to(bar, { width: "100%", duration: 1.0, ease: "power1.inOut" });
  intro.add(function () { if (loader) loader.classList.add("is-done"); });
  intro.to(heroBottle, { autoAlpha: 1, scale: 1, duration: 1.4, ease: "power2.out" }, "+=0.05");
  intro.to(heroKids, { autoAlpha: 1, letterSpacing: "normal", duration: 1.1, stagger: 0.1, ease: "power2.out" }, "-=1.0");

  var isMobile = window.matchMedia("(max-width: 860px)").matches;

  /* ---- HERO: 핀 없음(스크롤 붙잡지 않음). 인트로로 등장, 자연스럽게 흘러감.
         배경만 아주 약한 패럴랙스(핀 아님 → 끊김 없음) ---- */
  var heroBg = document.getElementById("heroBg");
  if (heroBg && !isMobile) {
    gsap.to(heroBg, { yPercent: 10, ease: "none",
      scrollTrigger: { trigger: ".ringstage", start: "top top", end: "bottom top", scrub: true } });
  }

  /* ---- SCENE ARCHIVE — 연속 흐름(sticky·핀·암전 게이트 제거). 진입 시 1회 reveal ---- */
  var scenes = gsap.utils.toArray(".scene");
  scenes.forEach(function (scene, i) {
    var copy = scene.querySelector(".scene__copy");
    var photo = scene.querySelector(".scene__photo img");
    var theme = scene.getAttribute("data-theme");
    var side = (i % 2 === 0) ? -1 : 1;

    // 켄번스 — 사진 미세 줌(scrub, 연속이라 홀드 없음)
    if (photo) gsap.fromTo(photo, { scale: 1.07 }, { scale: 1, ease: "none",
      scrollTrigger: { trigger: scene, start: "top bottom", end: "bottom top", scrub: true } });

    // 분위기 배경 미세 패럴랙스(transform만 — 부드러움 유지)
    var bg = scene.querySelector(".scene__bg");
    if (bg) gsap.fromTo(bg, { yPercent: -5 }, { yPercent: 5, ease: "none",
      scrollTrigger: { trigger: scene, start: "top bottom", end: "bottom top", scrub: true } });

    // 테마 전환
    ScrollTrigger.create({
      trigger: scene, start: "top center", end: "bottom center",
      onToggle: function (s) { if (s.isActive) setTheme(theme); },
      onEnterBack: function () { setTheme(theme); }
    });

    // 카피 — 진입 시 1회 등장(스크럽/홀드 없음)
    gsap.from(copy, { autoAlpha: 0, x: 24 * side, y: 24, duration: 1.1, ease: "power2.out",
      scrollTrigger: { trigger: scene, start: "top 74%" } });
  });

  setTheme("hangang");
  ScrollTrigger.refresh();
})();
