/* USÉLESS SEOUL — 데이터 어댑터 (Store) · StoreSupabase (2026-07-05 실백엔드 전환)
   페이지 코드는 반드시 window.Store 인터페이스만 호출한다. 구현을 알면 안 된다.
   백엔드: Supabase (프로젝트 nkqrqbptuvbuihnzfgco). Auth = 회원가입/로그인, DB = 주문.
   anon 키는 공개용(RLS로 보호) — 프론트 노출 정상. service_role 키는 절대 넣지 않는다.

   인터페이스(전부 async):
     getProducts() / getProduct(id)
     signUp({email,password,name}) / signIn({email,password}) / signOut() / currentUser()
     createOrder({items,receiver,phone,addr,memo}) / myOrders()
     (admin) listOrders() / updateOrderStatus(orderId, status)

   제품은 정본 하드코딩(프론트 표시 필드가 풍부해 DB보다 유지 쉬움).
   신규 SHOP 목업 id는 DB products 행 동기화 전까지 주문 FK 확인필요.
   판매 준비용 주문 저장. 실 PG 및 입금 안내 없음.
*/
(function () {
  const SUPABASE_URL = "https://nkqrqbptuvbuihnzfgco.supabase.co";
  const SUPABASE_ANON = "sb_publishable_ma_7bfX57VDoFuD_wnSk7w_FE77YwGp";

  const PRODUCTS = [
    { id: "seongsu", brand: "useless", brandLabel: "USÉLESS SEOUL", name: "성수 무화과", en: "Seongsu Fig",          code: "UL-D02", price: 35000, status: "on_sale",
      hook: "늦은 오후의 성수, 초록 무화과와 따뜻한 우드.", notes: "Fig · Plum · Fig Pulp · Hinoki · Cypress · Cedarwood · Sandalwood",
      notePyramid: ["Fig · Plum", "Fig Pulp · Hinoki · Cypress", "Cedarwood · Sandalwood"],
      spec: "그랜드라운드 200ml × 2병 세트", img: "assets/img/detail-useless/hero-interior-labeled-v2.webp", alt: "성수 무화과 — 그랜드라운드 리드 디퓨저 200ml", url: "product-seongsu.html" },
    { id: "hotel",   brand: "useless", brandLabel: "USÉLESS SEOUL", name: "호텔 블랭킷", en: "Hotel Blanket",        code: "UL-D01", price: 68000, status: "on_sale",
      hook: "체크인 직후, 침구에 스민 그 냄새.", notes: "클린 · 라벤더 · 머스크",
      spec: "500ml × 2병 세트", img: "assets/img/canon/hotel-blanket-studio-20260906.webp",   alt: "호텔 블랭킷 — 컬러 스튜디오 보틀 콘셉트 이미지", url: "product-hotel.html" },
    { id: "seoul-forest", brand: "useless", brandLabel: "USÉLESS SEOUL", name: "서울숲의 아침", en: "Seoul Forest Morning", code: "UL-D03", price: 68000, status: "on_sale",
      hook: "이른 산책 뒤에 남는 젖은 잎과 깨끗한 나무의 숨.",
      notes: "Green Leaf · Morning Air · Hinoki · Cedarwood · Soft Musk",
      notePyramid: ["Green Leaf · Morning Air", "Hinoki · Cedarwood", "Soft Musk"],
      spec: "500ml × 2병 세트", img: "assets/img/canon/seoul-forest-studio-20260906.webp", alt: "서울숲의 아침 — 초록 잎과 아침빛을 담은 보틀 콘셉트 이미지", url: "product-seoul-forest.html" },
    { id: "seokchon-cherrywood", brand: "useless", brandLabel: "USÉLESS SEOUL", name: "석촌 체리우드", en: "Seokchon Cherrywood", code: "UL-D04", price: 68000, status: "on_sale",
      hook: "호수 가장자리의 체리 톤과 마른 우드가 겹치는 오후.",
      notes: "Cherry · Rose Petal · Cedarwood · Sandalwood · Musk",
      notePyramid: ["Cherry · Rose Petal", "Cedarwood · Sandalwood", "Musk"],
      spec: "500ml × 2병 세트", img: "assets/img/canon/cherrywood-studio-20260906.webp", alt: "석촌 체리우드 — 컬러 스튜디오 보틀 콘셉트 이미지", url: "product-seokchon-cherrywood.html" },
    { id: "cafe-flower-tea", brand: "useless", brandLabel: "USÉLESS SEOUL", name: "카페 플라워티", en: "Cafe Flower Tea", code: "UL-D05", price: 68000, status: "on_sale",
      hook: "오후 카페 테이블 위, 꽃차의 얇은 김과 머스크.",
      notes: "Bergamot · Floral Tea · Black Tea · White Musk",
      notePyramid: ["Bergamot", "Floral Tea · Black Tea", "White Musk"],
      spec: "500ml × 2병 세트", img: "assets/img/canon/flower-tea-studio-20260906.webp", alt: "카페 플라워티 — 컬러 스튜디오 보틀 콘셉트 이미지", url: "product-cafe-flower-tea.html" },
    { id: "amaimu-fig", brand: "amaimu", brandLabel: "amaimü", name: "Miss Fig", en: "Miss Fig", code: "AM-D01", price: 35000, status: "on_sale",
      hook: "오늘의 기분과 취향을 방 안에 더하는 무화과 우드.",
      notes: "Fig · Plum · Hinoki · Cypress · Cedarwood · Sandalwood",
      notePyramid: ["Fig · Plum", "Fig Pulp · Hinoki · Cypress", "Cedarwood · Sandalwood"],
      spec: "그랜드라운드 200ml × 2병 세트", img: "assets/img/detail-amaimu/hero-bedroom-flash-v6.webp", alt: "amaimü Miss Fig — 그랜드라운드 리드 디퓨저 200ml 2병 세트", url: "product-amaimu.html" },
  ];

  /* DB status ↔ 한글 라벨. DB check: awaiting_payment/paid/done */
  const ORDER_STATUS = {
    awaiting_payment: "입금 대기",
    paid: "입금 확인",
    done: "배송 완료",
    cancelled: "주문 취소",
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
  // Public prelaunch release: no account creation or personal-data writes.
  async function signUp() {
    throw new Error("회원가입은 준비 중입니다. 지금은 로그인 없이 제품을 둘러보실 수 있습니다.");
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
  async function createOrder() {
    throw new Error("주문은 준비 중입니다. 현재 주문서 저장·결제·배송은 진행되지 않습니다.");
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

  /* 입금 전(awaiting_payment) 본인 주문 취소 — RLS: 본인 행 + 해당 상태만 update 허용 필요 */
  async function cancelMyOrder(orderId) {
    const user = await currentUser();
    if (!user) throw new Error("로그인이 필요합니다.");
    const { data, error } = await sb().from("useless_orders")
      .update({ status: "cancelled" })
      .eq("order_no", orderId).eq("user_id", user.id).eq("status", "awaiting_payment")
      .select().single();
    if (error) throw new Error("취소 실패: " + error.message);
    return data;
  }

  /* ---------- 리뷰 (useless_reviews 테이블 — SQL 마이그레이션 문서 참조) ---------- */
  async function listReviews(productId) {
    try {
      const { data, error } = await sb().from("useless_reviews")
        .select("id,product_id,author_name,rating,body,created_at")
        .eq("product_id", productId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) return [];   // 테이블 미생성 등 — 빈 상태로 우아하게
      return data || [];
    } catch (e) { return []; }
  }

  async function addReview({ productId, rating, body }) {
    const user = await currentUser();
    if (!user) throw new Error("리뷰 작성에는 로그인이 필요합니다.");
    rating = Math.min(5, Math.max(1, rating | 0));
    body = String(body || "").trim();
    if (body.length < 5) throw new Error("리뷰는 5자 이상 적어주세요.");
    if (body.length > 1000) throw new Error("리뷰는 1000자 이내로 적어주세요.");
    const { data, error } = await sb().from("useless_reviews").insert({
      product_id: productId, user_id: user.id,
      author_name: (user.name || user.email || "익명").split("@")[0],
      rating, body,
    }).select().single();
    if (error) throw new Error("리뷰 저장 실패: " + error.message);
    return data;
  }
  async function updateOrderStatus(orderId, status) {
    if (!ORDER_STATUS[status]) throw new Error("알 수 없는 주문 상태: " + status);
    const { data, error } = await sb().from("useless_orders")
      .update({ status }).eq("order_no", orderId).select().single();
    if (error) throw new Error("상태 변경 실패(권한 확인): " + error.message);
    return { orderId: data.order_no, status: data.status };
  }

  window.Store = { getProducts, getProduct, signUp, signIn, signOut, currentUser, createOrder, myOrders, listOrders, updateOrderStatus, cancelMyOrder, listReviews, addReview, ORDER_STATUS };
})();
