(() => {
  const header = document.querySelector(".site-header");
  const menuButton = document.querySelector(".menu-button");
  const nav = document.querySelector(".site-nav");

  const setHeader = () => {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 32);
  };

  setHeader();
  window.addEventListener("scroll", setHeader, { passive: true });

  if (menuButton && nav) {
    menuButton.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      menuButton.setAttribute("aria-expanded", String(open));
      menuButton.textContent = open ? "CLOSE" : "MENU";
      document.body.classList.toggle("menu-open", open);
    });

    nav.addEventListener("click", (event) => {
      if (!(event.target instanceof HTMLAnchorElement)) return;
      nav.classList.remove("is-open");
      menuButton.setAttribute("aria-expanded", "false");
      menuButton.textContent = "MENU";
      document.body.classList.remove("menu-open");
    });
  }

  const kineticHero = document.querySelector("[data-kinetic-hero]");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");

  if (kineticHero && !reducedMotion.matches) {
    const uselessCopy = kineticHero.querySelector(".kinetic-hero__copy--useless");
    const amaimuCopy = kineticHero.querySelector(".kinetic-hero__copy--amaimu");
    const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
    const smoothstep = (edge0, edge1, value) => {
      const x = clamp((value - edge0) / (edge1 - edge0));
      return x * x * (3 - 2 * x);
    };

    let targetPointerX = 0;
    let targetPointerY = 0;
    let pointerX = 0;
    let pointerY = 0;
    let targetProgress = 0;
    let progress = 0;
    let frameId = 0;
    let heroVisible = true;
    let cycleAmaimuFilm = false;

    const syncHeroFilm = () => {
      const followsScroll = targetProgress > 0.18;
      const showAmaimuFilm = followsScroll ? targetProgress >= 0.5 : cycleAmaimuFilm;
      kineticHero.classList.toggle("is-amaimu-film", showAmaimuFilm);
    };

    const cycleHeroFilm = () => {
      cycleAmaimuFilm = !cycleAmaimuFilm;
      setHeroStyles();
    };

    const setHeroStyles = () => {
      const split = smoothstep(0.2, 0.68, progress);
      const statement = smoothstep(0.58, 0.9, progress);
      const uselessStatement = 1 - smoothstep(0.38, 0.58, progress);
      const autoAmaimu = targetProgress <= 0.18 && cycleAmaimuFilm;
      const visibleSplit = autoAmaimu ? 1 : split;
      const visibleStatement = autoAmaimu ? 1 : statement;
      const visibleUselessStatement = autoAmaimu ? 0 : uselessStatement;
      const titleOpacity = 1 - visibleSplit;
      const filmOpacity = autoAmaimu ? 0 : 1 - smoothstep(0.46, 0.82, progress);

      kineticHero.style.setProperty("--hero-glow-x", `${54 + pointerX * 4}%`);
      kineticHero.style.setProperty("--hero-glow-y", `${42 + pointerY * 3}%`);
      kineticHero.style.setProperty("--hero-grid-tilt", `${progress * 3}deg`);
      kineticHero.style.setProperty("--hero-wordmark-tilt", `${progress * -5}deg`);
      kineticHero.style.setProperty("--hero-title-opacity", titleOpacity.toFixed(3));
      kineticHero.style.setProperty("--hero-title-x", `${pointerX * 2 - visibleSplit * 14}px`);
      kineticHero.style.setProperty("--hero-title-y", `${pointerY * 1.4}px`);
      kineticHero.style.setProperty("--hero-film-x", `${pointerX * 3}px`);
      kineticHero.style.setProperty("--hero-film-y", `${pointerY * 2 + progress * 7}px`);
      kineticHero.style.setProperty("--hero-film-rotate-x", `${pointerY * -0.18 - progress * 4}deg`);
      kineticHero.style.setProperty("--hero-film-rotate-y", `${pointerX * 0.22}deg`);
      kineticHero.style.setProperty("--hero-film-opacity", filmOpacity.toFixed(3));
      kineticHero.style.setProperty("--hero-refraction-top-x", `${pointerX * -1.6}px`);
      kineticHero.style.setProperty("--hero-refraction-top-y", `${pointerY * -1}px`);
      kineticHero.style.setProperty("--hero-refraction-top-skew", `${pointerX * -0.035}deg`);
      kineticHero.style.setProperty("--hero-refraction-middle-x", `${pointerX * 2.4 + progress * 9}px`);
      kineticHero.style.setProperty("--hero-refraction-middle-y", `${pointerY * 1.5}px`);
      kineticHero.style.setProperty("--hero-refraction-middle-skew", `${pointerX * 0.055}deg`);
      kineticHero.style.setProperty("--hero-refraction-bottom-x", `${pointerX * -1 - progress * 6}px`);
      kineticHero.style.setProperty("--hero-refraction-bottom-y", `${pointerY * 0.7}px`);
      kineticHero.style.setProperty("--hero-refraction-bottom-skew", `${pointerX * -0.025}deg`);
      kineticHero.style.setProperty("--hero-split-opacity", visibleSplit.toFixed(3));
      kineticHero.style.setProperty("--hero-split-y", `${visibleSplit * -4}px`);
      kineticHero.style.setProperty("--hero-statement-opacity", visibleStatement.toFixed(3));
      kineticHero.style.setProperty("--hero-statement-y", `${(1 - visibleStatement) * 24}px`);
      kineticHero.style.setProperty("--hero-useless-opacity", visibleUselessStatement.toFixed(3));
      kineticHero.style.setProperty("--hero-useless-y", `${(1 - visibleUselessStatement) * -18}px`);

      const showAmaimuCopy = progress >= 0.58 || autoAmaimu;
      kineticHero.classList.toggle("is-amaimu-copy", showAmaimuCopy);
      syncHeroFilm();
      uselessCopy?.setAttribute("aria-hidden", showAmaimuCopy ? "true" : "false");
      amaimuCopy?.setAttribute("aria-hidden", showAmaimuCopy ? "false" : "true");
    };

    const animateHero = () => {
      frameId = 0;
      if (!heroVisible || document.hidden) return;

      pointerX += (targetPointerX - pointerX) * 0.075;
      pointerY += (targetPointerY - pointerY) * 0.075;
      progress += (targetProgress - progress) * 0.12;
      setHeroStyles();

      const unsettled =
        Math.abs(targetPointerX - pointerX) > 0.002 ||
        Math.abs(targetPointerY - pointerY) > 0.002 ||
        Math.abs(targetProgress - progress) > 0.001;
      if (unsettled) frameId = requestAnimationFrame(animateHero);
    };

    const requestHeroFrame = () => {
      if (!frameId && heroVisible && !document.hidden) {
        frameId = requestAnimationFrame(animateHero);
      }
    };

    const updateHeroProgress = () => {
      const rect = kineticHero.getBoundingClientRect();
      const travel = Math.max(1, kineticHero.offsetHeight - window.innerHeight);
      targetProgress = clamp(-rect.top / travel);
      requestHeroFrame();
    };

    const updatePointer = (event) => {
      if (!finePointer.matches) return;
      const rect = kineticHero.getBoundingClientRect();
      targetPointerX = clamp((event.clientX - rect.left) / rect.width, 0, 1) * 2 - 1;
      targetPointerY = clamp((event.clientY - rect.top) / Math.min(rect.height, window.innerHeight), 0, 1) * 2 - 1;
      requestHeroFrame();
    };

    const resetPointer = () => {
      targetPointerX = 0;
      targetPointerY = 0;
      requestHeroFrame();
    };

    kineticHero.classList.add("is-enhanced");
    kineticHero.addEventListener("hero-film-cycle", cycleHeroFilm);
    kineticHero.addEventListener("hero-film-select", (event) => {
      if (!(event instanceof CustomEvent)) return;
      cycleAmaimuFilm = event.detail === "amaimu";
      setHeroStyles();
    });
    window.setInterval(cycleHeroFilm, 6000);
    setHeroStyles();
    updateHeroProgress();
    window.addEventListener("scroll", updateHeroProgress, { passive: true });
    window.addEventListener("resize", updateHeroProgress, { passive: true });
    kineticHero.addEventListener("pointermove", updatePointer, { passive: true });
    kineticHero.addEventListener("pointerleave", resetPointer, { passive: true });

    if ("IntersectionObserver" in window) {
      const heroObserver = new IntersectionObserver(
        ([entry]) => {
          heroVisible = entry.isIntersecting;
          if (heroVisible) {
            updateHeroProgress();
          } else if (frameId) {
            cancelAnimationFrame(frameId);
            frameId = 0;
          }
        },
        { rootMargin: "20% 0px" },
      );
      heroObserver.observe(kineticHero);
    }

    document.addEventListener("visibilitychange", () => {
      if (document.hidden && frameId) {
        cancelAnimationFrame(frameId);
        frameId = 0;
      } else if (!document.hidden) {
        updateHeroProgress();
      }
    });
  }

  const seoulClocks = document.querySelectorAll("[data-seoul-clock]");
  if (seoulClocks.length) {
    const seoulTime = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Seoul",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });

    const updateSeoulClocks = () => {
      const now = new Date();
      const parts = Object.fromEntries(
        seoulTime
          .formatToParts(now)
          .filter(({ type }) => type !== "literal")
          .map(({ type, value }) => [type, Number(value)]),
      );
      const seconds = parts.second;
      const minutes = parts.minute + seconds / 60;
      const hours = (parts.hour % 12) + minutes / 60;

      seoulClocks.forEach((clock) => {
        clock.dateTime = now.toISOString();
        clock.style.setProperty("--clock-hour", `${hours * 30}deg`);
        clock.style.setProperty("--clock-minute", `${minutes * 6}deg`);
        clock.style.setProperty("--clock-second", `${seconds * 6}deg`);
        const text = clock.querySelector("[data-seoul-clock-text]");
        if (text) text.textContent = seoulTime.format(now);
      });
    };

    updateSeoulClocks();
    window.setInterval(updateSeoulClocks, 1000);
  }

  const motionVideos = [...document.querySelectorAll("[data-world-video], [data-motion-video], [data-hero-video]")];
  if (motionVideos.length) {
    const visibleVideos = new Set();

    motionVideos.forEach((video) => {
      const playbackRate = Number(video.dataset.playbackRate);
      if (!Number.isFinite(playbackRate) || playbackRate <= 0) return;
      video.defaultPlaybackRate = playbackRate;
      video.playbackRate = playbackRate;
    });

    const syncMotionVideos = () => {
      motionVideos.forEach((video) => {
        const shouldPlay = visibleVideos.has(video) && !reducedMotion.matches && !document.hidden;
        if (shouldPlay) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      });
    };

    const videoObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            visibleVideos.add(entry.target);
          } else {
            visibleVideos.delete(entry.target);
          }
        });
        syncMotionVideos();
      },
      { threshold: 0.1 },
    );

    motionVideos.forEach((video) => videoObserver.observe(video));
    reducedMotion.addEventListener("change", syncMotionVideos);
    document.addEventListener("visibilitychange", syncMotionVideos);
  }

  const contactForm = document.querySelector("[data-contact-form]");
  const contactStatus = document.querySelector("[data-contact-status]");

  contactForm?.addEventListener("submit", (event) => {
    event.preventDefault();

    const data = new FormData(contactForm);
    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim();
    const company = String(data.get("company") || "").trim();
    const topic = String(data.get("topic") || "").trim();
    const message = String(data.get("message") || "").trim();
    const subject = `[USÉLESS SEOUL 문의] ${topic} · ${name}`;
    const body = [
      `이름: ${name}`,
      `이메일: ${email}`,
      `회사·브랜드: ${company || "-"}`,
      `문의 유형: ${topic}`,
      "",
      message,
    ].join("\n");

    if (contactStatus) {
      contactStatus.textContent = "메일 작성창을 여는 중입니다.";
    }

    window.location.href = `mailto:ops@uselessseoul.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });

  const items = [...document.querySelectorAll(".reveal")];
  if (!("IntersectionObserver" in window)) {
    items.forEach((item) => item.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.13 },
  );

  items.forEach((item) => observer.observe(item));
})();
