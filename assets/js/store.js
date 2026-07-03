/* USÉLESS SEOUL — 데이터 어댑터 (Store)
   페이지 코드는 반드시 window.Store 인터페이스만 호출한다. 구현을 알면 안 된다.
   오늘: StoreLocal (localStorage 구현체).
   내일: 같은 인터페이스의 StoreSupabase로 이 파일만 교체 (Supabase Auth + DB).
   그래서 모든 메서드는 localStorage여도 전부 async(Promise)다.

   인터페이스:
     getProducts() / getProduct(id)
     signUp({email,password,name}) / signIn({email,password}) / signOut() / currentUser()
     createOrder({items,receiver,phone,addr,memo}) / myOrders()
     (admin) listOrders() / updateOrderStatus(orderId, status)

   ⚠️ 전 데이터 mock — 실결제·실배송 없음. 가격은 표시용.
*/
window.Store = (() => {
  /* ---------- 제품 정본 (가격 mock — 정본: 20_active_ops/_디퓨저_현재정본.md) ---------- */
  const PRODUCTS = [
    { id: "hangang", name: "여름밤 한강", en: "Hangang Summer Night", code: "S-500-HG", price: 68000,
      hook: "막차를 보내고 남은 밤의 향.", notes: "레몬필 · 강바람 워터리 · 화이트 머스크",
      spec: "스모크블랙 원통 · 500ml", img: "assets/img/hangang.jpg", alt: "여름밤 한강 — 스모크블랙 원통 500ml", url: "product-hangang.html" },
    { id: "hotel",   name: "호텔 블랭킷", en: "Hotel Blanket",        code: "S-500-HB", price: 68000,
      hook: "체크아웃 사십 분 전, 이불 속.", notes: "알데하이드 클린 · 화이트 코튼 · 소프트 시더",
      spec: "다크브라운 원통 · 500ml", img: "assets/img/hotel.jpg",   alt: "호텔 블랭킷 — 다크브라운 원통 500ml", url: "product-hotel.html" },
    { id: "seongsu", name: "성수 무화과", en: "Seongsu Fig",          code: "S-200-SF", price: 42000,
      hook: "잘못 든 골목에서 만난 오후.", notes: "그린 피그 리프 · 크리미 무화과 · 화이트 머스크",
      spec: "약병형 · 200ml",          img: "assets/img/seongsu.jpg", alt: "성수 무화과 — 약병형 200ml", url: "product-seongsu.html" },
    { id: "tea",     name: "애프터눈 티", en: "Afternoon Tea",        code: "S-200-AT", price: 42000,
      hook: "할 일을 미룬 채 우린 홍차.", notes: "베르가못 · 홍차 · 머스크",
      spec: "투명 위스키병형 · 200ml", img: "assets/img/tea.jpg",     alt: "애프터눈 티 — 투명 위스키병형 200ml", url: "product-tea.html" },
  ];

  const USERS_KEY = "useless_users_v1";
  const SESSION_KEY = "useless_session_v1";
  const ORDERS_KEY = "useless_orders_v1";

  /* 주문 상태 흐름 (무통장입금): awaiting_deposit → deposit_confirmed → shipping → delivered / cancelled */
  const ORDER_STATUS = {
    awaiting_deposit: "입금 대기",
    deposit_confirmed: "입금 확인",
    shipping: "배송 중",
    delivered: "배송 완료",
    cancelled: "취소됨",
  };

  /* 손상 내성: JSON 깨짐·배열 아닌 값(객체/숫자/문자열)이 저장돼 있어도 빈 배열로 폴백 */
  const read = (k) => { try { const v = JSON.parse(localStorage.getItem(k)); return Array.isArray(v) ? v : []; } catch { return []; } };
  const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));

  /* 비밀번호: 평문 저장 금지 — SHA-256 해시 흉내(솔트 포함).
     내일 Supabase Auth가 이 자리를 통째로 대체한다. 이건 보안 구현이 아니라 자리 표시. */
  async function hash(pw, salt) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(salt + "::" + pw));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  const normEmail = (e) => String(e || "").trim().toLowerCase();

  /* ---------- 제품 ---------- */
  async function getProducts() { return PRODUCTS.map((p) => ({ ...p })); }
  async function getProduct(id) { const p = PRODUCTS.find((x) => x.id === id); return p ? { ...p } : null; }

  /* ---------- 회원 ---------- */
  async function signUp({ email, password, name }) {
    email = normEmail(email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("이메일 형식을 확인해 주세요.");
    if (!password || password.length < 8) throw new Error("비밀번호는 8자 이상이어야 합니다.");
    if (!name || !name.trim()) throw new Error("이름을 입력해 주세요.");
    const users = read(USERS_KEY);
    if (users.some((u) => u.email === email)) throw new Error("이미 가입된 이메일입니다.");
    const salt = Math.random().toString(36).slice(2, 10);
    users.push({ email, name: name.trim(), salt, pwHash: await hash(password, salt), createdAt: new Date().toISOString() });
    save(USERS_KEY, users);
    save(SESSION_KEY, { email });
    return { email, name: name.trim() };
  }

  async function signIn({ email, password }) {
    email = normEmail(email);
    const u = read(USERS_KEY).find((x) => x.email === email);
    if (!u || (await hash(password, u.salt)) !== u.pwHash) throw new Error("이메일 또는 비밀번호가 맞지 않습니다.");
    save(SESSION_KEY, { email });
    return { email: u.email, name: u.name };
  }

  async function signOut() { localStorage.removeItem(SESSION_KEY); }

  async function currentUser() {
    let s; try { s = JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { s = null; }
    if (!s || !s.email) return null;
    const u = read(USERS_KEY).find((x) => x.email === s.email);
    return u ? { email: u.email, name: u.name } : null;
  }

  /* ---------- 주문 (무통장입금 mock) ---------- */
  async function createOrder({ items, receiver, phone, addr, memo }) {
    const user = await currentUser();
    if (!user) throw new Error("로그인이 필요합니다.");
    if (!items || !items.length) throw new Error("주문할 상품이 없습니다.");
    if (!receiver || !phone || !addr) throw new Error("수령인·연락처·주소를 입력해 주세요.");
    let total = 0;
    const lines = [];
    for (const it of items) {
      const p = PRODUCTS.find((x) => x.id === it.id);
      if (!p) continue;
      const qty = Math.min(Math.max(1, it.qty | 0), 99);
      total += p.price * qty;
      lines.push({ id: p.id, name: p.name, code: p.code, price: p.price, qty });
    }
    if (!lines.length) throw new Error("주문할 상품이 없습니다.");
    const orders = read(ORDERS_KEY);
    const order = {
      orderId: "US" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase(),
      userEmail: user.email,
      items: lines,
      total,
      receiver: receiver.trim(), phone: phone.trim(), addr: addr.trim(), memo: (memo || "").trim(),
      status: "awaiting_deposit",
      createdAt: new Date().toISOString(),
    };
    orders.unshift(order);
    save(ORDERS_KEY, orders);
    return { ...order };
  }

  async function myOrders() {
    const user = await currentUser();
    if (!user) return [];
    return read(ORDERS_KEY).filter((o) => o.userEmail === user.email).map((o) => ({ ...o }));
  }

  /* ---------- 관리자 (지금은 로컬 데이터 — 접근은 admin.html URL 직접 진입만) ---------- */
  async function listOrders() { return read(ORDERS_KEY).map((o) => ({ ...o })); }

  async function updateOrderStatus(orderId, status) {
    if (!ORDER_STATUS[status]) throw new Error("알 수 없는 주문 상태: " + status);
    const orders = read(ORDERS_KEY);
    const o = orders.find((x) => x.orderId === orderId);
    if (!o) throw new Error("주문을 찾을 수 없습니다: " + orderId);
    o.status = status;
    save(ORDERS_KEY, orders);
    return { ...o };
  }

  return { getProducts, getProduct, signUp, signIn, signOut, currentUser, createOrder, myOrders, listOrders, updateOrderStatus, ORDER_STATUS };
})();
