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

  /* ---------- section jumps (scroll-down ring, chapter dots). Native scroll everywhere: MHB's fullPage wheel-stepping
     was rebuilt on 14 Nov and swallowed slow trackpad drags (page stuck on chapter 1), so it was removed 15 Nov. ---------- */
  function goTo(el) {
    const to = el.matches('.ftr') ? document.documentElement.scrollHeight - innerHeight : el.getBoundingClientRect().top + scrollY;
    scrollTo({ top: Math.round(to), behavior: reduce.matches ? 'auto' : 'smooth' });
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
        if (d?.event === 'playing') setTimeout(() => film.classList.add('is-on'), 600); // poster stays until frames actually play
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
    // swipe anywhere on the hero (title included); touch via touch events because iOS cancels pointer events on pan
    let x0 = null, y0 = null;
    const start = (x, y) => { x0 = x; y0 = y; };
    const end = (x, y) => { if (x0 !== null && Math.abs(x - x0) > 40 && Math.abs(x - x0) > Math.abs(y - y0)) go(i + (x < x0 ? 1 : -1)); x0 = null; };
    hero.addEventListener('touchstart', (e) => start(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
    hero.addEventListener('touchend', (e) => end(e.changedTouches[0].clientX, e.changedTouches[0].clientY), { passive: true });
    hero.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse') start(e.clientX, e.clientY); });
    hero.addEventListener('pointerup', (e) => { if (e.pointerType === 'mouse') end(e.clientX, e.clientY); });
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
