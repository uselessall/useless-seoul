/* USÉLESS SEOUL — 데이터 어댑터 (Store) · StoreSupabase (2026-07-05 실백엔드 전환)
   페이지 코드는 반드시 window.Store 인터페이스만 호출한다. 구현을 알면 안 된다.
   백엔드: Supabase (프로젝트 nkqrqbptuvbuihnzfgco). Auth = 회원가입/로그인, DB = 주문.
   anon 키는 공개용(RLS로 보호) — 프론트 노출 정상. service_role 키는 절대 넣지 않는다.

   인터페이스(전부 async):
     getProducts() / getProduct(id)
     signUp({email,password,name}) / signIn({email,password}) / signOut() / currentUser()
     createOrder({items,receiver,phone,addr,memo}) / myOrders()
     (admin) listOrders() / updateOrderStatus(orderId, status)

   제품은 정본 하드코딩(프론트 표시 필드가 풍부해 DB보다 유지 쉬움). 주문 FK는 DB products.id(hotel/seongsu/hangang/tea)와 일치.
   결제 = 무통장입금(우리은행 1002-454-250728 백승준). 실 PG 없음.
*/
(function () {
  const SUPABASE_URL = "https://nkqrqbptuvbuihnzfgco.supabase.co";
  const SUPABASE_ANON = "sb_publishable_ma_7bfX57VDoFuD_wnSk7w_FE77YwGp";

  const PRODUCTS = [
    { id: "hotel",   name: "호텔 블랭킷", en: "Hotel Blanket",        code: "UL-D01", price: 35000, status: "on_sale",
      hook: "체크인 직후, 침구에 스민 그 냄새.", notes: "클린 · 라벤더 · 머스크",
      spec: "끌로에 투명 유리 · 200ml", img: "assets/img/live/product-hotel.jpg",   alt: "호텔 블랭킷 — 리드 디퓨저 200ml", url: "product-hotel.html" },
    { id: "seongsu", name: "성수 무화과", en: "Seongsu Fig",          code: "UL-D02", price: 35000, status: "on_sale",
      hook: "성수동 카페 골목, 우드 베이스 과육향.", notes: "과육 · 우디 · 앰버",
      spec: "끌로에 투명 유리 · 200ml", img: "assets/img/live/product-seongsu.jpg", alt: "성수 무화과 — 리드 디퓨저 200ml", url: "product-seongsu.html" },
    { id: "hangang", name: "여름밤 한강", en: "Hangang Summer Night", code: "UL-D03", price: 35000, status: "on_sale",
      hook: "밤 10시 한강 벤치, 선선한 잔향.", notes: "우디 · 머스크 · 아쿠아",
      spec: "끌로에 투명 유리 · 200ml", img: "assets/img/live/product-hangang.jpg", alt: "여름밤 한강 — 리드 디퓨저 200ml", url: "product-hangang.html" },
    { id: "tea",     name: "애프터눈 티", en: "Afternoon Tea",        code: "COMING SOON", price: null, status: "coming_soon",
      hook: "할 일을 미룬 채 우린 홍차.", notes: "베르가못 · 홍차 · 머스크",
      spec: "출시 예정", img: "assets/img/live/scene-tea.jpg",     alt: "애프터눈 티 — 출시 예정", url: "product-tea.html" },
  ];

  /* DB status ↔ 한글 라벨. DB check: awaiting_payment/paid/done */
  const ORDER_STATUS = {
    awaiting_payment: "입금 대기",
    paid: "입금 확인",
    done: "배송 완료",
  };

  const normEmail = (e) => String(e || "").trim().toLowerCase();

  /* Supabase JS는 각 active HTML에서 store.js보다 먼저 CDN 로드(supabase-js@2). 없으면 명확히 알림. */
  function hasSupabase() {
    return !!(window.supabase && window.supabase.createClient);
  }

  function sb() {
    if (!hasSupabase()) {
      throw new Error("Supabase 라이브러리 로드 실패 — 페이지에 supabase-js CDN이 있어야 합니다.");
    }
    if (!window.__sbClient) {
      window.__sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
        auth: { persistSession: true, autoRefreshToken: true, storageKey: "useless_sb_auth" },
      });
    }
    return window.__sbClient;
  }

  async function getProducts() { return PRODUCTS.map((p) => ({ ...p })); }
  async function getProduct(id) { const p = PRODUCTS.find((x) => x.id === id); return p ? { ...p } : null; }

  /* ---------- 회원 (Supabase Auth) ---------- */
  async function signUp({ email, password, name }) {
    email = normEmail(email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("이메일 형식을 확인해 주세요.");
    if (!password || password.length < 8) throw new Error("비밀번호는 8자 이상이어야 합니다.");
    if (!name || !name.trim()) throw new Error("이름을 입력해 주세요.");
    const { data, error } = await sb().auth.signUp({
      email, password, options: { data: { name: name.trim() } },
    });
    if (error) throw new Error(error.message);
    const uid = data.user && data.user.id;
    if (uid) {
      await sb().from("useless_profiles").upsert({ id: uid, email, name: name.trim() });
    }
    return { email, name: name.trim(), emailConfirmationRequired: !data.session };
  }

  async function signIn({ email, password }) {
    const { data, error } = await sb().auth.signInWithPassword({ email: normEmail(email), password });
    if (error) throw new Error("이메일 또는 비밀번호가 맞지 않습니다.");
    const u = data.user;
    return { email: u.email, name: (u.user_metadata && u.user_metadata.name) || u.email };
  }

  async function signOut() { if (hasSupabase()) await sb().auth.signOut(); }

  async function currentUser() {
    if (!hasSupabase()) return null;
    const { data } = await sb().auth.getUser();
    const u = data && data.user;
    if (!u) return null;
    return { id: u.id, email: u.email, name: (u.user_metadata && u.user_metadata.name) || u.email };
  }

  /* ---------- 주문 (무통장입금, Supabase DB) ---------- */
  async function createOrder({ items, receiver, phone, addr, memo }) {
    const user = await currentUser();
    if (!user) throw new Error("로그인이 필요합니다.");
    if (!items || !items.length) throw new Error("주문할 상품이 없습니다.");
    receiver = String(receiver || "").trim();
    phone = String(phone || "").trim();
    addr = String(addr || "").trim();
    if (!receiver || !phone || !addr) throw new Error("수령인·연락처·주소를 입력해 주세요.");
    if (!/^0\d{1,2}-?\d{3,4}-?\d{4}$/.test(phone)) throw new Error("연락처 형식이 올바르지 않습니다. 예: 010-0000-0000");

    let total = 0;
    const lines = [];
    for (const it of items) {
      const p = PRODUCTS.find((x) => x.id === it.id);
      if (!p || p.status !== "on_sale") continue;
      const qty = Math.min(Math.max(1, it.qty | 0), 99);
      total += p.price * qty;
      lines.push({ product_id: p.id, product_name: p.name, price_krw: p.price, qty });
    }
    if (!lines.length) throw new Error("주문할 상품이 없습니다.");

    const { data: order, error } = await sb().from("useless_orders").insert({
      user_id: user.id, receiver, phone, addr, memo: (memo || "").trim(),
      total_krw: total, pay_method: "bank_transfer", status: "awaiting_payment",
    }).select().single();
    if (error) throw new Error("주문 생성 실패: " + error.message);

    const itemsRows = lines.map((l) => ({ order_id: order.id, ...l }));
    const { error: itErr } = await sb().from("useless_order_items").insert(itemsRows);
    if (itErr) throw new Error("주문 항목 저장 실패: " + itErr.message);

    return {
      orderId: order.order_no, id: order.id, total: order.total_krw,
      receiver, phone, addr, memo: order.memo, status: order.status,
      items: lines.map((l) => ({ id: l.product_id, name: l.product_name, price: l.price_krw, qty: l.qty })),
      createdAt: order.created_at,
      bankInfo: { bank: "우리은행", account: "1002-454-250728", holder: "백승준" },
    };
  }

  async function myOrders() {
    const user = await currentUser();
    if (!user) return [];
    const { data, error } = await sb().from("useless_orders")
      .select("id,order_no,receiver,phone,addr,memo,total_krw,status,created_at,useless_order_items(product_id,product_name,price_krw,qty)")
      .order("created_at", { ascending: false });
    if (error) return [];
    return (data || []).map((o) => ({
      orderId: o.order_no, id: o.id, total: o.total_krw, status: o.status,
      receiver: o.receiver, phone: o.phone, addr: o.addr, memo: o.memo, createdAt: o.created_at,
      items: (o.useless_order_items || []).map((l) => ({ id: l.product_id, name: l.product_name, price: l.price_krw, qty: l.qty })),
    }));
  }

  /* ---------- 관리자 ----------
     주의: anon+RLS에선 남의 주문 못 봄. admin.html 전체 조회는 관리자 로그인(useless_orders에 admin 정책 추가) 또는
     별도 관리자 페이지에서 처리 예정. 지금은 본인 주문만 반환(RLS 준수). 전체 관리 = 후속 gate. */
  async function listOrders() { return myOrders(); }
  async function updateOrderStatus(orderId, status) {
    if (!ORDER_STATUS[status]) throw new Error("알 수 없는 주문 상태: " + status);
    const { data, error } = await sb().from("useless_orders")
      .update({ status }).eq("order_no", orderId).select().single();
    if (error) throw new Error("상태 변경 실패(권한 확인): " + error.message);
    return { orderId: data.order_no, status: data.status };
  }

  window.Store = { getProducts, getProduct, signUp, signIn, signOut, currentUser, createOrder, myOrders, listOrders, updateOrderStatus, ORDER_STATUS };
})();
