(() => {
  const video = document.querySelector('#company-field-video');
  const buttons = [...document.querySelectorAll('.company-field-toggle')];
  if (!video || !buttons.length) return;
  const setLabel = text => buttons.forEach(button => { button.textContent = text; });
  const surface = video.closest('.company-field');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let visible = false;
  let userPaused = reduced.matches;
  let failed = false;
  const sync = () => {
    if (failed || userPaused || !visible || document.hidden) video.pause();
    else video.play().catch(() => { setLabel('영상 재생'); });
  };
  buttons.forEach(button => { button.hidden = false; });
  video.addEventListener('playing', () => {
    surface.classList.add('has-frame');
    setLabel('영상 멈춤');
  });
  video.addEventListener('pause', () => { setLabel('영상 재생'); });
  const fallback = () => {
    failed = true;
    video.pause();
    surface.classList.remove('has-frame');
    buttons.forEach(button => { button.hidden = true; });
  };
  video.addEventListener('error', fallback);
  video.querySelector('source')?.addEventListener('error', fallback);
  // The source may fail before this deferred script attaches its listeners.
  if (video.error || video.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) fallback();
  buttons.forEach(button => button.addEventListener('click', () => {
    userPaused = !video.paused;
    sync();
  }));
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    sync();
  }, {threshold: .1}).observe(video.closest('.company-opening__scene'));
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', () => {
    userPaused = reduced.matches;
    if (reduced.matches) surface.classList.remove('has-frame');
    sync();
  });
})();

// Play each brand film only while its scene is visible; user pauses persist.
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  document.querySelectorAll('.company-world__media').forEach(surface => {
    const video = surface.querySelector('video');
    const button = surface.querySelector('button');
    if (!video || !button) return;
    const brand = surface.closest('.company-world').getAttribute('aria-label');
    let visible = false;
    let userPaused = reduced.matches;
    let failed = false;
    video.muted = true;
    const label = () => {
      const action = video.paused ? '영상 재생' : '영상 멈춤';
      button.textContent = action;
      button.setAttribute('aria-label', `${brand} ${action}`);
    };
    const sync = () => {
      if (failed || userPaused || !visible || document.hidden) video.pause();
      else video.play().then(() => {
        if (userPaused || !visible || document.hidden) video.pause();
      }).catch(label);
      label();
    };
    button.hidden = false;
    button.addEventListener('click', () => {
      userPaused = !video.paused;
      sync();
    });
    video.addEventListener('playing', label);
    video.addEventListener('pause', label);
    const fallback = () => {
      if (failed) return;
      failed = true;
      video.pause();
      button.hidden = true;
      video.removeAttribute('src');
      video.querySelectorAll('source').forEach(source => source.removeAttribute('src'));
      video.load();
    };
    video.addEventListener('error', fallback);
    video.querySelector('source')?.addEventListener('error', fallback);
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && entry.intersectionRatio >= .15;
      sync();
    }, {threshold:[0, .15]}).observe(surface);
    document.addEventListener('visibilitychange', sync);
    reduced.addEventListener('change', () => {
      userPaused = reduced.matches;
      sync();
    });
  });
})();
