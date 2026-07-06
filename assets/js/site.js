/* USÉLESS SEOUL — 공통 스크립트 (내비 + reveal + 장바구니 + 회원/주문 UI)
   데이터 접근은 전부 window.Store 어댑터 경유 (assets/js/store.js — 현재 StoreSupabase 구현체).
   실결제 없음 — 무통장입금 mock. 가격은 전부 표시용. */

let PRODUCT_MAP = {}; // Store.getProducts() 캐시 (id → product)
const priceNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};
const won = (n) => "₩" + priceNumber(n).toLocaleString("ko-KR");
const CART_KEY = "useless_cart_v1";
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (ch) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[ch]));
const safeRelativeUrl = (v, fallback = "#") => {
  const s = String(v ?? "").trim();
  if (!s || /[\u0000-\u001F\u007F]/.test(s)) return fallback;
  const compact = s.replace(/\s/g, "").toLowerCase();
  if (/^[a-z][a-z0-9+.-]*:/i.test(s) || compact.startsWith("//")) return fallback;
  return s;
};

/* ---------- 장바구니 (클라이언트 상태 — 어댑터 교체와 무관하게 로컬 유지) ---------- */
function cartGet() {
  /* 손상 내성: JSON 깨짐·배열 아닌 값·id 없는 항목·비정상 qty(음수/문자/과대)를 전부 정규화 */
  let items;
  try { items = JSON.parse(localStorage.getItem(CART_KEY)); } catch { return []; }
  if (!Array.isArray(items)) return [];
  return items
    .filter((it) => it && typeof it === "object" && typeof it.id === "string")
    .map((it) => ({ id: it.id, qty: Math.min(Math.max(1, it.qty | 0), 99) }));
}
/* 제품 정본에 없는 id·비판매(coming_soon) 상품을 카트에서 제거 (라인업 변경·데이터 변조 자가 치유 — PRODUCT_MAP 로드 후 호출) */
function cartPrune() {
  const items = cartGet();
  const valid = items.filter((it) => PRODUCT_MAP[it.id] && PRODUCT_MAP[it.id].status === "on_sale");
  if (valid.length !== items.length) cartSave(valid);
}
function cartSave(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  cartBadge();
}
function cartAdd(id, qty = 1) {
  if (!PRODUCT_MAP[id] || PRODUCT_MAP[id].status !== "on_sale") return; // 출시 예정 상품은 담기 불가

  const items = cartGet();
  qty = Math.min(Math.max(1, qty | 0), 99);
  const hit = items.find((it) => it.id === id);
  if (hit) hit.qty = Math.min(hit.qty + qty, 99);
  else items.push({ id, qty });
  cartSave(items);
}
function cartSetQty(id, qty) {
  let items = cartGet();
  const hit = items.find((it) => it.id === id);
  if (!hit) return;
  hit.qty = qty;
  if (hit.qty < 1) items = items.filter((it) => it.id !== id);
  cartSave(items);
}
function cartRemove(id) { cartSave(cartGet().filter((it) => it.id !== id)); }
function cartClear() { cartSave([]); }
function cartTotal() { return cartGet().reduce((s, it) => s + priceNumber(PRODUCT_MAP[it.id]?.price) * it.qty, 0); }
function cartCount() { return cartGet().reduce((s, it) => s + it.qty, 0); }

/* ---------- 헤더: 카트 배지 + 로그인 상태 ---------- */
function cartBadge() {
  const n = cartCount();
  document.querySelectorAll("[data-cart-count]").forEach((el) => {
    el.textContent = n;
    el.classList.toggle("on", n > 0);
  });
}
async function renderAuthLink() {
  const el = document.getElementById("navAuth");
  if (!el) return;
  const user = await Store.currentUser();
  if (user) { el.textContent = "MY"; el.href = "mypage.html"; el.title = user.email; }
  else { el.textContent = "LOGIN"; el.href = "login.html"; el.removeAttribute("title"); }
}

/* ---------- 제품 카드 그리드 ([data-product-grid] — 정본은 Store.getProducts() 하나) ---------- */
function renderProductGrids(products) {
  document.querySelectorAll("[data-product-grid]").forEach((grid) => {
    grid.innerHTML = products.map((p, i) => {
      const onSale = p.status === "on_sale";
      const url = esc(safeRelativeUrl(p.url, "shop.html"));
      const img = esc(safeRelativeUrl(p.img, "assets/img/live/scene-tea.jpg"));
      return `
    <article class="product reveal">
      <a class="product__img" href="${url}"><img src="${img}" alt="${esc(p.alt)}" ${i === 0 ? 'fetchpriority="high"' : 'decoding="async"'} /></a>
      <div class="product__info">
        <p class="product__code">${esc(p.code)}</p>
        <h3 class="product__name"><a href="${url}">${esc(p.name)} <span>${esc(p.en)}</span></a></h3>
        <p class="product__hook">${esc(p.hook)}</p>
        <p class="product__notes">${esc(p.notes)}</p>
        <p class="product__spec">${esc(p.spec)}</p>
        <p class="product__price">${onSale ? `${won(p.price)} <span class="mock">표시용</span>` : `출시 예정 <span class="mock">COMING SOON</span>`}</p>
        ${onSale
          ? `<button type="button" class="product__add" data-add="${esc(p.id)}">장바구니 담기</button>`
          : `<button type="button" class="product__add" disabled aria-disabled="true">출시 예정</button>`}
      </div>
    </article>`;
    }).join("");
  });
}

/* ---------- 제품 상세 하이드레이션 ([data-product-page="id"])
   상세 4장의 정적 마크업은 no-JS/SEO 폴백 — 로드 후 Store 정본값으로 덮어쓴다.
   내일 StoreSupabase 전환 시 상세 페이지도 DB 값을 자동 추종. ---------- */
function hydrateProductPage() {
  const root = document.querySelector("[data-product-page]");
  if (!root) return;
  const p = PRODUCT_MAP[root.dataset.productPage];
  if (!p) return;
  const set = (key, val) => {
    const el = root.querySelector(`[data-pd="${key}"]`);
    if (el && val) el.textContent = val;
  };
  const onSale = p.status === "on_sale";
  set("code", p.code);
  set("name", p.name);
  set("en", p.en);
  set("hook", p.hook);
  set("spec", onSale ? p.spec + " · 블랙 리드 스틱 8가닥 포함" : p.spec);
  const priceEl = root.querySelector('[data-pd="price"]');
  if (priceEl) priceEl.innerHTML = onSale
    ? `${won(p.price)} <span class="mock">표시용</span>`
    : `출시 예정 <span class="mock">COMING SOON</span>`;
  if (!onSale) {
    /* 출시 예정 상품: 담기·바로구매 전부 비활성 (이 카드만 예외적으로 허용되는 비활성) */
    root.querySelectorAll("[data-add]").forEach((b) => {
      b.disabled = true; b.setAttribute("aria-disabled", "true");
      b.textContent = b.dataset.then === "checkout" ? "출시 예정 — COMING SOON" : "출시 예정";
      delete b.dataset.add;
    });
    const qty = root.querySelector('input[aria-label="수량"]');
    if (qty) qty.disabled = true;
  }
  const [top, mid, base] = p.notes.split("·").map((s) => s.trim());
  set("note-top", top);
  set("note-mid", mid);
  set("note-base", base);
  const img = root.querySelector(".pd__img img");
  if (img) { img.src = safeRelativeUrl(p.img, img.getAttribute("src") || "assets/img/live/scene-tea.jpg"); img.alt = p.alt; }
}

/* ---------- 담기 버튼 (data-add="id" [data-qty-from="#sel"]) ---------- */
function bindAddButtons() {
  document.querySelectorAll("[data-add]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const id = btn.dataset.add;
      const qtyEl = btn.dataset.qtyFrom ? document.querySelector(btn.dataset.qtyFrom) : null;
      const qty = qtyEl ? Math.max(1, parseInt(qtyEl.value, 10) || 1) : 1;
      cartAdd(id, qty);
      const orig = btn.textContent;
      btn.textContent = "담았습니다";
      btn.disabled = true;
      setTimeout(() => { btn.textContent = orig; btn.disabled = false; }, 900);
      if (btn.dataset.then === "checkout") location.href = "checkout.html";
      if (btn.dataset.then === "cart") location.href = "cart.html";
    });
  });
}

/* ---------- 폼 에러 표시 공통 ---------- */
function showErr(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg || "";
  el.hidden = !msg;
}

/* ---------- 장바구니 페이지 ---------- */
function renderCartPage() {
  const wrap = document.getElementById("cartList");
  if (!wrap) return;
  const items = cartGet();
  const empty = document.getElementById("cartEmpty");
  const box = document.getElementById("cartBox");
  if (!items.length) {
    empty.hidden = false; box.hidden = true;
    return;
  }
  empty.hidden = true; box.hidden = false;
  wrap.innerHTML = items.map((it) => {
    const p = PRODUCT_MAP[it.id];
    const url = esc(safeRelativeUrl(p.url, "shop.html"));
    const img = esc(safeRelativeUrl(p.img, "assets/img/live/scene-tea.jpg"));
    return `
    <div class="cart__row" data-row="${esc(it.id)}">
      <a class="cart__img" href="${url}"><img src="${img}" alt="${esc(p.name)}" /></a>
      <div class="cart__info">
        <p class="cart__code">${esc(p.code)}</p>
        <a class="cart__name" href="${url}">${esc(p.name)}</a>
        <p class="cart__spec">${esc(p.spec)}</p>
        <p class="cart__unit">${won(p.price)} <span class="mock">표시용</span></p>
      </div>
      <div class="cart__qty">
      <button type="button" data-dec="${esc(it.id)}" aria-label="수량 줄이기">−</button>
        <span>${it.qty}</span>
        <button type="button" data-inc="${esc(it.id)}" aria-label="수량 늘리기">+</button>
      </div>
      <p class="cart__sum">${won(priceNumber(p.price) * it.qty)}</p>
      <button type="button" class="cart__del" data-del="${esc(it.id)}" aria-label="삭제">삭제</button>
    </div>`;
  }).join("");
  document.getElementById("cartTotal").textContent = won(cartTotal());
  wrap.querySelectorAll("[data-inc]").forEach((b) => b.addEventListener("click", () => {
    const it = cartGet().find((x) => x.id === b.dataset.inc);
    if (!it) { renderCartPage(); return; }
    cartSetQty(b.dataset.inc, Math.min(it.qty + 1, 99)); renderCartPage();
  }));
  wrap.querySelectorAll("[data-dec]").forEach((b) => b.addEventListener("click", () => {
    const it = cartGet().find((x) => x.id === b.dataset.dec);
    if (!it) { renderCartPage(); return; }
    cartSetQty(b.dataset.dec, it.qty - 1); renderCartPage();
  }));
  wrap.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", () => {
    cartRemove(b.dataset.del); renderCartPage();
  }));
}

/* ---------- 체크아웃 (무통장입금 mock — 로그인 필요) ---------- */
async function renderCheckoutPage() {
  const list = document.getElementById("coItems");
  if (!list) return;
  const items = cartGet();
  if (!items.length) { location.replace("cart.html"); return; }

  const user = await Store.currentUser();
  if (!user) {
    document.getElementById("coMain").hidden = true;
    document.getElementById("coLogin").hidden = false;
    return;
  }
  const who = document.getElementById("coUser");
  if (who) who.textContent = `${user.name} (${user.email})`;

  list.innerHTML = items.map((it) => {
    const p = PRODUCT_MAP[it.id];
    return `<li><span>${esc(p.name)} × ${it.qty}</span><span>${won(priceNumber(p.price) * it.qty)}</span></li>`;
  }).join("");
  document.getElementById("coTotal").textContent = won(cartTotal());

  document.getElementById("coForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    showErr("coErr", "");
    const receiver = document.getElementById("coName").value.trim();
    const phone = document.getElementById("coPhone").value.trim();
    const addr = document.getElementById("coAddr").value.trim();
    if (!receiver) { showErr("coErr", "받는 분 이름을 입력해 주세요."); document.getElementById("coName").focus(); return; }
    if (!/^0\d{1,2}-?\d{3,4}-?\d{4}$/.test(phone)) { showErr("coErr", "연락처 형식을 확인해 주세요. 예: 010-0000-0000"); document.getElementById("coPhone").focus(); return; }
    if (!addr) { showErr("coErr", "배송지 주소를 입력해 주세요."); document.getElementById("coAddr").focus(); return; }
    try {
      const order = await Store.createOrder({
        items: cartGet(),
        receiver, phone, addr,
        memo: document.getElementById("coMemo").value,
      });
      cartClear();
      document.getElementById("doneName").textContent = order.receiver;
      document.getElementById("doneOrderId").textContent = order.orderId;
      document.getElementById("doneTotal").textContent = won(order.total);
      document.getElementById("coMain").hidden = true;
      document.getElementById("coDone").hidden = false;
      scrollTo({ top: 0 });
    } catch (err) { showErr("coErr", err.message); }
  });
}

/* ---------- 회원가입 / 로그인 ---------- */
function bindSignupPage() {
  const form = document.getElementById("signupForm");
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    showErr("authErr", "");
    const pw = document.getElementById("suPw").value;
    if (pw !== document.getElementById("suPw2").value) { showErr("authErr", "비밀번호가 서로 다릅니다."); return; }
    try {
      const result = await Store.signUp({
        email: document.getElementById("suEmail").value,
        password: pw,
        name: document.getElementById("suName").value,
      });
      if (result && result.emailConfirmationRequired) {
        showErr("authErr", "확인 메일을 보냈습니다. 이메일 인증 후 로그인해 주세요.");
        return;
      }
      location.href = "mypage.html";
    } catch (err) { showErr("authErr", err.message); }
  });
}
function bindLoginPage() {
  const form = document.getElementById("loginForm");
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    showErr("authErr", "");
    try {
      await Store.signIn({
        email: document.getElementById("liEmail").value,
        password: document.getElementById("liPw").value,
      });
      const back = new URLSearchParams(location.search).get("back");
      location.href = back === "checkout" ? "checkout.html" : "mypage.html";
    } catch (err) { showErr("authErr", err.message); }
  });
}

/* ---------- 마이페이지 (주문조회) ---------- */
async function renderMyPage() {
  const wrap = document.getElementById("myOrders");
  if (!wrap) return;
  const user = await Store.currentUser();
  if (!user) { location.replace("login.html"); return; }
  document.getElementById("myWho").textContent = `${user.name} · ${user.email}`;
  document.getElementById("myLogout").addEventListener("click", async () => {
    await Store.signOut();
    location.href = "index.html";
  });
  const orders = await Store.myOrders();
  if (!orders.length) {
    wrap.innerHTML = `<p class="order__empty">주문 내역이 없습니다. <a href="shop.html">SHOP 보러 가기 →</a></p>`;
    return;
  }
  /* 손상 내성: 필드 누락 주문 레코드도 렌더가 안 죽게 폴백 */
  wrap.innerHTML = orders.map((o) => {
    const statusKey = Store.ORDER_STATUS[o.status] ? o.status : "unknown";
    return `
    <article class="order">
      <header class="order__head">
        <p class="order__id">${esc(o.orderId || "?")}</p>
        <p class="order__date">${esc(String(o.createdAt || "").slice(0, 10))}</p>
        <p class="order__status st-${statusKey}">${esc(Store.ORDER_STATUS[o.status] || o.status || "?")}</p>
      </header>
      <ul class="order__items">
        ${(Array.isArray(o.items) ? o.items : []).map((it) => `<li><span>${esc(it.name)} × ${esc(it.qty)}</span><span>${won((+it.price || 0) * (+it.qty || 0))}</span></li>`).join("")}
      </ul>
      <p class="order__total"><span>합계</span><span>${won(+o.total || 0)}</span></p>
      ${o.status === "awaiting_payment" ? `<p class="order__deposit">무통장입금 대기 — 입금 계좌: 우리은행 1002-454-250728 예금주 백승준 · 입금 확인 후 배송이 시작됩니다.</p>` : ""}
    </article>`;
  }).join("");
}

/* ---------- 관리자 (Supabase/RLS 기준 — URL 직접 진입 전용) ---------- */
async function renderAdminPage() {
  const wrap = document.getElementById("adminOrders");
  if (!wrap) return;
  const orders = await Store.listOrders();
  document.getElementById("adminCount").textContent = orders.length;
  if (!orders.length) {
    wrap.innerHTML = `<p class="order__empty">주문이 없습니다.</p>`;
    return;
  }
  const STATUSES = Object.keys(Store.ORDER_STATUS);
  /* 손상 내성: 필드 누락 주문 레코드도 렌더가 안 죽게 폴백 (mypage와 동일 원칙) */
  wrap.innerHTML = orders.map((o) => {
    const oid = String(o.orderId || "");
    const statusKey = Store.ORDER_STATUS[o.status] ? o.status : "unknown";
    return `
    <article class="order order--admin" data-oid="${esc(oid)}">
      <header class="order__head">
        <p class="order__id">${esc(o.orderId || "?")}</p>
        <p class="order__date">${esc(String(o.createdAt || "").slice(0, 16).replace("T", " "))}</p>
        <p class="order__status st-${statusKey}">${esc(Store.ORDER_STATUS[o.status] || o.status || "?")}</p>
      </header>
      <p class="order__meta">${esc(o.receiver || "?")} · ${esc(o.phone || "?")} · ${esc(o.addr || "?")}${o.memo ? " · 메모: " + esc(o.memo) : ""} · <span>${esc(o.userEmail || "?")}</span></p>
      <ul class="order__items">
        ${(Array.isArray(o.items) ? o.items : []).map((it) => `<li><span>${esc(it.name)} × ${esc(it.qty)}</span><span>${won((+it.price || 0) * (+it.qty || 0))}</span></li>`).join("")}
      </ul>
      <p class="order__total"><span>합계</span><span>${won(+o.total || 0)}</span></p>
      <div class="order__actions">
        <select data-status="${esc(oid)}" aria-label="주문 상태 변경">
          ${STATUSES.map((s) => `<option value="${s}" ${s === o.status ? "selected" : ""}>${Store.ORDER_STATUS[s]}</option>`).join("")}
        </select>
        <button type="button" class="btn" data-apply="${esc(oid)}">상태 변경</button>
      </div>
    </article>`;
  }).join("");
  wrap.querySelectorAll("[data-apply]").forEach((b) => b.addEventListener("click", async () => {
    const oid = b.dataset.apply;
    const sel = b.closest("[data-oid]")?.querySelector("[data-status]");
    if (!sel) return;
    await Store.updateOrderStatus(oid, sel.value);
    renderAdminPage();
  }));
}

/* ---------- 공통 초기화 ---------- */
document.addEventListener("DOMContentLoaded", async () => {
  // 제품 로드 + 카드 그리드 렌더를 reveal 관찰보다 먼저 — 렌더된 카드도 IO에 잡히게
  const products = await Store.getProducts();
  PRODUCT_MAP = Object.fromEntries(products.map((p) => [p.id, p]));
  cartPrune(); // 정본에 없는 상품 id 제거 — 이후 렌더는 전부 유효 항목만 본다
  renderProductGrids(products);
  hydrateProductPage();

  // 클린 커머스 방향: 콘텐츠는 즉시 보이게 둔다. 스크롤 연출은 제거해 full-page 캡처·느린 환경에서도 빈 섹션이 생기지 않게 한다.
  document.querySelectorAll(".reveal").forEach((el) => el.classList.add("in"));

  const nav = document.getElementById("nav");
  if (nav) addEventListener("scroll", () => nav.classList.toggle("solid", scrollY > 40), { passive: true });

  const navToggle = document.getElementById("navToggle");
  if (navToggle) document.querySelectorAll("#navMenu a").forEach((a) =>
    a.addEventListener("click", () => { navToggle.checked = false; }));

  cartBadge();
  renderAuthLink();
  bindAddButtons();
  renderCartPage();
  renderCheckoutPage();
  bindSignupPage();
  bindLoginPage();
  renderMyPage();
  renderAdminPage();
});
