(() => {
  const EMAIL = 'hello@noelalondon.com';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  gsap.registerPlugin(ScrollTrigger);

  /* ---------- smooth scroll ---------- */
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }
  const scrollTo = target => lenis ? lenis.scrollTo(target, { offset: 0, duration: 1.4 }) : $(target)?.scrollIntoView({ behavior: 'smooth' });
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id.length < 2 || !$(id)) return;
    e.preventDefault();
    closeMenu();
    scrollTo(id);
  }));

  /* ---------- toast ---------- */
  const toast = $('#toast');
  let toastT;
  const say = msg => { toast.textContent = msg; toast.classList.add('is-on'); clearTimeout(toastT); toastT = setTimeout(() => toast.classList.remove('is-on'), 3200); };

  /* ---------- loader + hero intro ---------- */
  document.body.classList.add('is-loading');
  const heroIntro = () => {
    gsap.timeline()
      .from('.hero__title .word', { yPercent: 115, duration: 1.4, stagger: .12, ease: 'expo.out' })
      .from('.hero__eyebrow, .hero__sub, .hero__actions, .hero__scroll', { y: 24, opacity: 0, duration: 1, stagger: .08, ease: 'power3.out' }, '-=1')
      .from('.nav', { yPercent: -100, opacity: 0, duration: 1, ease: 'power3.out' }, '-=1.1');
  };
  const finishLoad = () => {
    document.body.classList.remove('is-loading');
    lenis && lenis.start();
    ScrollTrigger.refresh();
  };
  if (reduce) { $('#loader').remove(); finishLoad(); }
  else {
    const c = { v: 0 };
    gsap.timeline({ onComplete: finishLoad })
      .to('.loader__word span', { y: 0, duration: 1.1, stagger: .07, ease: 'expo.out' })
      .to('.loader__script', { opacity: 1, duration: .8 }, '-=.6')
      .to(c, { v: 100, duration: 1.6, ease: 'power2.inOut', onUpdate: () => $('#loaderCount').textContent = Math.round(c.v) }, 0)
      .to('.loader__word span', { yPercent: -110, duration: .8, stagger: .04, ease: 'expo.in' }, '+=.2')
      .to('.loader__script, .loader__count', { opacity: 0, duration: .4 }, '<')
      .to('#loader', { clipPath: 'inset(0 0 100% 0)', duration: 1.1, ease: 'expo.inOut' }, '-=.2')
      .add(heroIntro, '-=.6')
      .set('#loader', { display: 'none' });
  }

  /* ---------- magnetic buttons ---------- */
  if (fine) {
    $$('.magnetic').forEach(el => {
      const inner = el.querySelector('span');
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const mx = e.clientX - r.left - r.width / 2, my = e.clientY - r.top - r.height / 2;
        gsap.to(el, { x: mx * .25, y: my * .35, duration: .5, ease: 'power3' });
        gsap.to(inner, { x: mx * .12, y: my * .15, duration: .5, ease: 'power3' });
      });
      el.addEventListener('pointerleave', () => gsap.to([el, inner], { x: 0, y: 0, duration: .9, ease: 'elastic.out(1,.4)' }));
    });
  }

  /* ---------- nav ---------- */
  const nav = $('#nav');
  let lastY = 0;
  const onScroll = y => {
    nav.classList.toggle('is-solid', y > innerHeight * .8);
    nav.classList.toggle('is-hidden', y > lastY && y > innerHeight && !document.body.classList.contains('menu-open'));
    lastY = y;
  };
  lenis ? lenis.on('scroll', e => onScroll(e.scroll)) : addEventListener('scroll', () => onScroll(scrollY), { passive: true });
  const menu = $('#menu');
  function closeMenu() { menu.classList.remove('is-open'); document.body.classList.remove('menu-open'); }
  $('#burger').addEventListener('click', () => {
    const open = !menu.classList.contains('is-open');
    menu.classList.toggle('is-open', open); document.body.classList.toggle('menu-open', open);
  });

  /* ---------- hero parallax + cocoa dust ---------- */
  if (!reduce) {
    gsap.to('.hero__video', { yPercent: 12, scale: 1.08, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.hero__content', { yPercent: -18, opacity: .2, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  }
  (() => {
    const cv = $('#dust'), hero = $('#hero');
    if (!cv || reduce) return;
    const ctx = cv.getContext('2d');
    const cols = ['#C9A45C', '#E8C878', '#6b4433', '#E9A994', '#3B2A24'];
    let W, H, dpr, parts = [], running = true;
    const size = () => { dpr = Math.min(devicePixelRatio, 2); W = cv.width = hero.clientWidth * dpr; H = cv.height = hero.clientHeight * dpr; };
    size(); addEventListener('resize', size);
    const spawn = (x, y, n, vx = 0, vy = 0) => {
      for (let i = 0; i < n && parts.length < 260; i++) parts.push({
        x, y, vx: vx * .15 + (Math.random() - .5) * 1.4 * dpr, vy: vy * .15 + (Math.random() - .7) * 1.2 * dpr,
        r: (Math.random() * 2.4 + .6) * dpr, a: 1, c: cols[(Math.random() * cols.length) | 0], rot: Math.random() * 6, flake: Math.random() < .35
      });
    };
    ScrollTrigger.create({ trigger: hero, start: 'top bottom', end: 'bottom top', onToggle: s => { running = s.isActive; if (running) loop(); } });
    function loop() {
      if (!running) return;
      ctx.clearRect(0, 0, W, H);
      if (Math.random() < .35) spawn(Math.random() * W, -10, 1);
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.vy += .035 * dpr; p.vx *= .985; p.x += p.vx; p.y += p.vy; p.rot += .05; p.a -= .004;
        if (p.a <= 0 || p.y > H + 20) { parts.splice(i, 1); continue; }
        ctx.globalAlpha = p.a; ctx.fillStyle = p.c;
        if (p.flake) { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillRect(-p.r * 1.6, -p.r * .6, p.r * 3.2, p.r * 1.2); ctx.restore(); }
        else { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill(); }
      }
      requestAnimationFrame(loop);
    }
    loop();
  })();

  /* ---------- statement word reveal ---------- */
  const st = $('#statement');
  st.innerHTML = st.textContent.trim().split(/\s+/).map(w => `<span class="w">${w}</span>`).join(' ');
  if (reduce) gsap.set('.statement__text .w', { opacity: 1 });
  else gsap.to('.statement__text .w', { opacity: 1, stagger: .05, ease: 'none', scrollTrigger: { trigger: st, start: 'top 80%', end: 'bottom 45%', scrub: true } });
  gsap.from('.statement__pills span', { y: 20, opacity: 0, stagger: .06, duration: .8, ease: 'power3.out', scrollTrigger: { trigger: '.statement__pills', start: 'top 90%' } });

  /* ---------- the dip ---------- */
  (() => {
    const steps = $$('.dip__steps li'), cap = $('#dipCaption'), bar = $('#dipBar');
    const caps = ['Persian date', 'A whole nut', 'Dark cocoa', 'Noéla'];
    const level = $('#chocLevel'), nut = $('#nut');
    const s = window.__dipState = { nutY: -260, nutO: 0, choc: 600, drizzle: 1600, gold: 0 };
    const render = () => {
      nut.setAttribute('transform', `translate(0 ${s.nutY})`); nut.setAttribute('opacity', s.nutO);
      level.setAttribute('transform', `translate(${waveX} ${s.choc})`);
      $('#drizzle').style.strokeDashoffset = s.drizzle;
      $$('#gold path').forEach((p, i) => { const o = gsap.utils.clamp(0, 1, s.gold * 4 - i * .6); p.style.opacity = o; p.style.transform = `translateY(${(1 - o) * -30}px)`; });
    };
    let cur = -1, waveX = 0;
    if (!reduce) gsap.ticker.add(() => { waveX = (waveX - 1.2) % 200; if (s.choc < 560) level.setAttribute('transform', `translate(${waveX} ${s.choc})`); });
    const setStep = i => {
      if (i === cur) return; cur = i;
      steps.forEach((li, k) => li.classList.toggle('is-active', k === i));
      gsap.fromTo(cap, { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: .5, overwrite: true });
      cap.textContent = caps[i];
    };
    const tl = gsap.timeline({ defaults: { ease: 'none' }, onUpdate: render })
      .to(s, { duration: .12 })
      .to(s, { nutY: 0, nutO: 1, duration: .2, ease: 'power2.out' })
      .to(s, { duration: .08 })
      .to(s, { choc: -40, duration: .3 })
      .to(s, { drizzle: 0, duration: .18 })
      .to(s, { gold: 1, duration: .12 });
    render(); setStep(0);
    ScrollTrigger.create({
      trigger: '.dip', start: 'top top', end: '+=300%', pin: '.dip__pin', scrub: reduce ? true : .8, animation: tl,
      onUpdate: self => { const p = self.progress; bar.style.transform = `scaleX(${p})`; setStep(p < .22 ? 0 : p < .42 ? 1 : p < .72 ? 2 : 3); }
    });
    gsap.to('.date', { rotate: 6, yoyo: true, repeat: -1, duration: 4, ease: 'sine.inOut' });
  })();

  /* ---------- products ---------- */
  (() => {
    const sec = $('#products'), btns = $$('.switch__btn'), pill = $('.switch__pill');
    const notes = {
      date: 'Premium Persian dates: nature\'s own sweetness and fibre. The only sugar we need.',
      nut: { almond: 'Whole almonds, never powders. A real crunch in every bite.', pistachio: 'Crunchy pistachio for heart-healthy fats and a soft, green richness.' },
      cocoa: 'Single-origin dark cocoa, rich in antioxidants and matched for depth and nuance.'
    };
    let flav = 'almond';
    const placePill = () => { const on = $('.switch__btn.is-on'); pill.style.width = on.offsetWidth + 'px'; pill.style.transform = `translateX(${on.offsetLeft - 5}px)`; };
    placePill(); addEventListener('resize', placePill); document.fonts?.ready.then(placePill);
    const set = f => {
      if (f === flav) return; flav = f;
      sec.dataset.flavour = f;
      btns.forEach(b => b.classList.toggle('is-on', b.dataset.f === f)); placePill();
      $$('.pimg').forEach(i => i.classList.toggle('is-on', i.dataset.f === f));
      $$('.pinfo').forEach(a => a.classList.toggle('is-on', a.dataset.f === f));
      gsap.from('.pinfo.is-on > *, .pinfo.is-on li', { y: 26, opacity: 0, duration: .8, stagger: .05, ease: 'power3.out' });
      $('#nutChip').textContent = f === 'almond' ? 'Whole almond' : 'Whole pistachio';
      const on = $('.ingredients__chips .is-on'); if (on) showNote(on.dataset.i);
    };
    btns.forEach(b => b.addEventListener('click', () => set(b.dataset.f)));
    const showNote = k => {
      const n = typeof notes[k] === 'string' ? notes[k] : notes[k][flav];
      gsap.fromTo('#ingNote', { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: .5 }); $('#ingNote').textContent = n;
    };
    $$('.ingredients__chips button').forEach(b => b.addEventListener('click', () => {
      $$('.ingredients__chips button').forEach(x => x.classList.toggle('is-on', x === b)); showNote(b.dataset.i);
    }));
    // tilt
    const media = $('#pMedia');
    if (fine && !reduce) {
      media.addEventListener('pointermove', e => {
        const r = media.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        gsap.to(media, { rotateY: x * 8, rotateX: -y * 8, transformPerspective: 1000, duration: .6, ease: 'power3' });
      });
      media.addEventListener('pointerleave', () => gsap.to(media, { rotateX: 0, rotateY: 0, duration: 1, ease: 'elastic.out(1,.5)' }));
    }
    gsap.from('.quote blockquote', { y: 40, opacity: 0, duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: '.quote', start: 'top 85%' } });
  })();

  /* ---------- manifesto horizontal ---------- */
  ScrollTrigger.matchMedia({
    '(min-width: 901px)': () => {
      const track = $('#mTrack');
      const dist = () => track.scrollWidth - innerWidth;
      const tw = gsap.to(track, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: '.manifesto', start: 'top top', end: () => '+=' + dist(), pin: '.manifesto__pin', scrub: reduce ? true : .6, invalidateOnRefresh: true } });
      $$('.mpanel h3').forEach(h => gsap.from(h, { yPercent: 40, opacity: 0, ease: 'power2.out', scrollTrigger: { trigger: h, containerAnimation: tw, start: 'left 90%', end: 'left 55%', scrub: true } }));
    }
  });

  /* ---------- build a box ---------- */
  (() => {
    const tray = $('#tray'), gift = $('#gift'), seal = $('#boxSeal');
    const slots = Array(9).fill(null);
    let piece = 'almond', ribbon = '#5E6B3A', sealed = false;
    const ribbonNames = { '#5E6B3A': 'Olive', '#AD7B67': 'Terracotta', '#2A1C17': 'Cocoa', '#C9A45C': 'Gold' };
    tray.innerHTML = slots.map((_, i) => `<button class="slot" data-i="${i}" aria-label="Slot ${i + 1}"></button>`).join('');
    const els = $$('.slot', tray);
    const refresh = () => {
      const a = slots.filter(s => s === 'almond').length, p = slots.filter(s => s === 'pistachio').length;
      $('#cA').textContent = a; $('#cP').textContent = p; $('#cE').textContent = 9 - a - p;
      seal.disabled = a + p < 9;
      seal.querySelector('span').textContent = sealed ? 'Send this box →' : 'Seal the box';
    };
    const put = (i, type) => {
      slots[i] = type; const el = els[i];
      el.innerHTML = type ? `<i class="tok tok--${type}"></i>` : '';
      el.classList.toggle('filled', !!type);
      if (type && !reduce) gsap.from(el.firstChild, { y: -70, scale: .6, opacity: 0, duration: .7, ease: 'bounce.out' });
    };
    const unseal = () => { if (!sealed) return; sealed = false; gift.classList.remove('is-sealed'); refresh(); };
    els.forEach((el, i) => el.addEventListener('click', () => { unseal(); put(i, slots[i] === piece ? null : piece); refresh(); }));
    $$('.piece').forEach(b => b.addEventListener('click', () => { piece = b.dataset.p; $$('.piece').forEach(x => x.classList.toggle('is-on', x === b)); }));
    $$('.rib').forEach(b => b.addEventListener('click', () => {
      ribbon = b.dataset.r; gift.style.setProperty('--ribbon', ribbon); $$('.rib').forEach(x => x.classList.toggle('is-on', x === b));
    }));
    $('#boxAuto').addEventListener('click', () => {
      unseal();
      slots.forEach((s, i) => { if (!s) setTimeout(() => { put(i, Math.random() < .5 ? 'almond' : 'pistachio'); refresh(); }, i * 70); });
    });
    $('#boxClear').addEventListener('click', () => { unseal(); slots.forEach((_, i) => put(i, null)); refresh(); });
    const note = $('#note'), noteText = $('#noteText');
    note.addEventListener('input', () => noteText.textContent = note.value.trim() || 'For the one who savours slowly…');
    $('#lid').addEventListener('click', unseal);
    seal.addEventListener('click', () => {
      if (!sealed) {
        sealed = true; gift.classList.add('is-sealed'); refresh();
        gsap.fromTo('#notecard', { rotate: -3 }, { rotate: 4, duration: .25, yoyo: true, repeat: 1, delay: .9 });
        say('Sealed with a ' + ribbonNames[ribbon].toLowerCase() + ' ribbon. Tap send when ready.');
        return;
      }
      const qty = Math.max(1, parseInt($('#qty').value, 10) || 1);
      const a = slots.filter(s => s === 'almond').length;
      const body = [
        'Hello Noéla,', '', 'I would like to order the following gift box:', '',
        `• Almond dates silken in dark cocoa × ${a}`, `• Pistachio dates silken with dark cocoa × ${9 - a}`,
        `• Ribbon: ${ribbonNames[ribbon]}`, `• Number of boxes: ${qty}`,
        `• Gift note: ${note.value.trim() || '(none)'}`, '', 'Thank you!'
      ].join('\n');
      location.href = `mailto:${EMAIL}?subject=${encodeURIComponent('Gift box enquiry: ' + qty + ' box' + (qty > 1 ? 'es' : ''))}&body=${encodeURIComponent(body)}`;
    });
    refresh();
  })();

  /* ---------- story ---------- */
  (() => {
    const path = $('#journeyPath'), len = path.getTotalLength();
    gsap.set(path, { strokeDasharray: `${len}`, strokeDashoffset: len });
    const tl = gsap.timeline({ scrollTrigger: { trigger: '.journey', start: 'top 80%', end: 'bottom 40%', scrub: reduce ? true : 1 } })
      .to(path, { strokeDashoffset: 0, ease: 'none', duration: 1 });
    $$('.jpt').forEach((p, i) => tl.to(p, { opacity: 1, duration: .15 }, i * .28));
    $$('.ftab').forEach(t => t.addEventListener('click', () => {
      $$('.ftab').forEach(x => x.classList.toggle('is-on', x === t));
      $$('.fstory').forEach(s => s.classList.toggle('is-on', s.dataset.who === t.dataset.who));
      gsap.from('.fstory.is-on > *', { y: 24, opacity: 0, stagger: .06, duration: .8, ease: 'power3.out' });
      ScrollTrigger.refresh();
    }));
    gsap.from('.ess', { y: 40, opacity: 0, stagger: .1, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: '.essentials', start: 'top 85%' } });
  })();

  /* ---------- draggable gallery ---------- */
  (() => {
    const rail = $('#rail'), track = $('#railTrack');
    let x = 0, v = 0, down = false, sx = 0, sy = 0, startX = 0, lastX = 0, lastT = 0, axis = null;
    const min = () => Math.min(0, rail.clientWidth - track.scrollWidth);
    const apply = () => gsap.set(track, { x });
    rail.addEventListener('pointerdown', e => { down = true; axis = null; sx = e.clientX; sy = e.clientY; startX = x; lastX = e.clientX; lastT = performance.now(); v = 0; });
    addEventListener('pointermove', e => {
      if (!down) return;
      if (!axis) { const ax = Math.abs(e.clientX - sx), ay = Math.abs(e.clientY - sy); if (ax + ay < 6) return; axis = ax > ay ? 'x' : 'y'; if (axis === 'x') rail.setPointerCapture?.(e.pointerId); }
      if (axis !== 'x') return;
      const now = performance.now(); v = (e.clientX - lastX) / Math.max(1, now - lastT) * 16; lastX = e.clientX; lastT = now;
      x = startX + (e.clientX - sx); const m = min();
      if (x > 0) x *= .35; if (x < m) x = m + (x - m) * .35;
      apply();
    });
    addEventListener('pointerup', () => {
      if (!down) return; down = false;
      const target = gsap.utils.clamp(min(), 0, x + v * 18);
      gsap.to({ x }, { x: target, duration: 1.2, ease: 'expo.out', onUpdate() { x = this.targets()[0].x; apply(); } });
    });
    // scroll also nudges it
    if (!reduce) gsap.fromTo(track, { xPercent: 0 }, { xPercent: -6, ease: 'none', scrollTrigger: { trigger: '.gallery', start: 'top bottom', end: 'bottom top', scrub: true } });
  })();

  /* ---------- reveal helpers ---------- */
  $$('.h2').forEach(h => {
    if (h.closest('.dip, .manifesto')) return;
    gsap.from(h, { y: 50, opacity: 0, duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: h, start: 'top 88%' } });
  });
  gsap.from('.invite__text', { y: 40, opacity: 0, duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: '.invite__card', start: 'top 80%' } });
  if (!reduce) gsap.fromTo('.invite__card', { clipPath: 'inset(8% 6% 8% 6% round 24px)' }, { clipPath: 'inset(0% 0% 0% 0% round 6px)', ease: 'none', scrollTrigger: { trigger: '.invite__card', start: 'top bottom', end: 'top 30%', scrub: true } });

  /* ---------- form → email ---------- */
  $('#form').addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target, kind = f.kind.value, name = f.name.value.trim(), email = f.email.value.trim(), msg = f.message.value.trim();
    if (!email) { say('Please add your email address.'); f.email.focus(); return; }
    const body = `${msg || (kind.startsWith('Private') ? "I'd love to join Noéla's inner circle." : 'Hello Noéla,')}\n\n${name ? name + '\n' : ''}${email}`;
    location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(kind + (name ? ' from ' + name : ''))}&body=${encodeURIComponent(body)}`;
    say('Opening your email app…');
  });

  /* ---------- footer wordmark ---------- */
  (() => {
    const foot = $('.foot'), letters = $$('#footWord span');
    gsap.from(letters, { yPercent: 100, opacity: 0, stagger: .07, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: foot, start: 'top 75%' } });
    if (!fine || reduce) return;
    const tos = letters.map(l => gsap.quickTo(l, 'y', { duration: .6, ease: 'power3' }));
    foot.addEventListener('pointermove', e => letters.forEach((l, i) => {
      const r = l.getBoundingClientRect(), d = Math.abs(e.clientX - (r.left + r.width / 2));
      tos[i](-Math.max(0, 1 - d / 320) * 50);
    }));
    foot.addEventListener('pointerleave', () => tos.forEach(t => t(0)));
  })();

  addEventListener('load', () => ScrollTrigger.refresh());
})();
