(() => {
  'use strict';
  const section = document.getElementById('launch-notify');
  const form = document.querySelector('[data-launch-form]');
  const float = document.querySelector('.launch-float');
  if (float && section && 'IntersectionObserver' in window) {
    const visible = new Set();
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => entry.isIntersecting ? visible.add(entry.target) : visible.delete(entry.target));
      float.hidden = visible.size > 0;
      document.body.classList.toggle('launch-in-view', visible.has(section));
    });
    observer.observe(section);
    const footer = document.querySelector('footer');
    if (footer) observer.observe(footer);
  }
  if (!form) return;
  form.addEventListener('submit', event => event.preventDefault());
  const config = window.USELESS_LAUNCH_CONFIG || {};
  const products = new Set(['seongsu','hotel','seoul-forest','seokchon-cherrywood','cafe-flower-tea','amaimu-fig']);
  const params = new URLSearchParams(location.search);
  const selected = params.get('product') || params.get('scent');
  form.elements.product.value = products.has(selected) ? selected : 'all';
  const normalizePhone = value => {
    if (!/^[+0-9()\s-]+$/.test(value)) return '';
    const compact = value.replace(/[()\s-]/g, '');
    if (/^010\d{8}$/.test(compact)) return '+82' + compact.slice(1);
    return /^\+8210\d{8}$/.test(compact) ? compact : '';
  };
  const validatePhone = () => form.elements.phone.setCustomValidity(normalizePhone(form.elements.phone.value) ? '' : '010으로 시작하는 휴대전화 번호를 확인해 주세요.');
  form.elements.phone.addEventListener('input', validatePhone);
  const button = form.querySelector('button[type=submit]');
  const status = form.querySelector('[data-launch-status]');
  let token = '', widget, busy = false;
  const message = (text, error = false) => { status.textContent = text; status.dataset.error = String(error); };
  const ready = typeof config.endpoint === 'string' && /^https:\/\//.test(config.endpoint) && config.turnstileSiteKey;
  if (!ready) return; // Closed until a real receiver is configured; never simulate a signup.
  button.innerHTML = '제품 출시 알림 받기 <span aria-hidden="true">↗</span>';
  message('잠시만 기다려 주세요…');
  const resetCaptcha = () => {
    token = ''; button.disabled = true;
    if (widget !== undefined) window.turnstile?.reset(widget);
  };
  const captchaScript = document.createElement('script');
  captchaScript.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  captchaScript.async = true;
  captchaScript.onload = () => {
    if (!window.turnstile) { message('연결하지 못했습니다. 페이지를 새로고침해 주세요.', true); return; }
    widget = window.turnstile.render(form.querySelector('[data-launch-captcha]'), {
      sitekey: config.turnstileSiteKey, action: 'launch_signup', theme: 'light', size: 'flexible',
      callback: value => { token = value; button.disabled = busy; if (status.dataset.error !== 'true') message('출시 소식을 받을 전화번호를 남겨주세요.'); },
      'expired-callback': () => { token = ''; button.disabled = true; message('확인이 만료되었습니다. 다시 확인해 주세요.'); },
      'error-callback': () => { token = ''; button.disabled = true; message('연결하지 못했습니다. 페이지를 새로고침해 주세요.', true); }
    });
  };
  captchaScript.onerror = () => message('연결하지 못했습니다. 페이지를 새로고침해 주세요.', true);
  document.head.appendChild(captchaScript);
  form.addEventListener('submit', async event => {
    event.preventDefault();
    validatePhone();
    form.elements.email.value = form.elements.email.value.trim();
    if (busy || !form.reportValidity() || !token) return;
    busy = true; button.disabled = true; button.textContent = '신청 중…'; message('신청을 접수하고 있습니다.');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(config.endpoint, {
        method: 'POST', credentials: 'omit', headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ phone: normalizePhone(form.elements.phone.value), email: form.elements.email.value, name: form.elements.name.value.trim(), product: form.elements.product.value, consent: form.elements.consent.checked,
          consentVersion: config.consentVersion, source: location.pathname.endsWith('shop.html') ? 'shop' : 'home',
          website: form.elements.website.value, captcha: token })
      });
      const result = await response.json();
      if (!response.ok || result.accepted !== true) throw new Error('not-accepted');
      const success = document.querySelector('[data-launch-success]');
      success.querySelector('[data-launch-confirmation]').textContent = '유슬레스서울 제품 출시 알림';
      form.reset(); form.hidden = true; success.hidden = false; success.focus();
    } catch {
      message('신청 완료를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.', true);
      resetCaptcha();
    } finally {
      clearTimeout(timeout); busy = false; button.innerHTML = '제품 출시 알림 받기 <span aria-hidden="true">↗</span>';
      button.disabled = !token;
    }
  });
})();
