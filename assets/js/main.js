/* Borgarafl v3 — motion from Kononenko's bundle (values: _docs/borgarafl-2026-11-15/MOTION.md) */
(() => {
  const html = document.documentElement;
  const mqReduce = matchMedia('(prefers-reduced-motion: reduce)');
  const reduce = mqReduce.matches;
  if (reduce) html.classList.add('reduce');
  mqReduce.addEventListener?.('change', () => location.reload()); // preference flipped while running: rebuild in the right mode
  const hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  const motion = hasGsap && !reduce;
  const EASE = 'custom';
  const DUR = 1.109; // K customdefault
  const store = { get: (k) => { try { return sessionStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { v == null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v); } catch {} } };

  if (hasGsap) {
    gsap.registerPlugin(ScrollTrigger);
    // cubic-bezier(.17,.84,.44,1) and wipeFront (.8,0,.2,1) as GSAP eases (no CustomEase plugin shipped)
    const bez = (x1, y1, x2, y2) => (t) => { let a = 0, b = 1, m = t; for (let i = 0; i < 24; i++) { m = (a + b) / 2; const u = 1 - m; const x = 3 * u * u * m * x1 + 3 * u * m * m * x2 + m * m * m; if (x < t) a = m; else b = m; } const u = 1 - m; return 3 * u * u * m * y1 + 3 * u * m * m * y2 + m * m * m; };
    gsap.registerEase('custom', bez(0.17, 0.84, 0.44, 1));
    gsap.registerEase('wipeFront', bez(0.8, 0, 0.2, 1));
    gsap.defaults({ ease: EASE, duration: DUR, overwrite: 'auto' });
    ScrollTrigger.config({ ignoreMobileResize: true });
  }

  /* ---------- Lenis (K: v1.3, lerp .1, wheelMultiplier 1, native touch) ---------- */
  let lenis = null;
  if (motion && typeof window.Lenis !== 'undefined') {
    lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1, syncTouch: false });
    window.__lenis = lenis; // test hook: qa/inputs.mjs resets through Lenis so its target matches
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  /* ---------- header: lockup → round mark; light/dark by section; solid bar once scrolled; hides on the way down ---------- */
  const hdr = document.querySelector('[data-hdr]');
  const root = document.documentElement;
  const darks = () => document.querySelectorAll('[data-theme="dark"]');
  let lastY = scrollY;
  const paintHeader = () => {
    if (!hdr) return;
    const y = scrollY, dy = y - lastY; lastY = y;
    hdr.classList.toggle('is-small', y > 40);
    hdr.classList.toggle('is-bar', y > 40);
    if (!root.classList.contains('menu-open') && !hdr.contains(document.activeElement)) {
      if (dy > 4 && y > 320) hdr.classList.add('is-hidden');
      else if (dy < -4 || y < 120) hdr.classList.remove('is-hidden');
    }
    const probe = 30; let dark = false;
    for (const el of darks()) { const r = el.getBoundingClientRect(); if (r.top <= probe && r.bottom > probe) { dark = true; break; } }
    hdr.classList.toggle('on-dark', dark);
  };
  addEventListener('scroll', paintHeader, { passive: true });
  addEventListener('resize', paintHeader);
  hdr?.addEventListener('focusin', () => hdr.classList.remove('is-hidden'));
  paintHeader();

  /* ---------- menu (tablet + phone): pointer open focuses the panel, keyboard open the first link (focus-guard rule) ---------- */
  const mBtn = document.querySelector('[data-menu-btn]');
  const menu = document.querySelector('[data-menu]');
  const mLbl = document.querySelector('[data-menu-lbl]');
  let mTimer = 0;
  const menuFocusables = () => [mBtn, ...menu.querySelectorAll('a[href]')];
  const openMenu = (viaKey) => {
    clearTimeout(mTimer); menu.hidden = false; void menu.offsetWidth;
    root.classList.add('menu-open'); hdr.classList.remove('is-hidden');
    mBtn.setAttribute('aria-expanded', 'true'); mLbl.textContent = 'Loka';
    lenis?.stop(); document.body.style.overflow = 'hidden';
    (viaKey ? menu.querySelector('a[href]') : menu).focus({ preventScroll: true });
  };
  const closeMenu = (refocus) => {
    if (!root.classList.contains('menu-open')) return;
    root.classList.remove('menu-open');
    mBtn.setAttribute('aria-expanded', 'false'); mLbl.textContent = 'Valmynd';
    lenis?.start(); document.body.style.overflow = '';
    mTimer = setTimeout(() => { menu.hidden = true; }, 460);
    if (refocus) mBtn.focus({ preventScroll: true });
  };
  if (mBtn && menu) {
    mBtn.addEventListener('click', (e) => root.classList.contains('menu-open') ? closeMenu(e.detail === 0) : openMenu(e.detail === 0));
    addEventListener('keydown', (e) => {
      if (!root.classList.contains('menu-open')) return;
      if (e.key === 'Escape') { e.preventDefault(); closeMenu(true); return; }
      if (e.key !== 'Tab') return;
      const f = menuFocusables(), i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && (i === f.length - 1 || i === -1)) { e.preventDefault(); f[i === -1 ? 0 : 0].focus(); }
    });
    matchMedia('(min-width: 960px)').addEventListener('change', (m) => { if (m.matches) closeMenu(false); });
    addEventListener('pageshow', () => closeMenu(false));
  }

  /* ---------- line splitting (K SplitText "linereveal") ---------- */
  const splitLines = (el) => {
    if (!el.dataset.src) el.dataset.src = el.innerHTML;
    el.innerHTML = el.dataset.src;
    const toks = [];
    [...el.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        n.textContent.split(/(\s+)/).forEach((w) => {
          if (!w) return;
          if (/^\s+$/.test(w)) { toks.push(document.createTextNode(' ')); return; }
          const s = document.createElement('span'); s.textContent = w; s.className = 'tk'; toks.push(s);
        });
      } else if (n.nodeName === 'BR') { const s = document.createElement('span'); s.className = 'tk tk-br'; toks.push(s, document.createElement('br')); }
      else { const s = document.createElement('span'); s.className = 'tk'; s.appendChild(n.cloneNode(true)); toks.push(s); }
    });
    el.textContent = ''; toks.forEach((t) => el.appendChild(t));
    const lines = []; let top = null, cur = null;
    toks.forEach((t) => {
      if (t.nodeType !== 1 || t.nodeName === 'BR') return;
      const y = t.offsetTop;
      if (top === null || Math.abs(y - top) > 3) { cur = []; lines.push(cur); top = y; }
      if (!t.classList.contains('tk-br')) cur.push(t);
    });
    el.textContent = '';
    lines.forEach((ln) => {
      if (!ln.length) return;
      const m = document.createElement('span'); m.className = 'ln-m';
      const i = document.createElement('span'); i.className = 'ln';
      ln.forEach((t, k) => { if (k) i.appendChild(document.createTextNode(' ')); while (t.firstChild) i.appendChild(t.firstChild); });
      m.appendChild(i); el.appendChild(m);
    });
    el.classList.add('is-split');
    return el.querySelectorAll('.ln');
  };

  const fontsReady = Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise((r) => setTimeout(r, 1500))]);

  /* ---------- page wipe (K wipeFront .8,0,.2,1) ---------- */
  const wipe = document.querySelector('.wipe');
  const fromWipe = html.classList.contains('from-wipe');
  store.set('bwipe', null);
  const wipeIn = () => {
    if (!wipe) return;
    // first load = K's simple loader (logo mark on white, then the same wipe); internal navigation = black wipe
    if (fromWipe && motion) {
      const load = html.classList.contains('is-load');
      gsap.fromTo(wipe, { clipPath: 'inset(0% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.8, ease: 'wipeFront', delay: load ? 0.35 : 0, onComplete: () => html.classList.remove('from-wipe', 'is-load') });
    } else html.classList.remove('from-wipe', 'is-load');
  };
  addEventListener('pageshow', (e) => { if (e.persisted && wipe) { if (hasGsap) gsap.set(wipe, { clipPath: 'inset(100% 0% 0% 0%)' }); html.classList.remove('from-wipe', 'is-load'); } });
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-wipe]');
    if (!a || !motion || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === '_blank') return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || (url.pathname === location.pathname && url.hash)) return;
    e.preventDefault();
    store.set('bwipe', '1');
    gsap.fromTo(wipe, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.8, ease: 'wipeFront', onComplete: () => { location.href = url.href; } });
    setTimeout(() => { location.href = url.href; }, 1400);
  });

  /* ---------- hero film: their Vimeo drone film as background ---------- */
  const film = document.querySelector('[data-film]');
  if (film && !reduce && !navigator.connection?.saveData) {
    const start = () => {
      const f = document.createElement('iframe');
      f.src = `https://player.vimeo.com/video/${film.dataset.film}?background=1&autoplay=1&loop=1&muted=1&dnt=1`;
      f.title = 'Myndband af uppsetningu'; f.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture'); f.tabIndex = -1;
      addEventListener('message', (ev) => {
        if (ev.origin !== 'https://player.vimeo.com') return;
        let d = ev.data; try { if (typeof d === 'string') d = JSON.parse(d); } catch { return; }
        if (d?.event === 'ready') f.contentWindow.postMessage(JSON.stringify({ method: 'addEventListener', value: 'playing' }), '*');
        if (d?.event === 'playing') setTimeout(() => film.classList.add('is-on'), 600);
      });
      film.appendChild(f);
      const tg = document.querySelector('[data-film-toggle]');
      tg?.addEventListener('click', () => {
        const paused = tg.getAttribute('aria-pressed') === 'true';
        f.contentWindow?.postMessage(JSON.stringify({ method: paused ? 'play' : 'pause' }), '*');
        tg.setAttribute('aria-pressed', String(!paused)); tg.textContent = paused ? 'Stöðva myndband' : 'Spila myndband';
      });
    };
    if (document.readyState === 'complete') setTimeout(start, 300); else addEventListener('load', () => setTimeout(start, 300), { once: true });
  }

  /* ---------- about film: click to play with sound ---------- */
  document.querySelectorAll('[data-video]').forEach((box) => {
    const btn = box.querySelector('.film_play');
    btn?.addEventListener('click', () => {
      const f = document.createElement('iframe');
      f.src = `https://player.vimeo.com/video/${box.dataset.video}?autoplay=1&title=0&byline=0&portrait=0&dnt=1`;
      f.title = 'Myndband frá Borgarafli'; f.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture'); f.setAttribute('allowfullscreen', '');
      box.appendChild(f); box.classList.add('is-playing'); f.focus();
    });
  });

  /* ---------- partner orbit pause ---------- */
  document.querySelectorAll('[data-orbit-toggle]').forEach((b) => b.addEventListener('click', () => {
    const sec = b.closest('.discs'); const on = sec.classList.toggle('is-paused');
    b.setAttribute('aria-pressed', String(on)); b.textContent = on ? 'Halda áfram' : 'Stöðva hreyfingu';
  }));

  /* ---------- work page view pill (K Grid / List) ---------- */
  const wpage = document.querySelector('.wpage');
  if (wpage) {
    const btns = wpage.querySelectorAll('[data-set-view]');
    const setView = (v, animate) => {
      wpage.dataset.view = v; store.set('bview', v);
      const u = new URL(location.href); if (v === 'list') u.searchParams.set('syn', 'listi'); else u.searchParams.delete('syn'); history.replaceState(null, '', u);
      btns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.setView === v)));
      if (hasGsap) ScrollTrigger.refresh();
      if (animate && motion) {
        const items = v === 'grid' ? wpage.querySelectorAll('.wpage_grid .wk, .wpage_earlier') : wpage.querySelectorAll('.wpage_list .row');
        gsap.fromTo(items, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 1.2, ease: 'expo.out', stagger: { each: 0.04 }, overwrite: true });
      }
    };
    btns.forEach((b) => b.addEventListener('click', () => setView(b.dataset.setView, true)));
    const q = new URLSearchParams(location.search).get('syn');
    if (q === 'listi' || (!q && store.get('bview') === 'list')) setView('list', false);
  }

  /* ---------- fullscreen viewer (K: expands from where you clicked) ---------- */
  const layer = document.querySelector('[data-zoom-layer]');
  if (layer) {
    let open = null, opener = null;
    const close = () => {
      if (!open) return;
      const { clone, from } = open; open = null;
      const done = () => { layer.hidden = true; clone.remove(); lenis?.start(); opener?.focus({ preventScroll: true }); };
      if (motion) { const r = from.getBoundingClientRect(); gsap.to(clone, { left: r.left, top: r.top, width: r.width, height: r.height, duration: 0.8, ease: 'expo.out', onComplete: done }); gsap.to(layer, { backgroundColor: 'rgba(0,0,0,0)', duration: 0.6 }); }
      else done();
    };
    document.querySelectorAll('[data-zoom]').forEach((b) => b.addEventListener('click', (e) => {
      const im = b.querySelector('img'); const r = im.getBoundingClientRect();
      const clone = im.cloneNode(); clone.removeAttribute('loading'); clone.sizes = '100vw'; clone.alt = im.alt;
      Object.assign(clone.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px', objectFit: 'cover' });
      layer.hidden = false; layer.appendChild(clone); lenis?.stop(); opener = b;
      open = { clone, from: im };
      const m = 8; const W = innerWidth - m * 2, H = innerHeight - m * 2; const ar = im.naturalWidth / im.naturalHeight || 4 / 3;
      let w = W, h = W / ar; if (h > H) { h = H; w = H * ar; }
      const to = { left: (innerWidth - w) / 2, top: (innerHeight - h) / 2, width: w, height: h };
      if (motion) { gsap.fromTo(layer, { backgroundColor: 'rgba(0,0,0,0)' }, { backgroundColor: 'rgba(0,0,0,.92)', duration: 0.6 }); gsap.to(clone, { ...to, duration: 1.2, ease: 'expo.out' }); }
      else Object.assign(clone.style, { left: to.left + 'px', top: to.top + 'px', width: to.width + 'px', height: to.height + 'px' });
      // focus guard: pointer open focuses the layer, keyboard open the close button
      if (e.detail === 0) layer.querySelector('[data-zoom-close]').focus(); else { layer.tabIndex = -1; layer.focus({ preventScroll: true }); }
    }));
    layer.addEventListener('click', (e) => { if (e.target === layer || e.target.closest('[data-zoom-close]') || e.target.tagName === 'IMG') close(); });
    addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  }

  /* ---------- 404 layered parallax ---------- */
  const nf = document.querySelector('[data-nf]');
  if (nf && motion) {
    const layers = nf.querySelectorAll('[data-depth]');
    addEventListener('pointermove', (e) => {
      const dx = e.clientX / innerWidth - 0.5, dy = e.clientY / innerHeight - 0.5;
      layers.forEach((l) => { const d = +l.dataset.depth; gsap.to(l, { x: -dx * d * innerWidth, y: -dy * d * innerHeight, duration: 1.2, ease: 'expo.out' }); });
    });
  }

  /* ---------- sketch reveal (K shader: luminance → ink, thresholded against scroll progress + noise) ---------- */
  const sketches = [...document.querySelectorAll('[data-sketch]')];
  const initSketch = (sec) => {
    const cv = sec.querySelector('canvas'); const fb = sec.querySelector('.sketch_fb');
    const gl = cv.getContext('webgl', { premultipliedAlpha: false, antialias: false });
    if (!gl) { html.classList.add('no-webgl'); return null; }
    const vs = 'attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;v.y=1.-v.y;gl_Position=vec4(p,0.,1.);}';
    const fs = `precision mediump float;varying vec2 v;uniform sampler2D t;uniform float pr;uniform vec2 px;uniform vec2 sc;uniform vec2 of;
      float h(vec2 q){return fract(sin(dot(q,vec2(127.1,311.7)))*43758.5453);}
      float n(vec2 q){vec2 i=floor(q),f=fract(q);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
      float L(vec2 u){return dot(texture2D(t,u).rgb,vec3(.299,.587,.114));}
      void main(){vec2 u=v*sc+of;
        float c=L(u);
        float gx=L(u+vec2(px.x,0.))-L(u-vec2(px.x,0.)); float gy=L(u+vec2(0.,px.y))-L(u-vec2(0.,px.y));
        float e=smoothstep(.05,.32,length(vec2(gx,gy))*2.2);
        float ink=clamp(e+(1.-c)*.08-.03,0.,1.);
        float nz=n(v*vec2(9.,7.))*.55+n(v*vec2(38.,30.))*.25;
        float th=1.05-pr*1.45;
        float on=smoothstep(th,th+.12,ink*.9+nz*.45);
        float a=on*smoothstep(.1,.6,ink)*.92;
        vec3 paper=vec3(1.);
        vec3 col=mix(paper,vec3(.07),a);
        vec3 photo=texture2D(t,u).rgb;
        float k=smoothstep(.78,1.,pr);
        gl_FragColor=vec4(mix(col,photo,k),1.);}`;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { html.classList.add('no-webgl'); return null; }
    gl.useProgram(prog);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = (n) => gl.getUniformLocation(prog, n);
    const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
    let iw = 4, ih = 3, prog_ = 0, ready = false;
    const im = new Image(); im.decoding = 'async';
    im.src = innerWidth < 760 ? sec.dataset.sketch.replace('.webp', '-s.webp') : sec.dataset.sketch;
    const size = () => {
      const r = cv.getBoundingClientRect(); const d = Math.min(devicePixelRatio || 1, 2);
      cv.width = Math.max(2, Math.round(r.width * d)); cv.height = Math.max(2, Math.round(r.height * d));
      gl.viewport(0, 0, cv.width, cv.height);
      const ca = r.width / r.height, ia = iw / ih; let sx = 1, sy = 1; if (ca > ia) sy = ia / ca; else sx = ca / ia;
      gl.uniform2f(U('sc'), sx, sy); gl.uniform2f(U('of'), (1 - sx) / 2, (1 - sy) / 2);
      gl.uniform2f(U('px'), 1.4 / iw, 1.4 / ih);
    };
    const draw = () => { if (!ready) return; gl.uniform1f(U('pr'), prog_); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); };
    im.onload = () => { iw = im.naturalWidth; ih = im.naturalHeight; gl.bindTexture(gl.TEXTURE_2D, tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im); ready = true; size(); draw(); };
    im.onerror = () => { fb.style.opacity = 1; };
    addEventListener('resize', () => { size(); draw(); });
    return { set: (p) => { prog_ = p; draw(); } };
  };

  /* ---------- reveals ---------- */
  const run = () => {
    if (!motion) {
      document.querySelectorAll('[data-lines]').forEach((el) => el.classList.add('is-split'));
      if (wipe) wipe.style.clipPath = 'inset(100% 0 0 0)';
      html.classList.remove('from-wipe', 'is-load');
      sketches.forEach((s) => { s.querySelector('.sketch_fb').style.opacity = 1; });
      return;
    }
    wipeIn();
    const st = (trigger, extra = {}) => ({ trigger, start: 'top bottom-=15%', once: true, ...extra });

    // hero: media scale 1.1 → 1 over 2.4 s, name lines roll in, then parallax
    document.querySelectorAll('[data-hero-media]').forEach((m) => {
      const im = m.querySelector('img');
      gsap.from(im, { scale: 1.1, duration: 2.4 });
      gsap.to(m, { yPercent: 20, ease: 'none', scrollTrigger: { trigger: m.parentElement, start: 'top top', end: 'bottom top', scrub: true } });
    });

    // lines (K .ln yPercent 101, stagger lines × .03)
    document.querySelectorAll('[data-lines]').forEach((el) => {
      const lines = splitLines(el);
      const inHero = el.closest('.hero, .ahero');
      gsap.set(lines, { yPercent: 101 });
      const tw = { yPercent: 0, stagger: 0.05, delay: inHero ? 0.35 : (el.closest('.stmt_cols, .ring_stats') ? 0.162 : 0) };
      if (inHero) gsap.to(lines, tw);
      else gsap.to(lines, { ...tw, scrollTrigger: st(el) });
    });

    // photo windows: image parallax inside its clip
    document.querySelectorAll('[data-par]').forEach((w) => {
      const im = w.querySelector('img');
      gsap.fromTo(im, { yPercent: -8, scale: 1.2 }, { yPercent: 8, scale: 1.2, ease: 'none', scrollTrigger: { trigger: w, start: 'top bottom', end: 'bottom top', scrub: true } });
    });

    // tables: rows rise, rules draw (stagger .04)
    document.querySelectorAll('[data-rows]').forEach((t) => {
      const rows = t.querySelectorAll('.row_in'); const rules = t.querySelectorAll('.rule');
      const tl = gsap.timeline({ defaults: { stagger: 0.04 }, scrollTrigger: st(t) });
      tl.from(rows, { yPercent: 101 }).from(rules, { scaleX: 0, transformOrigin: 'left' }, 0);
    });

    // works: each card arrives from a different edge (K project entrances), 1.2 s expo.out
    const FROM = [{ x: '-12vw' }, { x: '12vw' }, { y: '18vh' }, { x: '12vw' }];
    document.querySelectorAll('[data-wk]').forEach((c, i) => {
      gsap.fromTo(c, { ...FROM[i % 4], opacity: 0 }, { x: 0, y: 0, opacity: 1, duration: 1.2, ease: 'expo.out', scrollTrigger: st(c) });
      gsap.from(c.querySelector('img'), { scale: 1.15, duration: 1.2, ease: 'expo.out', scrollTrigger: st(c) });
    });

    // footer logo rises from its mask
    document.querySelectorAll('[data-rise]').forEach((el) => gsap.from(el.firstElementChild, { yPercent: 101, scrollTrigger: st(el) }));

    // radial: lines rotate + grow, ground turns black past the middle
    document.querySelectorAll('[data-radial]').forEach((sec) => {
      const lines = sec.querySelector('.radial_lines'); const bars = sec.querySelectorAll('.rl i');
      gsap.set(bars, { scaleX: 0.2 });
      ScrollTrigger.create({
        trigger: sec, start: 'top top', end: 'bottom bottom', scrub: 1,
        onUpdate: (s) => {
          const p = s.progress; const spin = p * 45;
          lines.style.transform = `rotate(${spin}deg)`; lines.style.setProperty('--spin', `${spin}deg`);
          gsap.set(bars, { scaleX: 0.2 + 0.8 * Math.min(1, p * 1.6) });
          const dark = p > 0.5; sec.classList.toggle('is-dark', dark);
          if (dark) sec.dataset.theme = 'dark'; else delete sec.dataset.theme;
          paintHeader();
        },
      });
    });

    // ring: scroll turns the photo wheel
    document.querySelectorAll('[data-ring]').forEach((sec) => {
      gsap.fromTo(sec.querySelector('.ring_wheel'), { rotate: 0 }, { rotate: -120, ease: 'none', scrollTrigger: { trigger: sec.querySelector('.ring_stage'), start: 'top bottom', end: 'bottom top', scrub: 1 } });
    });

    // sketches
    sketches.forEach((sec) => {
      const s = initSketch(sec);
      if (!s) { sec.querySelector('.sketch_fb').style.opacity = 1; return; }
      ScrollTrigger.create({ trigger: sec, start: 'top 80%', end: 'center 35%', scrub: 1, onUpdate: (t) => s.set(t.progress), onRefresh: (t) => s.set(t.progress) });
    });

    ScrollTrigger.refresh();
    let w = innerWidth;
    addEventListener('resize', () => { if (Math.abs(innerWidth - w) < 40) return; w = innerWidth; document.querySelectorAll('[data-lines].is-split').forEach((el) => { const ls = splitLines(el); gsap.set(ls, { yPercent: 0 }); }); ScrollTrigger.refresh(); });
  };
  fontsReady.then(run);
})();
