/* Borgarafl prototype motion — spec: _docs/borgarafl-2026-11-14/MOTION.md (rows M1–M16) */
(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;
  const EASE = 'expo.out'; // closest GSAP curve to MHB cubic-bezier(.22,1,.36,1)
  if (!reduce) root.classList.add('motion');

  /* ---------- drawer (M6) — works without GSAP ---------- */
  const drawer = document.getElementById('drawer');
  const panel = drawer?.querySelector('.drawer_panel');
  const scrim = drawer?.querySelector('.drawer_scrim');
  const openBtn = document.querySelector('[data-menu-open]');
  let menuTl = null, lastFocus = null, isOpen = false;
  const links = () => [...drawer.querySelectorAll('.drawer_list a, .drawer_foot a')];
  function openMenu(e) {
    if (isOpen) return; isOpen = true; lastFocus = document.activeElement;
    drawer.hidden = false; drawer.style.pointerEvents = ''; root.classList.add('menu-open'); openBtn.setAttribute('aria-expanded', 'true');
    window.__lenis?.stop();
    const kb = e && e.detail === 0;
    if (window.gsap && !reduce) {
      menuTl?.kill();
      menuTl = gsap.timeline()
        .fromTo(panel, { x: 0, xPercent: gsap.getProperty(panel, 'xPercent') }, { x: 0, xPercent: 0, duration: .6, ease: 'power3.inOut' }, 0)
        .to(scrim, { opacity: 1, duration: .6, ease: 'power3.inOut' }, 0)
        .fromTo('.drawer_list li', { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: .6, ease: EASE, stagger: .05 }, .25);
    } else { panel.style.transform = 'none'; scrim.style.opacity = 1; }
    (kb ? links()[0] : panel).focus({ preventScroll: true });
  }
  function closeMenu() {
    if (!isOpen) return; isOpen = false; openBtn.setAttribute('aria-expanded', 'false'); drawer.style.pointerEvents = 'none'; // a tap during the close animation reaches the menu button and re-opens
    const done = () => { if (isOpen) return; drawer.hidden = true; drawer.style.pointerEvents = ''; root.classList.remove('menu-open'); window.__lenis?.start(); lastFocus?.focus?.({ preventScroll: true }); };
    if (window.gsap && !reduce) {
      menuTl?.kill();
      menuTl = gsap.timeline({ onComplete: done })
        .to(panel, { xPercent: -100, duration: .5, ease: 'power3.inOut' }, 0)
        .to(scrim, { opacity: 0, duration: .5, ease: 'power3.inOut' }, 0);
    } else done();
  }
  if (drawer) {
    // one owner for the panel transform: GSAP, never the stylesheet's translateX(-100%)
    if (window.gsap) gsap.set(panel, { x: 0, xPercent: -100 }); else addEventListener('load', () => window.gsap && !isOpen && gsap.set(panel, { x: 0, xPercent: -100 }));
    openBtn.addEventListener('click', openMenu);
    drawer.querySelectorAll('[data-menu-close]').forEach((b) => b.addEventListener('click', closeMenu));
    drawer.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => { if (a.getAttribute('href')?.startsWith('#')) closeMenu(); }));
    document.addEventListener('keydown', (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') { e.preventDefault(); closeMenu(); return; }
      if (e.key === 'Tab') {
        const f = [drawer.querySelector('.drawer_close'), ...links()];
        const i = f.indexOf(document.activeElement);
        if (e.shiftKey && (i <= 0)) { e.preventDefault(); f.at(-1).focus(); }
        else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      }
    });
  }

  /* ---------- filters (M11) — works without GSAP ---------- */
  const grid = document.querySelector('[data-grid]');
  if (grid) {
    const btns = [...document.querySelectorAll('[data-filter]')];
    const tiles = [...grid.children];
    const rows = [...document.querySelectorAll('.row')];
    const empty = document.querySelector('[data-empty]');
    let timer;
    const apply = (cat) => {
      btns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filter === cat)));
      clearTimeout(timer);
      const show = (t) => !cat || t.dataset.cat === cat;
      tiles.forEach((t) => { if (!show(t)) t.classList.add('is-out'); });
      timer = setTimeout(() => {
        tiles.forEach((t) => { t.hidden = !show(t); });
        requestAnimationFrame(() => tiles.forEach((t) => { if (show(t)) t.classList.remove('is-out'); }));
        empty.hidden = tiles.some(show);
        rows.forEach((r) => r.classList.toggle('is-dim', !!cat && r.dataset.cat !== cat));
        window.ScrollTrigger?.refresh();
      }, reduce ? 0 : 350);
      const u = new URL(location.href); cat ? u.searchParams.set('flokkur', cat) : u.searchParams.delete('flokkur'); history.replaceState(null, '', u);
    };
    btns.forEach((b) => b.addEventListener('click', () => apply(b.dataset.filter)));
    const start = new URLSearchParams(location.search).get('flokkur');
    if (start && btns.some((b) => b.dataset.filter === start)) apply(start);
  }

  /* ---------- truss geometry (M7), drawn even without GSAP ---------- */
  const truss = document.querySelector('[data-truss]');
  if (truss) {
    const NS = 'http://www.w3.org/2000/svg';
    const L = 60, R = 1140, G = 380, B = 200, BAYS = 12, w = (R - L) / BAYS;
    const top = (x) => 150 - 80 * (1 - Math.abs((x - 600) / 540));
    const add = (x1, y1, x2, y2, cls, bay) => { const l = document.createElementNS(NS, 'line'); Object.entries({ x1, y1, x2, y2 }).forEach(([k, v]) => l.setAttribute(k, v.toFixed(1))); l.setAttribute('class', cls); l.dataset.bay = bay; truss.appendChild(l); };
    add(L, G, L, top(L), 'm-col', -1); add(R, G, R, top(R), 'm-col', -1);
    for (let i = 0; i < BAYS; i++) {
      const x1 = L + i * w, x2 = x1 + w;
      add(x1, B, x2, B, 'm-chord', i); add(x1, top(x1), x2, top(x2), 'm-chord', i);
      add(x2, B, x2, top(x2), 'm-web', i);
      i < BAYS / 2 ? add(x1, B, x2, top(x2), 'm-web', i) : add(x1, top(x1), x2, B, 'm-web', i);
    }
  }

  /* ---------- everything below needs GSAP ---------- */
  const boot = () => {
    if (!window.gsap || !window.ScrollTrigger) { root.classList.remove('motion'); return; }
    gsap.registerPlugin(ScrollTrigger);
    if (reduce) { root.classList.remove('motion'); headerScroll(); return; }

    if (fine && window.Lenis) {
      const lenis = new Lenis({ lerp: .1 });
      window.__lenis = lenis;
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0);
      document.querySelectorAll('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => { const t = document.querySelector(a.getAttribute('href')); if (t) { e.preventDefault(); lenis.scrollTo(t, { duration: 1.4 }); } }));
    }

    headerScroll();
    const firstChap = document.querySelector('.chap.is-first, .hero');

    /* M1 / M13 opening */
    const open = gsap.timeline({ defaults: { ease: EASE } });
    if (firstChap) {
      const ph = firstChap.querySelector('.chap_img');
      open.fromTo(ph, { scale: 1.12, opacity: 0 }, { scale: 1, opacity: 1, duration: matchMedia('(max-width: 759px)').matches ? 1.2 : 1.6, clearProps: 'opacity' }, 0)
        .to(firstChap.querySelectorAll('[data-lines] .ln_i'), { yPercent: 0, y: 0, duration: 1, stagger: .08 }, .25)
        .to(firstChap.querySelectorAll('[data-rise]'), { opacity: 1, y: 0, duration: .8 }, .75)
        .fromTo('.chap_down', { opacity: 0 }, { opacity: 1, duration: .8 }, 1);
    }
    open.fromTo('.hdr', { yPercent: -100 }, { yPercent: 0, duration: .8, clearProps: 'transform' }, .2);

    /* M4 line reveals elsewhere + rise */
    document.querySelectorAll('[data-lines]').forEach((el) => {
      if (firstChap?.contains(el)) return;
      gsap.to(el.querySelectorAll('.ln_i'), { yPercent: 0, y: 0, duration: .9, ease: EASE, stagger: .08, scrollTrigger: { trigger: el.closest('section, .chap') || el, start: el.closest('.chap') ? 'top 60%' : 'top 80%', toggleActions: 'play none none reverse' } });
    });
    document.querySelectorAll('[data-rise]').forEach((el) => {
      if (firstChap?.contains(el)) return;
      gsap.to(el, { opacity: 1, y: 0, duration: .8, ease: EASE, delay: .35, scrollTrigger: { trigger: el.closest('section, .chap') || el, start: el.closest('.chap') ? 'top 60%' : 'top 80%', toggleActions: 'play none none reverse' } });
    });

    /* M2 photo drift + M3 chapter stack */
    const chaps = [...document.querySelectorAll('.chap')];
    chaps.forEach((c, i) => {
      const ph = c.querySelector('.chap_img');
      const drift = gsap.fromTo(ph, { xPercent: 0 }, { xPercent: -1.5, duration: 18, ease: 'sine.inOut', repeat: -1, yoyo: true, paused: true });
      ScrollTrigger.create({ trigger: c, start: 'top bottom', end: 'bottom top', onToggle: (s) => (s.isActive ? drift.play() : drift.pause()) });
      if (i < chaps.length - 1) {
        gsap.to(c.querySelector('.chap_media'), { yPercent: -12, opacity: .5, ease: 'none', scrollTrigger: { trigger: chaps[i + 1], start: 'top bottom', end: 'top top', scrub: true } });
      }
    });

    /* M7 signature span */
    const span = document.querySelector('[data-span]');
    if (span) {
      const members = [...span.querySelectorAll('[data-truss] line')];
      members.forEach((m) => { const len = m.getTotalLength(); m.style.strokeDasharray = len; m.style.strokeDashoffset = len; });
      const num = span.querySelector('[data-count]');
      const lift = span.querySelector('[data-lift]');
      const dim = span.querySelector('.dim_line');
      const dimLen = dim.getTotalLength(); dim.style.strokeDasharray = dimLen; dim.style.strokeDashoffset = dimLen;
      const counter = { v: 0 };
      const tl = gsap.timeline({ scrollTrigger: { trigger: span, start: 'top top', end: 'bottom bottom', scrub: .6 } });
      const cols = members.filter((m) => m.dataset.bay === '-1');
      tl.to(cols, { strokeDashoffset: 0, duration: .08, ease: 'none' }, 0);
      for (let b = 0; b < 12; b++) tl.to(members.filter((m) => m.dataset.bay === String(b)), { strokeDashoffset: 0, duration: .06, stagger: .012, ease: 'none' }, .08 + b * .055);
      tl.to(dim, { strokeDashoffset: 0, duration: .66, ease: 'none' }, .08)
        .to(counter, { v: 96, duration: .66, ease: 'none', onUpdate: () => { num.textContent = Math.round(counter.v); } }, .08)
        .fromTo('[data-hook]', { y: 50 }, { y: -95, duration: .3, ease: 'none' }, .58)
        .fromTo(lift, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .1, ease: 'none' }, .8)
        .to({}, { duration: .1 }, .9);
      num.textContent = '0';
    }

    /* M8 numbers */
    document.querySelectorAll('.nums_n[data-count]').forEach((el) => {
      const n = +el.dataset.count, sep = el.dataset.sep === '1', suf = el.textContent.replace(/[\d.]/g, ''), o = { v: n === 2003 ? 1990 : 0 };
      const fmt = (v) => (sep ? new Intl.NumberFormat('is-IS').format(Math.round(v)) : Math.round(v)) + suf;
      el.textContent = fmt(o.v);
      gsap.to(o, { v: n, duration: 1.4, ease: 'power2.out', onUpdate: () => { el.textContent = fmt(o.v); }, scrollTrigger: { trigger: el, start: 'top 75%', once: true } });
    });

    /* M9 tiles */
    ScrollTrigger.batch('.tile, .pn_a', {
      start: 'top 85%', once: true,
      onEnter: (els) => els.forEach((t, i) => {
        gsap.fromTo(t.querySelector('.tile_media, .pn_media'), { clipPath: 'inset(12% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1, ease: EASE, delay: i * .12, clearProps: 'clipPath' });
        gsap.fromTo(t.querySelector('img'), { scale: 1.15 }, { scale: 1, duration: 1.1, ease: EASE, delay: i * .12, clearProps: 'transform' });
        gsap.fromTo(t.querySelector('.tile_meta, .pn_l'), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: .8, ease: EASE, delay: i * .12 + .2, clearProps: 'all' });
      }),
    });

    /* M12 timeline */
    document.querySelectorAll('[data-st]').forEach((st) => {
      const tl = gsap.timeline({ defaults: { ease: EASE }, scrollTrigger: { trigger: st, start: 'top 80%', once: true } });
      tl.fromTo(st.querySelector('.tl_dot'), { scale: 0 }, { scale: 1, duration: .6 }, 0)
        .fromTo(st.querySelector('.tl_fig'), { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1, clearProps: 'clipPath' }, .05)
        .fromTo(st.querySelector('.tl_text'), { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: .9, clearProps: 'all' }, .15);
    });

    /* M15 project photo parallax (desktop) */
    if (!matchMedia('(max-width: 759px)').matches) document.querySelectorAll('[data-par] img').forEach((im) => gsap.fromTo(im, { yPercent: -6 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: im.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } }));

    /* M16 footer + section blocks */
    gsap.from('.ftr_logo, .ftr_cols > div', { opacity: 0, y: 20, duration: .8, ease: EASE, stagger: .06, clearProps: 'all', scrollTrigger: { trigger: '.ftr', start: 'top 85%', once: true } });
    document.querySelectorAll('.svc_item, .partners_list li, .row, .contact_card, .intro_cols p').forEach((el) => gsap.from(el, { opacity: 0, y: 24, duration: .8, ease: EASE, clearProps: 'all', scrollTrigger: { trigger: el, start: 'top 88%', once: true } }));

    addEventListener('load', () => ScrollTrigger.refresh());
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
  };

  /* M5 header: solid after first screen, hides on scroll down */
  function headerScroll() {
    const hdr = document.querySelector('[data-hdr]'); if (!hdr) return;
    let last = 0;
    const on = () => {
      const chapEnd = document.querySelector('.chapters'); const y = scrollY, h = chapEnd ? chapEnd.offsetTop + chapEnd.offsetHeight - innerHeight * .15 : innerHeight * .85;
      hdr.classList.toggle('is-solid', y > h);
      if (!isOpen) hdr.classList.toggle('is-hidden', y > h && y > last + 2);
      if (y < last - 2 || y < h) hdr.classList.remove('is-hidden');
      last = y;
    };
    addEventListener('scroll', on, { passive: true }); on();
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') boot();
  else document.addEventListener('DOMContentLoaded', boot);
  // fail-safe: never leave content hidden
  setTimeout(() => { if (!window.gsap) root.classList.remove('motion'); }, 3000);
})();
