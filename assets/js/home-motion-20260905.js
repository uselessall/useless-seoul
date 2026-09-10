(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const films = [...document.querySelectorAll('[data-scene-film]')].map(figure => ({
    figure, videos: [...figure.querySelectorAll('video')], button: figure.querySelector('[data-scene-toggle]'), visible: false, choice: null, current: 0,
  })).filter(f => f.videos.length);
  const sync = film => {
    const shouldPlay = film.visible && !document.hidden && (film.choice ?? !reduced.matches);
    film.videos.forEach((video, i) => {
      video.classList.toggle('is-current', i === film.current);
      if (shouldPlay && i === film.current) video.play().catch(() => { if (film.button) film.button.textContent = '영상 재생'; });
      else video.pause();
    });
    film.figure.classList.toggle('is-user-playing', film.choice === true);
  };
  films.forEach(film => {
    if (film.button) film.button.hidden = false;
    film.videos.forEach((video, index) => {
      if (film.videos.length > 1) video.loop = false;
      video.addEventListener('playing', () => {
        if (index !== film.current) return;
        film.figure.classList.add('has-frame');
        if (film.button) film.button.textContent = '영상 멈춤';
        const count = film.figure.querySelector('[data-film-count]');
        if (count) count.textContent = `${String(index + 1).padStart(2, '0')} / ${String(film.videos.length).padStart(2, '0')}`;
        if (film.videos.length > 1 && !reduced.matches) {
          const next = film.videos[(index + 1) % film.videos.length];
          if (next.preload === 'none') { next.preload = 'auto'; next.load(); }
        }
      });
      video.addEventListener('pause', () => { if (index === film.current && film.button) film.button.textContent = '영상 재생'; });
      video.addEventListener('error', () => { if (index === film.current) { film.figure.classList.remove('has-frame'); if (film.button) film.button.textContent = '영상 다시 재생'; } });
      video.addEventListener('ended', () => {
        if (film.current !== index || film.videos.length < 2) return;
        film.current = (index + 1) % film.videos.length;
        film.videos[film.current].currentTime = 0;
        sync(film);
      });
    });
    film.button?.addEventListener('click', () => { film.choice = film.videos[film.current].paused; sync(film); });
  });
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    const film = films.find(f => f.figure === entry.target);
    film.visible = entry.isIntersecting; sync(film);
  }), { threshold: 0.05 });
  films.forEach(f => observer.observe(f.figure));
  document.addEventListener('visibilitychange', () => films.forEach(sync));
  reduced.addEventListener('change', () => films.forEach(f => {
    f.choice = null; if (reduced.matches) f.figure.classList.remove('has-frame'); sync(f);
  }));
  const story = document.querySelector('.field-story');
  if (!story) return;
  const panels = [...story.querySelectorAll('.field-story__panel')];
  let pending = false;
  const updateStory = () => {
    pending = false;
    const middle = innerHeight * .53;
    panels.forEach(panel => {
      const r = panel.getBoundingClientRect();
      // Keep a broad reading plateau; fade only as the next panel arrives.
      const distance = Math.abs(r.top + r.height / 2 - middle);
      const opacity = reduced.matches ? 1 : Math.max(0, Math.min(1, (r.height * .82 - distance) / (r.height * .3)));
      panel.style.setProperty('--story-opacity', opacity.toFixed(3));
    });
  };
  const schedule = () => { if (!pending) { pending = true; requestAnimationFrame(updateStory); } };
  story.classList.add('motion-ready');
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule);
  reduced.addEventListener('change', schedule);
  updateStory();
})();
