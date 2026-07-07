/* USÉLESS SEOUL — 오버사이즈 타이포 스크롤 모션 (HAL 도쿄 "PRO" 문법)
   사용: <div class="typo-band" data-typo-dir="-1"><span class="typo-band__word">USÉLESS</span></div>
   밴드가 뷰포트를 지나는 동안 거대 단어가 수평으로 흐름. reduced-motion 시 정지. */
(function () {
  "use strict";
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var bands = [];
  function init() {
    document.querySelectorAll(".typo-band").forEach(function (band) {
      band.querySelectorAll(".typo-band__word").forEach(function (word) {
        bands.push({
          band: band, word: word,
          dir: parseFloat(word.getAttribute("data-typo-dir") || band.getAttribute("data-typo-dir") || "1"),
          speed: parseFloat(word.getAttribute("data-typo-speed") || "1"),
        });
      });
    });
    if (bands.length) requestAnimationFrame(tick);
  }

  function tick() {
    var vh = window.innerHeight || 1;
    bands.forEach(function (b) {
      var r = b.band.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) return;      // 뷰포트 밖 스킵
      var p = 1 - (r.top + r.height / 2) / (vh + r.height); // 0..1
      /* 단어 폭만큼 화면을 가로지름 — 중앙(p=0.5)에서 단어 중앙 정렬 */
      var over = b.word.offsetWidth - b.band.offsetWidth;   // 넘치는 폭
      var pp = 0.5 + (p - 0.5) * b.speed;                    // 레이어 속도 차 (중앙 기준)
      var x = -(over > 0 ? over : 0) * pp;
      if (b.dir < 0) x = -(over > 0 ? over : 0) * (1 - pp);
      b.word.style.transform = "translateX(" + x + "px)";
    });
    requestAnimationFrame(tick);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
