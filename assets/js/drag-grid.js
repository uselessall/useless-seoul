/* USÉLESS SEOUL — 무한 드래그 그리드 월 (mozmene.com 문법)
   패턴 블록(6x4 타일)을 2x2 복제한 plane을 드래그 — offset을 블록 크기로
   모듈로 랩해서 무한처럼 보이게. 관성 포함. reduced-motion이면 정적 그리드. */
(function () {
  "use strict";
  var wall = document.querySelector("[data-wall]");
  if (!wall) return;

  /* 타일 정의 — 6열 x 4행 패턴 블록 */
  var TILES = [
    { t: "img", src: "assets/img/live/product-hotel.jpg",   label: "호텔 블랭킷",  href: "product-hotel.html" },
    { t: "img", src: "assets/img/live/bottle-bk01.jpg", label: "BK01 — 시계 라벨", href: "story.html" },
    { t: "img", src: "assets/img/live/scene-hangang.jpg",   label: "여름밤 한강",  href: "product-hangang.html" },
    { t: "teaser", name: "첫눈", en: "First Snow" },
    { t: "img", src: "assets/img/live/product-seongsu.jpg", label: "성수 무화과",  href: "product-seongsu.html" },
    { t: "nav", text: "SHOP →", href: "shop.html" },

    { t: "teaser", name: "새벽 택시", en: "Dawn Taxi" },
    { t: "img", src: "assets/img/live/scene-hotel.jpg",     label: "체크인 그 순간", href: "product-hotel.html" },
    { t: "typo", text: "SEOUL," },
    { t: "img", src: "assets/img/live/product-hangang.jpg", label: "여름밤 한강",  href: "product-hangang.html" },
    { t: "teaser", name: "을지로 밤", en: "Euljiro Night" },
    { t: "img", src: "assets/img/live/scene-tea.jpg",       label: "애프터눈 티",  href: "product-tea.html" },

    { t: "img", src: "assets/img/live/scene-seongsu.jpg",   label: "성수동 골목",  href: "product-seongsu.html" },
    { t: "teaser", name: "볕 든 북촌", en: "Bukchon Light" },
    { t: "img", src: "assets/img/live/product-hotel.jpg",   label: "호텔 블랭킷",  href: "product-hotel.html" },
    { t: "typo", text: "BOTTLED." },
    { t: "img", src: "assets/img/live/scene-hangang.jpg",   label: "밤 10시 벤치", href: "product-hangang.html" },
    { t: "nav", text: "STORY →", href: "story.html" },

    { t: "teaser", name: "남산 숲길", en: "Namsan Green" },
    { t: "img", src: "assets/img/live/product-seongsu.jpg", label: "성수 무화과",  href: "product-seongsu.html" },
    { t: "typo", text: "쓸모없어도 괜찮아" },
    { t: "img", src: "assets/img/live/scene-tea.jpg",       label: "미뤄둔 오후",  href: "product-tea.html" },
    { t: "teaser", name: "서울 애프터", en: "Seoul After" },
    { t: "img", src: "assets/img/live/scene-hotel.jpg",     label: "아침의 침구",  href: "product-hotel.html" },
  ];
  var COLS = 6, ROWS = 4;

  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var CELL = window.innerWidth < 700 ? 190 : 270;
  var GAP = 14;
  var STEP = CELL + GAP;
  var BW = COLS * STEP, BH = ROWS * STEP;

  function makeTile(def, bx, by) {
    var el;
    if (def.t === "img") {
      el = document.createElement("a");
      el.href = def.href;
      el.className = "wt wt--img";
      el.innerHTML = '<img src="' + def.src + '" alt="" loading="lazy" draggable="false" /><span class="wt__label">' + def.label + "</span>";
    } else if (def.t === "teaser") {
      el = document.createElement("div");
      el.className = "wt wt--teaser";
      el.innerHTML = '<span class="wt__tname">' + def.name + '</span><span class="wt__ten">' + def.en + '</span><span class="wt__soon">COMING</span>';
    } else if (def.t === "typo") {
      el = document.createElement("div");
      el.className = "wt wt--typo";
      el.innerHTML = "<span>" + def.text + "</span>";
    } else {
      el = document.createElement("a");
      el.href = def.href;
      el.className = "wt wt--nav";
      el.innerHTML = "<span>" + def.text + "</span>";
    }
    el.style.left = bx + "px";
    el.style.top = by + "px";
    el.style.width = CELL + "px";
    el.style.height = CELL + "px";
    return el;
  }

  if (reduced) {
    wall.classList.add("wall--static");
    var frag = document.createDocumentFragment();
    TILES.forEach(function (def, i) {
      frag.appendChild(makeTile(def, (i % COLS) * STEP, Math.floor(i / COLS) * STEP));
    });
    wall.appendChild(frag);
    return;
  }

  var plane = document.createElement("div");
  plane.className = "wall__plane";
  plane.style.width = BW * 2 + "px";
  plane.style.height = BH * 2 + "px";
  /* 2x2 블록 복제 */
  for (var ry = 0; ry < 2; ry++) {
    for (var rx = 0; rx < 2; rx++) {
      TILES.forEach(function (def, i) {
        plane.appendChild(makeTile(def, rx * BW + (i % COLS) * STEP, ry * BH + Math.floor(i / COLS) * STEP));
      });
    }
  }
  wall.appendChild(plane);

  /* 드래그 + 관성 + 모듈로 랩 */
  var ox = -BW / 2, oy = -BH / 2, vx = 0, vy = 0;
  var dragging = false, lx = 0, ly = 0, moved = 0;

  function mod(n, m) { return ((n % m) + m) % m; }
  function render() {
    var x = -mod(-ox, BW), y = -mod(-oy, BH);
    plane.style.transform = "translate3d(" + x + "px," + y + "px,0)";
  }

  wall.addEventListener("pointerdown", function (e) {
    dragging = true; moved = 0; lx = e.clientX; ly = e.clientY;
    vx = 0; vy = 0;
    wall.classList.add("wall--grab");
    wall.setPointerCapture(e.pointerId);
  });
  wall.addEventListener("pointermove", function (e) {
    if (!dragging) return;
    var dx = e.clientX - lx, dy = e.clientY - ly;
    lx = e.clientX; ly = e.clientY;
    ox += dx; oy += dy;
    vx = dx; vy = dy;
    moved += Math.abs(dx) + Math.abs(dy);
    render();
  });
  function up() { dragging = false; wall.classList.remove("wall--grab"); }
  wall.addEventListener("pointerup", up);
  wall.addEventListener("pointercancel", up);
  /* 드래그였으면 클릭 무효 (링크 오발 방지) */
  wall.addEventListener("click", function (e) {
    if (moved > 6) { e.preventDefault(); e.stopPropagation(); }
  }, true);
  /* 휠로도 탐색 */
  wall.addEventListener("wheel", function (e) {
    e.preventDefault();
    ox -= e.deltaX; oy -= e.deltaY;
    render();
  }, { passive: false });

  (function tick() {
    if (!dragging && (Math.abs(vx) > 0.1 || Math.abs(vy) > 0.1)) {
      ox += vx; oy += vy;
      vx *= 0.94; vy *= 0.94;
      render();
    }
    requestAnimationFrame(tick);
  })();
  render();
})();
