/* Borgarafl prototype. Behaviour mirrors Royal MHB's theme script.js (teardown: TEARDOWN-MHB.md):
   header.fixed at scrollY >= 10, left menu, round scroll-down, hero image slider, video play/close, category filter. */
(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  if (!reduce.matches) root.classList.add('motion');
  reduce.addEventListener?.('change', (e) => root.classList.toggle('motion', !e.matches));

  /* ---------- header: .fixed (MHB fixHeaderOnScroll: add >=10, remove <=2) + dark text over light sections ---------- */
  const hdr = document.querySelector('[data-hdr]');
  const lights = [...document.querySelectorAll('[data-light]')];
  let ticking = false;
  function onScroll() {
    ticking = false;
    const y = scrollY;
    if (y >= 10) hdr.classList.add('fixed'); else if (y <= 2) hdr.classList.remove('fixed');
    const probe = hdr.offsetHeight / 2;
    hdr.classList.toggle('on-light', lights.some((s) => { const r = s.getBoundingClientRect(); return r.top <= probe && r.bottom > probe; }));
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener('resize', onScroll, { passive: true });
  onScroll();

  /* ---------- menu (MHB .menu_left: translateX(-100%) → 0, transform .5s ease; veil .3s) ---------- */
  const menu = document.getElementById('menu');
  const panel = menu?.querySelector('.menu_panel');
  const openBtn = document.querySelector('[data-menu-open]');
  let lastFocus = null, isOpen = false, closeTimer;
  const focusables = () => [...menu.querySelectorAll('button, a[href]')];
  function openMenu(e) {
    if (isOpen) return; isOpen = true; clearTimeout(closeTimer);
    lastFocus = document.activeElement;
    menu.hidden = false; menu.style.pointerEvents = '';
    root.classList.add('menu-open'); root.style.overflow = 'hidden';
    openBtn.setAttribute('aria-expanded', 'true');
    void panel.offsetWidth; // commit the closed state so the transition runs
    menu.classList.add('is-open');
    // pointer open: focus the panel (no ring on Safari/iOS); keyboard open (detail 0): first link
    (e && e.detail === 0 ? menu.querySelector('.menu_list a') : panel).focus({ preventScroll: true });
  }
  function closeMenu() {
    if (!isOpen) return; isOpen = false;
    openBtn.setAttribute('aria-expanded', 'false');
    menu.classList.remove('is-open'); menu.style.pointerEvents = 'none'; // a tap during the close reaches the page, not the closing panel
    root.classList.remove('menu-open'); root.style.overflow = '';
    closeTimer = setTimeout(() => { if (!isOpen) { menu.hidden = true; menu.style.pointerEvents = ''; } }, reduce.matches ? 0 : 520);
    lastFocus?.focus?.({ preventScroll: true });
  }
  if (menu) {
    openBtn.addEventListener('click', openMenu);
    menu.querySelectorAll('[data-menu-close]').forEach((b) => b.addEventListener('click', closeMenu));
    document.addEventListener('keydown', (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') { e.preventDefault(); closeMenu(); return; }
      if (e.key === 'Tab') {
        const f = focusables(); const i = f.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); f.at(-1).focus(); }
        else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      }
    });
  }

  /* ---------- MHB fullPage autoScrolling (desktop >=1024 wide, >600 tall, fine pointer): one chapter per wheel/key,
     0.7 s ease (#fullpage transform .7s ease). Phones and reduced motion keep native scroll, as MHB's responsiveWidth does. ---------- */
  const fpMq = matchMedia('(min-width: 64rem) and (min-height: 37.5rem) and (pointer: fine)');
  const stops = [...document.querySelectorAll('[data-snap]')];
  const isHome = document.body.classList.contains('is-home');
  const fpOn = () => isHome && fpMq.matches && !reduce.matches;
  const bez = (x1, y1, x2, y2) => (t) => { // cubic-bezier solver for 'ease'
    let a = t; for (let i = 0; i < 8; i++) { const x = 3 * (1 - a) ** 2 * a * x1 + 3 * (1 - a) * a * a * x2 + a ** 3 - t; const d = 3 * (1 - a) ** 2 * x1 + 6 * (1 - a) * a * (x2 - x1) + 3 * a * a * (1 - x2); if (Math.abs(d) < 1e-6) break; a -= x / d; }
    return 3 * (1 - a) ** 2 * a * y1 + 3 * (1 - a) * a * a * y2 + a ** 3; };
  const ease = bez(0.25, 0.1, 0.25, 1);
  let anim = false, animEnd = 0;
  const topOf = (el) => (el.matches('.ftr') ? document.documentElement.scrollHeight - innerHeight : el.getBoundingClientRect().top + scrollY);
  const current = () => { const y = scrollY + 4; let i = 0; stops.forEach((s, k) => { if (topOf(s) <= y) i = k; }); return i; };
  function goTo(el) {
    const to = Math.round(topOf(el));
    if (!fpOn()) { scrollTo({ top: to, behavior: reduce.matches ? 'auto' : 'smooth' }); return; }
    const from = scrollY; const t0 = performance.now(); anim = true;
    const step = (now) => { const p = Math.min(1, (now - t0) / 700); scrollTo(0, from + (to - from) * ease(p)); if (p < 1) requestAnimationFrame(step); else { anim = false; animEnd = performance.now(); } };
    requestAnimationFrame(step);
  }
  if (isHome && stops.length) {
    let lastWheel = 0;
    addEventListener('wheel', (e) => {
      if (!fpOn() || isOpen || e.ctrlKey) return;
      e.preventDefault();
      const now = performance.now(); const gap = now - lastWheel; lastWheel = now;
      // trackpad momentum keeps firing: a new step needs the last one finished and a pause or a fresh, harder flick
      if (anim || now - animEnd < 450 || (gap < 160 && Math.abs(e.deltaY) < 30) || Math.abs(e.deltaY) < 4) return;
      const i = current() + (e.deltaY > 0 ? 1 : -1);
      if (i >= 0 && i < stops.length) goTo(stops[i]);
    }, { passive: false });
    addEventListener('keydown', (e) => {
      if (!fpOn() || isOpen || e.target.closest('input, textarea, select, [contenteditable]')) return;
      const dir = { ArrowDown: 1, PageDown: 1, ' ': e.shiftKey ? -1 : 1, ArrowUp: -1, PageUp: -1, Home: -9, End: 9 }[e.key];
      if (!dir) return; e.preventDefault(); if (anim) return;
      goTo(stops[Math.max(0, Math.min(stops.length - 1, current() + dir))]);
    });
  }

  /* ---------- scroll-down ring: next section (MHB .scroll / fullpage_api.moveSectionDown) ---------- */
  document.querySelectorAll('[data-down]').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    const sec = a.closest('section');
    goTo(sec.nextElementSibling?.matches('section') ? sec.nextElementSibling : document.querySelector('.ftr'));
  }));

  /* ---------- home chapter dots (MHB fullPage navigation) ---------- */
  const dots = [...document.querySelectorAll('.fp-nav a')];
  if (dots.length) {
    const nav = document.querySelector('.fp-nav');
    const chapters = dots.map((d) => document.querySelector(d.getAttribute('href')));
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (!en.isIntersecting) return;
      dots.forEach((d, i) => d.classList.toggle('is-active', chapters[i] === en.target));
    }), { threshold: 0.55 });
    chapters.forEach((c) => io.observe(c));
    new IntersectionObserver(([en]) => nav.classList.toggle('is-off', en.isIntersecting), { threshold: 0.35 }).observe(document.querySelector('.ftr'));
    dots.forEach((d) => d.addEventListener('click', (e) => { e.preventDefault(); goTo(document.querySelector(d.getAttribute('href'))); }));
  }

  /* ---------- hero film: their own Vimeo drone film as background (MHB .hero iframe) ---------- */
  const film = document.querySelector('[data-film]');
  if (film && !reduce.matches && !navigator.connection?.saveData) {
    const start = () => {
      const f = document.createElement('iframe');
      f.src = `https://player.vimeo.com/video/${film.dataset.film}?background=1&autoplay=1&loop=1&muted=1&dnt=1`;
      f.title = 'Myndband af uppsetningu'; f.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture'); f.tabIndex = -1;
      addEventListener('message', (ev) => {
        if (ev.origin !== 'https://player.vimeo.com') return;
        let d = ev.data; try { if (typeof d === 'string') d = JSON.parse(d); } catch { return; }
        if (d?.event === 'ready') f.contentWindow.postMessage(JSON.stringify({ method: 'addEventListener', value: 'playing' }), '*');
        if (d?.event === 'playing') film.classList.add('is-on'); // poster stays until frames actually play
      });
      film.appendChild(f);
    };
    if (document.readyState === 'complete') setTimeout(start, 300); else addEventListener('load', () => setTimeout(start, 300), { once: true });
  }

  /* ---------- hero image slider (MHB tiny-slider: items 1, loop, controls prev/next, mouseDrag) ---------- */
  document.querySelectorAll('[data-slider]').forEach((sl) => {
    const track = sl.querySelector('.hero_track');
    const slides = [...track.children];
    const hero = sl.closest('.hero');
    if (slides.length < 2) { hero.querySelector('.hero_ctrl')?.remove(); return; }
    let i = 0;
    const go = (n) => {
      i = (n + slides.length) % slides.length;
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      track.style.transform = `translateX(${-i * (sl.offsetWidth + gap)}px)`;
      slides.forEach((s, k) => s.setAttribute('aria-hidden', String(k !== i)));
    };
    hero.querySelector('[data-prev]').addEventListener('click', () => go(i - 1));
    hero.querySelector('[data-next]').addEventListener('click', () => go(i + 1));
    let x0 = null;
    sl.addEventListener('pointerdown', (e) => { x0 = e.clientX; });
    sl.addEventListener('pointerup', (e) => { if (x0 !== null && Math.abs(e.clientX - x0) > 40) go(i + (e.clientX < x0 ? 1 : -1)); x0 = null; });
    addEventListener('resize', () => { track.style.transition = 'none'; go(i); requestAnimationFrame(() => { track.style.transition = ''; }); });
    go(0);
  });

  /* ---------- video block (MHB .video-body: play → poster fades, button morphs to close and moves to the corner) ---------- */
  document.querySelectorAll('[data-video]').forEach((vb) => {
    const btnEl = vb.querySelector('.play-btn');
    const wrap = vb.querySelector('.videoWrapper');
    let frame = null, playing = false;
    const post = (method) => frame?.contentWindow?.postMessage(JSON.stringify({ method }), '*');
    btnEl.addEventListener('click', () => {
      playing = !playing;
      vb.classList.toggle('is-playing', playing);
      btnEl.setAttribute('aria-pressed', String(playing));
      btnEl.setAttribute('aria-label', playing ? 'Stöðva myndband' : 'Spila myndband');
      if (!frame) {
        frame = document.createElement('iframe');
        frame.src = `https://player.vimeo.com/video/${vb.dataset.video}?autoplay=1&controls=0&title=0&byline=0&portrait=0&dnt=1&muted=1&loop=1`;
        frame.title = 'Myndband frá Borgarafli'; frame.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture');
        wrap.appendChild(frame);
      } else post(playing ? 'play' : 'pause');
    });
    // MHB: leaving the block pauses and resets the button
    new IntersectionObserver(([en]) => { if (!en.isIntersecting && playing) btnEl.click(); }, { threshold: 0 }).observe(vb);
  });

  /* ---------- category filter (MHB filter-cat: ?cat=; here ?flokkur= without reload) ---------- */
  const grid = document.querySelector('[data-grid]');
  if (grid) {
    const links = [...document.querySelectorAll('[data-filter]')];
    const items = [...grid.children];
    let timer;
    const apply = (cat, push) => {
      links.forEach((l) => l.setAttribute('aria-current', String(l.dataset.filter === cat)));
      clearTimeout(timer);
      const show = (t) => !cat || t.dataset.cat === cat;
      items.forEach((t) => { t.classList.remove('is-in'); if (!show(t)) t.classList.add('is-out'); });
      timer = setTimeout(() => {
        items.forEach((t) => { t.hidden = !show(t); if (show(t)) t.classList.add('is-out'); });
        requestAnimationFrame(() => requestAnimationFrame(() => items.forEach((t) => { if (show(t)) { t.classList.add('is-in'); t.classList.remove('is-out'); } })));
      }, reduce.matches ? 0 : 300);
      if (push) history.replaceState(null, '', cat ? `?flokkur=${cat}` : location.pathname);
    };
    links.forEach((l) => l.addEventListener('click', (e) => { e.preventDefault(); apply(l.dataset.filter, true); }));
    const q = new URLSearchParams(location.search).get('flokkur');
    if (q && links.some((l) => l.dataset.filter === q)) {
      links.forEach((l) => l.setAttribute('aria-current', String(l.dataset.filter === q)));
      items.forEach((t) => { t.hidden = t.dataset.cat !== q; });
      document.getElementById('yfirlit')?.scrollIntoView({ behavior: 'instant', block: 'start' }); // MHB: ?cat → scroll to .overview
    }
  }
})();
