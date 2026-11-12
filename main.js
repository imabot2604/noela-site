(() => {
  const EMAIL = 'hello@noela.in';
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

  /* ---------- section reveals ---------- */
  gsap.from('.intro__text > *', { y: 30, opacity: 0, stagger: .12, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: '.intro', start: 'top 75%' } });
  gsap.from('.pstory__body p', { y: 30, opacity: 0, stagger: .18, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: '.pstory', start: 'top 70%' } });
  gsap.from('.about__p', { y: 40, opacity: 0, stagger: .15, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: '.about__cols', start: 'top 85%' } });
  gsap.from('.gifting__lines p', { y: 24, opacity: 0, stagger: .2, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: '.gifting__lines', start: 'top 85%' } });
  gsap.from('.dip__close', { y: 30, opacity: 0, duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: '.dip__close', start: 'top 90%' } });

  /* ---------- the dip ---------- */
  (() => {
    const steps = $$('.dip__steps li'), cap = $('#dipCaption'), bar = $('#dipBar');
    const caps = ['Selected', 'Filled', 'Enrobed', 'Packed'];
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
    const sec = $('#products');
    $$('.pcard').forEach(c => c.addEventListener('pointerenter', () => sec.dataset.flavour = c.dataset.f));
    gsap.from('.pcard', { y: 60, opacity: 0, stagger: .15, duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: '.range', start: 'top 80%' } });
    const names = { almond: 'Noéla Almond', pistachio: 'Noéla Pistachio' };
    $$('.js-add').forEach(b => b.addEventListener('click', () => {
      say(names[b.dataset.f] + ' noted. Opening your email to place the order…');
      const body = 'Hello Noéla,\n\nI would like to order ' + names[b.dataset.f] + '.\nQuantity: \n\nThank you.';
      setTimeout(() => location.href = `mailto:${EMAIL}?subject=${encodeURIComponent('Order: ' + names[b.dataset.f])}&body=${encodeURIComponent(body)}`, 900);
    }));
  })();

  /* ---------- build a box ---------- */
  (() => {
    const tray = $('#tray'), gift = $('#gift'), seal = $('#boxSeal');
    const slots = Array(9).fill(null);
    let piece = 'almond', ribbon = '#384936', sealed = false;
    const ribbonNames = { '#384936': 'Green', '#523727': 'Chocolate', '#ede6d8': 'Sand' };
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
    note.addEventListener('input', () => noteText.textContent = note.value.trim() || 'For the one who knows the difference…');
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
        `• Noéla Almond × ${a}`, `• Noéla Pistachio × ${9 - a}`,
        `• Ribbon: ${ribbonNames[ribbon]}`, `• Number of boxes: ${qty}`,
        `• Gift note: ${note.value.trim() || '(none)'}`, '', 'Thank you!'
      ].join('\n');
      location.href = `mailto:${EMAIL}?subject=${encodeURIComponent('Gift box enquiry: ' + qty + ' box' + (qty > 1 ? 'es' : ''))}&body=${encodeURIComponent(body)}`;
    });
    refresh();
  })();

  /* ---------- reveal helpers ---------- */
  $$('.h2').forEach(h => {
    if (h.closest('.dip')) return;
    gsap.from(h, { y: 50, opacity: 0, duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: h, start: 'top 88%' } });
  });
  /* ---------- notify → email ---------- */
  $('#form').addEventListener('submit', e => {
    e.preventDefault();
    const email = e.target.email.value.trim();
    if (!email) { say('Please add your email address.'); e.target.email.focus(); return; }
    location.href = `mailto:${EMAIL}?subject=${encodeURIComponent('Notify me when Noéla launches')}&body=${encodeURIComponent('Please add me to the Noéla list.\n\n' + email)}`;
    say('No noise. Just Noéla.');
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
