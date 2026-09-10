(() => {
  const rail = document.querySelector('.section-rail');
  if (!rail) return;
  const links = [...rail.querySelectorAll('a[href^="#"]')];
  const sections = links.map(link => document.getElementById(link.hash.slice(1)));
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  links.forEach((link, index) => link.addEventListener('click', event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    history.pushState(null, '', link.hash);
    sections[index].scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'start' });
  }));
  let pending = false;
  const update = () => {
    pending = false;
    const marker = Math.max(80, innerHeight * .3);
    let current = 0;
    sections.forEach((section, index) => { if (section.getBoundingClientRect().top <= marker) current = index; });
    if (scrollY + innerHeight >= document.documentElement.scrollHeight - 3) current = sections.length - 1;
    links.forEach((link, index) => { if (index === current) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current'); });
  };
  const schedule = () => { if (!pending) { pending = true; requestAnimationFrame(update); } };
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule);
  addEventListener('load', schedule);
  update();
})();
