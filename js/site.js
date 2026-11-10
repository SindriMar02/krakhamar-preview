/* Krákhamar: page behaviour for every page. One smoothing engine (Lenis, fine pointers only), GSAP for choreography. */
(function () {
  var root = document.documentElement, R = root.dataset.r || '', lang = root.lang;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  gsap.registerPlugin(ScrollTrigger);
  if (reduced) root.classList.add('rm');
  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', function () { location.reload(); });
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var noop = { set: function () {}, get: function () {}, place: function () {} };
  var once = function (trigger, start) { return { trigger: trigger, start: start, toggleActions: 'play none none none' }; };

  /* ---------- words that change with the language ---------- */
  var plural = function (n) { return n % 10 === 1 && n % 100 !== 11; };
  var COPY = {
    en: {
      months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
      mon: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      scenes: { pearl: 'Pearl sky', blue: 'Blue hour', still: 'Still water', sun: 'Low sun' },
      units: { studio: ['Studio', '32 m², queen bed and sofa bed'], apt: ['One bedroom', '50 m², separate bedroom and sofa bed'], villa: ['The villa', 'Geithellar, 109 m², three bedrooms, six guests'] },
      cal: { checkIn: 'Arrival', checkOut: 'Departure', pickDate: 'Pick a date', afterCheckIn: 'After arrival', night: 'night', nights: 'nights', prevMonth: 'Previous month', nextMonth: 'Next month', taken: 'booked', minStay: function (d) { return 'Two nights at least: the earliest departure is ' + d + '.'; } },
      fmt: function (d) { return d.getDate() + ' ' + this.mon[d.getMonth()]; }, to: ' to ',
      dec: function (n) { return n.toFixed(1); },
      dur: function (h, m) { return h + ' h ' + m + ' min'; },
      nights: function (n) { return n + ' nights'; }, guests: function (n) { return n + ' guests'; },
      noDark: 'no real dark at this time of year', from: function (a, b) { return 'from ' + a + ' to ' + b; },
      lit: function (m) { return m + '% lit' + (m < 25 ? ', dark skies' : ''); },
      price: function (n) { return 'about US$' + n.toLocaleString('en-US'); }, confirm: 'the hosts confirm',
      daylight: function (m, h) { return m + ': ' + h + ' hours of daylight'; },
      fill: 'Choose an arrival and a departure, and this card fills in.', dep: 'Now choose a departure.', pick: 'Pick your dates',
      request: 'Request these dates', send: 'Send request', sent: 'Preview: nothing was sent',
      sentFoot: 'This is a design preview, so nothing was sent. On the real site this request goes straight to the hosts, and card payment runs through Teya.',
      onFjord: function (m) { return m + ' on the fjord'; }, errName: 'Your name, so the hosts know who is coming.', errMail: 'An email address the hosts can answer.',
      open: 'Open menu', close: 'Close menu', pause: 'Pause the moving water', play: 'Play the moving water', openMonth: function (m) { return 'Open ' + m + ' in the calendar'; }
    },
    is: {
      months: ['janúar', 'febrúar', 'mars', 'apríl', 'maí', 'júní', 'júlí', 'ágúst', 'september', 'október', 'nóvember', 'desember'],
      mon: ['jan', 'feb', 'mar', 'apr', 'maí', 'jún', 'júl', 'ágú', 'sep', 'okt', 'nóv', 'des'],
      days: ['Mán', 'Þri', 'Mið', 'Fim', 'Fös', 'Lau', 'Sun'],
      scenes: { pearl: 'Glitský', blue: 'Ljósaskipti', still: 'Logn', sun: 'Lág sól' },
      units: { studio: ['Stúdíó', '32 m², tvíbreitt rúm og svefnsófi'], apt: ['Eitt svefnherbergi', '50 m², sérsvefnherbergi og svefnsófi'], villa: ['Húsið', 'Geithellar, 109 m², þrjú svefnherbergi, sex gestir'] },
      cal: { checkIn: 'Koma', checkOut: 'Brottför', pickDate: 'Veldu dag', afterCheckIn: 'Eftir komu', night: 'nótt', nights: 'nætur', prevMonth: 'Fyrri mánuður', nextMonth: 'Næsti mánuður', taken: 'bókað', minStay: function (d) { return 'Minnst tvær nætur: fyrsta brottför er ' + d + '.'; } },
      fmt: function (d) { return d.getDate() + '. ' + this.mon[d.getMonth()]; }, to: ' til ',
      dec: function (n) { return n.toFixed(1).replace('.', ','); },
      dur: function (h, m) { return h + ' klst. ' + m + ' mín.'; },
      nights: function (n) { return n + (plural(n) ? ' nótt' : ' nætur'); }, guests: function (n) { return n + ' gestir'; },
      noDark: 'ekkert eiginlegt myrkur á þessum árstíma', from: function (a, b) { return 'frá ' + a + ' til ' + b; },
      lit: function (m) { return m + '% lýst' + (m < 25 ? ', dimmur himinn' : ''); },
      price: function (n) { return 'um US$' + String(n).replace(/\B(?=(\d{3})+$)/g, '.'); }, confirm: 'gestgjafarnir staðfesta',
      daylight: function (m, h) { return m + ': ' + h + ' birtustundir'; },
      fill: 'Veldu komu og brottför og þetta spjald fyllist út.', dep: 'Veldu nú brottför.', pick: 'Veldu dagsetningar',
      request: 'Óska eftir þessum dögum', send: 'Senda beiðni', sent: 'Sýnishorn: ekkert var sent',
      sentFoot: 'Þetta er sýnishorn af hönnun og því var ekkert sent. Á raunverulegum vef fer beiðnin beint til gestgjafanna og greitt er með korti í gegnum Teya.',
      onFjord: function (m) { return m + ' við fjörðinn'; }, errName: 'Nafnið þitt, svo gestgjafarnir viti hver er að koma.', errMail: 'Netfang sem gestgjafarnir geta svarað.',
      open: 'Opna valmynd', close: 'Loka valmynd', pause: 'Stöðva hreyfingu vatnsins', play: 'Setja vatnið aftur af stað', openMonth: function (m) { return 'Opna ' + m + ' í dagatalinu'; }
    }
  };
  var I = COPY[lang] || COPY.en;
  var cap = function (s) { return s.charAt(0).toUpperCase() + s.slice(1); };

  /* ---------- scroll engine ---------- */
  var lenis = null;
  if (fine && !reduced && window.Lenis) {
    lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }
  function goTo(sel) {
    var el = $(sel); if (!el) return;
    if (lenis) lenis.scrollTo(el, { duration: 1.5, easing: function (t) { return 1 - Math.pow(1 - t, 4); } });
    else el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  }
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var u = a.getAttribute('data-unit'); if (u) setUnit(u);
      closeMenu(); e.preventDefault(); goTo(a.getAttribute('href'));
    });
  });

  /* ---------- page change: the timber screen closes over one page and opens on the next ---------- */
  var slats = $$('#wipe i'), leaving = false;
  var heroImg = $('.rm-frame img') || $('#poster');
  function openScreen() {
    gsap.fromTo(slats, { scaleX: 1, transformOrigin: '100% 50%' }, { scaleX: 0, duration: 0.8, ease: 'expo.inOut', stagger: { amount: 0.34 }, onComplete: function () { root.classList.remove('kh-in'); gsap.set(slats, { clearProps: 'all' }); } });
  }
  var arriving = root.classList.contains('kh-in');
  if (arriving) {
    var settled = false, go = function () { if (settled) return; settled = true; openScreen(); };
    setTimeout(go, 700);
    if (heroImg && heroImg.decode) heroImg.decode().then(go, go); else go();
  }
  function leave(url) {
    if (leaving) return; leaving = true; closeMenu();
    try { sessionStorage.setItem('kh-wipe', '1'); } catch (_) {}
    root.classList.add('kh-out');
    gsap.fromTo(slats, { scaleX: 0, transformOrigin: '0% 50%' }, { scaleX: 1, duration: 0.55, ease: 'power3.inOut', stagger: { amount: 0.22 }, onComplete: function () { location.href = url; } });
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target || reduced) return;
    var h = a.getAttribute('href'); if (h.charAt(0) === '#' || /^(mailto|tel):/.test(h)) return;
    var u = new URL(a.href); if (u.origin !== location.origin) return;
    e.preventDefault();
    if (u.pathname === location.pathname) { closeMenu(); if (lenis) lenis.scrollTo(0); else window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    leave(a.href);
  });
  window.addEventListener('pageshow', function (e) { if (e.persisted) { leaving = false; root.classList.remove('kh-out', 'kh-in'); gsap.set(slats, { clearProps: 'all' }); } });
  var fetched = {};
  function prefetch(e) {
    var a = e.target.closest && e.target.closest('a[href]'); if (!a || a.target) return;
    var h = a.getAttribute('href'); if (!h || h.charAt(0) === '#' || /^(mailto|tel):/.test(h) || fetched[a.href]) return;
    fetched[a.href] = 1; var l = document.createElement('link'); l.rel = 'prefetch'; l.href = a.href; document.head.appendChild(l);
  }
  document.addEventListener('pointerover', prefetch, { passive: true });
  document.addEventListener('touchstart', prefetch, { passive: true });

  /* ---------- scenes and tones ---------- */
  var img = function (n) { return R + 'assets/img/' + n + '.webp'; };
  var SC = {
    pearl: { src: img('pearl'), small: img('pearl-s'), h: 0.815, fx: 0.24, shore: 1.3, refl: 0.42, rip: 1, bk: '#171F26', acc: '#D9C5BC' },
    blue: { src: img('blue'), small: img('blue-s'), h: 0.8, fx: 0.62, shore: 1.3, refl: 0.2, rip: 0, dim: 0.86, bk: '#14263A', acc: '#9DBAD4' },
    still: { src: img('still'), small: img('still-s'), h: 0.385, shore: 0.655, refl: 0.46, rip: 1, dim: 0.88, bk: '#19303A', acc: '#8FBAC8' },
    sun: { src: img('sun'), small: img('sun-s'), h: 0.6, fx: 0.3, shore: 0.665, refl: 0.3, rip: 0.6, dim: 0.84, bk: '#2A2318', acc: '#E0B56C' }
  };
  var monthScene = ['pearl', 'pearl', 'blue', 'sun', 'still', 'still', 'still', 'still', 'sun', 'sun', 'blue', 'pearl'];
  var canvas = $('#water'), poster = $('#poster'), sceneEl = $('#sceneSeg');
  var water = null, scene = canvas ? canvas.dataset.scene : 'pearl';
  var readSky = $('#readSky'), readScene = $('#readScene');
  function setTone(name, instant) {
    var s = SC[name];
    gsap.to(root, { '--bk': s.bk, '--acc': s.acc, duration: reduced || instant ? 0 : 1.1, ease: 'power2.inOut', overwrite: 'auto' });
    readSky.src = s.small;
  }
  function setScene(name, from) {
    if (name === scene) return; scene = name;
    if (canvas) {
      if (from !== 'seg') sceneSeg.set(name);
      if (water) water.to(name, gsap); else if (poster) poster.src = SC[name].small;
    }
    setTone(name);
  }

  /* ---------- segmented control (port of 21st.dev #43122: stretching pill, drag across, arrow keys) ---------- */
  function Seg(el, onChange) {
    var pill = $('.seg-pill', el), btns = $$('button', el), val = null, ready = false, press = null;
    function place(anim) {
      var b = btns.filter(function (x) { return x.dataset.v === val; })[0]; if (!b || !b.offsetWidth) return;
      var x = b.offsetLeft, w = b.offsetWidth, prev = parseFloat(pill.style.left) || 0;
      if (ready && anim && x !== prev) pill.dataset.dir = x > prev ? 'right' : 'left';
      if (!ready || !anim) pill.style.transition = 'none';
      pill.style.left = x + 'px'; pill.style.right = (el.clientWidth - x - w) + 'px';
      if (!ready || !anim) { void pill.offsetWidth; pill.style.transition = ''; }
      ready = true;
    }
    function set(v, silent) {
      if (v === val) return; val = v;
      btns.forEach(function (b) { var on = b.dataset.v === v; b.setAttribute('aria-checked', on); b.tabIndex = on ? 0 : -1; });
      place(true); if (!silent && onChange) onChange(v);
    }
    el.addEventListener('keydown', function (e) {
      var i = btns.findIndex(function (b) { return b.dataset.v === val; }), n = btns.length, j = -1;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % n;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i - 1 + n) % n;
      else if (e.key === 'Home') j = 0; else if (e.key === 'End') j = n - 1;
      if (j < 0) return; e.preventDefault(); set(btns[j].dataset.v); btns[j].focus();
    });
    function at(x) { var best = null, dist = 1e9; btns.forEach(function (b) { var r = b.getBoundingClientRect(), d = x < r.left ? r.left - x : x > r.right ? x - r.right : 0; if (d < dist) { dist = d; best = b; } }); return best; }
    el.addEventListener('pointerdown', function (e) { if (e.button) return; press = { id: e.pointerId, touch: e.pointerType === 'touch', x: e.clientX, moved: false }; el.setAttribute('data-pressed', ''); if (!press.touch) { set(at(e.clientX).dataset.v); try { el.setPointerCapture(e.pointerId); } catch (_) {} } });
    el.addEventListener('pointermove', function (e) { if (!press || press.id !== e.pointerId) return; if (!press.moved && Math.abs(e.clientX - press.x) < 4) return; press.moved = true; set(at(e.clientX).dataset.v); });
    function end(e) { if (!press) return; if (press.touch && !press.moved && e.type === 'pointerup') set(at(e.clientX).dataset.v); press = null; el.removeAttribute('data-pressed'); }
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
    btns.forEach(function (b) { b.addEventListener('click', function () { set(b.dataset.v); }); });
    window.addEventListener('resize', function () { place(false); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { place(false); });
    return { set: set, get: function () { return val; }, place: place, has: function (v) { return btns.some(function (b) { return b.dataset.v === v; }); } };
  }
  var sceneSeg = sceneEl ? Seg(sceneEl, function (v) { setScene(v, 'seg'); }) : noop;
  sceneSeg.set(scene, true);

  /* ---------- louvres: one photograph opens through another, in the rhythm of the timber screen ---------- */
  function Louvre(frame) {
    var imgs = $$('img', frame), cur = Math.max(0, imgs.findIndex(function (m) { return m.classList.contains('is-on'); })), want = cur, busy = false, tw = null;
    frame.classList.add('lv');
    new IntersectionObserver(function (es, o) { if (es[0].isIntersecting) { imgs.forEach(function (m) { m.loading = 'eager'; if (m.decode) m.decode().catch(function () {}); }); o.disconnect(); } }, { rootMargin: '800px' }).observe(frame);
    function swap(n) { imgs[cur].classList.remove('is-on'); n.classList.remove('is-in'); n.classList.add('is-on'); n.style.removeProperty('--w'); n.style.removeProperty('--sl'); cur = imgs.indexOf(n); }
    function run() {
      if (want === cur) { busy = false; tw = null; return; }
      busy = true; var n = imgs[want];
      n.loading = 'eager';
      if (reduced) { swap(n); busy = false; return; }
      var sl = Math.max(30, frame.clientWidth / (window.innerWidth < 761 ? 8 : 16));
      var start = function () {
        n.style.setProperty('--sl', sl + 'px'); n.style.setProperty('--w', '0px'); n.classList.add('is-in');
        tw = gsap.fromTo(n, { '--w': '0px' }, { '--w': sl + 'px', duration: 0.95, ease: 'power2.inOut', onComplete: function () { swap(n); run(); } });
        if (want !== imgs.indexOf(n)) tw.timeScale(3);
      };
      if (n.decode) n.decode().then(start, start); else start();
    }
    return { to: function (i) { want = i; if (busy) { if (tw) tw.timeScale(3); } else run(); }, frame: frame };
  }
  $$('[data-show]').forEach(function (s) {
    var lv = Louvre($('.show-frame', s)), seg = Seg($('.seg', s), function (v) { lv.to(+v); });
    seg.set('0', true);
  });
  $$('[data-gal]').forEach(function (g) {
    var lv = Louvre($('.rm-frame', g)), n = $$('img', g).length, i = 0, out = $('[data-n]', g);
    function go(d) { i = (i + d + n) % n; lv.to(i); out.textContent = i + 1; }
    $('[data-prev]', g).addEventListener('click', function () { go(-1); });
    $('[data-next]', g).addEventListener('click', function () { go(1); });
    g.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') go(1); else if (e.key === 'ArrowLeft') go(-1); });
  });
  var walk = $('[data-walk]');
  if (walk) {
    var lvW = Louvre($('.walk-frame', walk)), steps = $$('.walk-step', walk);
    steps.forEach(function (st, i) {
      ScrollTrigger.create({ trigger: st, start: 'top 58%', end: 'bottom 58%', onToggle: function (self) { if (self.isActive) { lvW.to(i); steps.forEach(function (x, j) { x.classList.toggle('is-now', j === i); }); } } });
    });
    steps[0].classList.add('is-now');
  }

  /* ---------- daylight, sun and moon, computed for 64.59 N 14.5 W (Iceland keeps UTC all year) ---------- */
  var LAT = 64.59, LON = -14.5, rad = Math.PI / 180;
  function sunMin(date, zenith) {
    var doy = Math.round((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(date.getFullYear(), 0, 0)) / 864e5);
    var g = 2 * Math.PI / 365 * (doy - 1 + 0.5);
    var eq = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
    var dec = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
    var c = Math.cos(zenith * rad) / (Math.cos(LAT * rad) * Math.cos(dec)) - Math.tan(LAT * rad) * Math.tan(dec);
    if (c > 1) return null; if (c < -1) return false;
    var ha = Math.acos(c) / rad;
    return { rise: 720 - 4 * (LON + ha) - eq, set: 720 - 4 * (LON - ha) - eq };
  }
  function hm(m) { m = ((Math.round(m) % 1440) + 1440) % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); }
  function dur(m) { return I.dur(Math.floor(m / 60), Math.round(m % 60)); }
  function moon(d) { var jd = d.getTime() / 864e5 + 2440587.5, age = ((jd - 2451550.1) / 29.530588853) % 1; if (age < 0) age += 1; return Math.round((1 - Math.cos(2 * Math.PI * age)) / 2 * 100); }

  /* ---------- the year strip (home) ---------- */
  var yearEl = $('#year');
  if (yearEl) I.mon.forEach(function (m, i) {
    var s = sunMin(new Date(2027, i, 15), 90.833), hrs = (s.set - s.rise) / 60;
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'yr'; b.setAttribute('aria-pressed', 'false'); b.style.setProperty('--h', (hrs / 24).toFixed(3));
    b.setAttribute('aria-label', I.daylight(cap(I.months[i]), I.dec(hrs)));
    b.innerHTML = '<span class="yr-h">' + I.dec(hrs) + '</span><span class="yr-b"></span><span class="yr-m">' + m + '</span>';
    b.addEventListener('click', function () { pickMonth(i, b); });
    yearEl.appendChild(b);
  });

  /* ---------- booking, carried from page to page ---------- */
  var bookEl = $('#book'), allowed = bookEl.dataset.units.split(' '), pinned = allowed.length === 1;
  var PD = { studio: '2', apt: '4', villa: '6' };
  var state = { party: pinned ? PD[allowed[0]] : '2', unit: allowed[0], start: null, end: null, nights: 0, step: 'dates' };
  var RATES = { studio: { low: 257, high: 358 }, apt: { low: 277, high: 403 }, villa: { low: null, high: 1099 } };
  var partyUnit = { 2: 'studio', 4: 'apt', 6: 'villa' };
  var heroEl = $('#heroParty'), heroParty = heroEl ? Seg(heroEl, function (v) { setParty(v, 'hero'); }) : noop;
  var party = Seg($('#party'), function (v) { setParty(v, 'book'); });
  var unitSeg = Seg($('#unit'), function (v) { state.unit = v; syncParty(v); render(); });
  function unitFor(p) { if (pinned) return allowed[0]; var u = partyUnit[p]; return allowed.indexOf(u) > -1 ? u : allowed[allowed.length - 1]; }
  function showParty() { heroParty.set(state.party, true); party.set(state.party, true); }
  function syncParty(u) { if (!pinned && u === 'villa' && state.party !== '6') { state.party = '6'; showParty(); } }
  function setParty(v, from) { state.party = v; if (from !== 'hero') heroParty.set(v, true); if (from !== 'book') party.set(v, true); state.unit = unitFor(v); unitSeg.set(state.unit, true); render(); }
  function setUnit(u) { if (allowed.indexOf(u) < 0) return; state.unit = u; unitSeg.set(u, true); if (!pinned) { if (u === 'villa') state.party = '6'; else if (state.party === '6') state.party = u === 'apt' ? '4' : '2'; showParty(); } render(); }

  var L = Object.assign({ months: I.months.map(cap), weekdays: I.days, empty: '', chosen: function () { return ''; }, crosses: function () { return ''; } }, I.cal);
  var calEl = $('#cal'), picker;
  function mount(s, e) { calEl.textContent = ''; calEl.className = 'cal'; picker = createStayPicker({ mount: calEl, prefix: 'bk', minStay: 2, L: L, onChange: onDates, start: s, end: e }); }
  function onDates(r) { state.start = r.start || null; state.end = r.end || null; state.nights = r.nights || 0; state.step = 'dates'; render(); }
  function pickMonth(i, btn) {
    $$('.yr').forEach(function (b) { b.setAttribute('aria-pressed', b === btn); });
    setScene(monthScene[i]);
    mount(null, null); state.start = state.end = null; state.nights = 0; state.step = 'dates'; render();
    var now = new Date(), months = (i - now.getMonth() + 12) % 12, nx = $('[data-next]', calEl);
    for (var k = 0; k < months; k++) if (nx && !nx.disabled) nx.click();
    goTo('#book');
  }
  var E = { name: $('#readName'), sub: $('#readSub'), dl: $('#readDl'), day: $('#rDay'), sun: $('#rSun'), dark: $('#rDark'), moon: $('#rMoon'), price: $('#rPrice'), go: $('#go'), goT: $('#goT'), req: $('#req'), err: $('#reqErr'), foot: $('#readFoot'), chip: $('#chip') };
  var FOOT = E.foot.textContent;
  function save() { try { sessionStorage.setItem('kh-stay', JSON.stringify({ party: state.party, unit: state.unit, start: state.start && state.start.getTime(), end: state.end && state.end.getTime() })); } catch (_) {} }
  function render() {
    var u = I.units[state.unit], st = state.start;
    E.name.textContent = u[0];
    save();
    if (!st || !state.end) {
      E.sub.textContent = st ? I.dep : u[1] + '. ' + I.fill;
      E.dl.hidden = true; E.req.hidden = true; E.go.disabled = true; E.goT.textContent = I.pick; readScene.textContent = I.scenes[scene];
      E.chip.hidden = true; state.step = 'dates'; return;
    }
    E.sub.textContent = I.fmt(st) + I.to + I.fmt(state.end) + ', ' + I.nights(state.nights) + ', ' + I.guests(state.party) + '. ' + u[1] + '.';
    var s = sunMin(st, 90.833), dark = sunMin(st, 102);
    E.day.textContent = dur(s.set - s.rise);
    E.sun.textContent = I.from(hm(s.rise), hm(s.set)).replace(/^(from|frá) /, '');
    E.dark.textContent = dark ? I.from(hm(dark.set), hm(dark.rise)) : I.noDark;
    E.moon.textContent = I.lit(moon(st));
    var r = RATES[state.unit], high = st.getMonth() >= 5 && st.getMonth() <= 8, rate = high ? r.high : r.low;
    E.price.textContent = rate ? I.price(rate * state.nights) : I.confirm;
    E.dl.hidden = false;
    setScene(monthScene[st.getMonth()]);
    readScene.textContent = I.onFjord(cap(I.months[st.getMonth()]));
    E.go.disabled = false; E.goT.textContent = state.step === 'form' ? I.send : I.request;
    E.req.hidden = state.step !== 'form'; E.foot.textContent = FOOT;
    E.chip.hidden = false; E.chip.textContent = I.guests(state.party) + ' · ' + I.fmt(st) + I.to + I.fmt(state.end);
  }
  E.go.addEventListener('click', function () {
    if (state.step === 'dates') { state.step = 'form'; render(); var i = $('input', E.req); if (i) i.focus(); return; }
    if (state.step === 'form') {
      var n = E.req.elements.name.value.trim(), m = E.req.elements.email.value.trim();
      if (!n || !/^\S+@\S+\.\S+$/.test(m)) { E.err.textContent = !n ? I.errName : I.errMail; (!n ? E.req.elements.name : E.req.elements.email).focus(); return; }
      E.err.textContent = ''; state.step = 'sent'; E.req.hidden = true; E.go.disabled = true; E.goT.textContent = I.sent;
      E.foot.textContent = I.sentFoot;
    }
  });
  E.req.addEventListener('submit', function (e) { e.preventDefault(); E.go.click(); });

  var saved = null; try { saved = JSON.parse(sessionStorage.getItem('kh-stay')); } catch (_) {}
  var sStart = null, sEnd = null;
  if (saved) {
    if (party.has(saved.party)) state.party = saved.party; else state.party = pinned ? PD[allowed[0]] : '4';
    if (allowed.indexOf(saved.unit) > -1) state.unit = saved.unit; else state.unit = unitFor(state.party);
    if (saved.start && saved.end) { sStart = new Date(saved.start); sEnd = new Date(saved.end); }
  }
  showParty(); unitSeg.set(state.unit, true);
  mount(sStart, sEnd);
  if (sStart) { var g = picker.get(); state.start = g.start; state.end = g.end; state.nights = g.nights; }
  render();
  if (!canvas || !sceneEl) setTone(scene, true);

  /* ---------- a year of light (fjord page) ---------- */
  var lr = $('#lrRows');
  if (lr) {
    var N = '#0F171C', T = '#3D5B6E', G = '#E3B98A', D = '#E7DFCF', pct = function (m) { return (clamp(m, 0, 1440) / 14.4).toFixed(2) + '%'; };
    var bar = function (m) {
      var d = new Date(2027, m, 15), s = sunMin(d, 90.833), c = sunMin(d, 96), n = sunMin(d, 102), a = [];
      var add = function (col, min) { a.push(col + ' ' + pct(min)); };
      if (n) { add(N, 0); add(N, n.rise); } else add(c ? '#22333F' : T, 0);
      if (c) add(T, c.rise);
      add(G, s.rise); add(D, s.rise + 50); add(D, s.set - 50); add(G, s.set);
      if (c) add(T, c.set);
      if (n) { add(N, n.set); add(N, 1440); } else add(c ? '#22333F' : T, 1440);
      return 'linear-gradient(90deg,' + a.join(',') + ')';
    };
    var lrBtns = I.mon.map(function (m, i) {
      var s = sunMin(new Date(2027, i, 15), 90.833), hrs = (s.set - s.rise) / 60, b = document.createElement('button');
      b.type = 'button'; b.className = 'lr'; b.setAttribute('aria-label', I.daylight(cap(I.months[i]), I.dec(hrs)));
      b.innerHTML = '<span class="lr-m">' + m + '</span><span class="lr-b" style="background:' + bar(i) + '"></span><span class="lr-h">' + I.dec(hrs) + '</span>';
      b.addEventListener('click', function () { show(i); });
      lr.appendChild(b); return b;
    });
    var cur = new Date().getMonth(), goL = $('#lrGo');
    var show = function (i) {
      cur = i; lrBtns.forEach(function (b, j) { b.setAttribute('aria-pressed', j === i); });
      var d = new Date(2027, i, 15), s = sunMin(d, 90.833), n = sunMin(d, 102);
      $('#lrName').textContent = cap(I.months[i]);
      $('#lrDay').textContent = dur(s.set - s.rise);
      $('#lrSun').textContent = I.from(hm(s.rise), hm(s.set)).replace(/^(from|frá) /, '');
      $('#lrDark').textContent = n ? I.from(hm(n.set), hm(n.rise)) : I.noDark;
      goL.textContent = I.openMonth(I.months[i]);
    };
    show(cur);
    goL.addEventListener('click', function () { pickMonth(cur, null); });
    if (!reduced) gsap.fromTo('.lr-b', { scaleX: 0 }, { scaleX: 1, duration: 1.2, ease: 'expo.out', stagger: 0.05, scrollTrigger: once(lr, 'top 82%') });
  }

  /* ---------- header (port of 21st.dev #27428) ---------- */
  var deskMq = window.matchMedia('(min-width: 901px)'), hdr = $('#hdr'), lastY = window.scrollY, frame = 0, heroEnd = 0, down = 0, up = 0, menuOpen = false;
  function measureHero() { var h = $('.hero'); heroEnd = h ? h.offsetHeight - 76 : -1; }
  measureHero(); window.addEventListener('resize', function () { measureHero(); hdrUpdate(); });
  function hdrUpdate() {
    frame = 0;
    var y = window.scrollY, dY = y - lastY; lastY = y;
    /* Storfjord: the header compacts over the first 100 px, tied to position and linear. It turns to paper once the dark hero has left. */
    hdr.style.setProperty('--hp', clamp(y / 100, 0, 1).toFixed(3));
    hdr.classList.toggle('is-floating', y > 48);
    hdr.classList.toggle('is-solid', y > heroEnd);
    /* Storfjord (measured): the header slides away on the way down and returns on the way up, .3s */
    if (dY > 0) { down += dY; up = 0; } else if (dY < 0) { up -= dY; down = 0; }
    if (!deskMq.matches || y < Math.max(heroEnd, 0) + 240 || up > 24 || menuOpen) hdr.classList.remove('is-away'); else if (down > 80) hdr.classList.add('is-away');
  }
  window.addEventListener('scroll', function () { if (!frame) frame = requestAnimationFrame(hdrUpdate); }, { passive: true });
  hdrUpdate();
  hdr.addEventListener('focusin', function () { hdr.classList.remove('is-away'); });

  /* ---------- phone menu: opens with nothing highlighted ---------- */
  var burger = $('#burger'), menu = $('#menu'), timer = 0;
  function openMenu(e) {
    menuOpen = true; clearTimeout(timer); menu.hidden = false; void menu.offsetWidth; menu.classList.add('is-open');
    burger.setAttribute('aria-expanded', 'true'); burger.setAttribute('aria-label', I.close);
    document.body.style.overflow = 'hidden'; if (lenis) lenis.stop();
    if (e && e.detail === 0) { var f = $('a', menu); if (f) f.focus(); } else menu.focus({ preventScroll: true });
  }
  function closeMenu() {
    if (!menuOpen) return; menuOpen = false; menu.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false'); burger.setAttribute('aria-label', I.open);
    document.body.style.overflow = ''; if (lenis) lenis.start();
    timer = setTimeout(function () { menu.hidden = true; }, 720);
  }
  burger.addEventListener('click', function (e) { menuOpen ? closeMenu() : openMenu(e); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menuOpen) { closeMenu(); burger.focus(); } });

  /* ---------- reveals ---------- */
  function split(el, by) {
    var label = el.textContent.trim(), parts = by === 'c' ? Array.from(label) : label.split(/\s+/);
    el.setAttribute('aria-label', label); el.textContent = '';
    parts.forEach(function (w, i) { var s = document.createElement('span'); s.className = 'w'; s.setAttribute('aria-hidden', 'true'); var n = document.createElement('i'); n.textContent = w === ' ' ? '\u00a0' : w; s.appendChild(n); el.appendChild(s); if (by !== 'c' && i < parts.length - 1) el.appendChild(document.createTextNode(' ')); });
    return $$('.w>i', el);
  }
  if (!reduced) {
    $$('[data-chars]').forEach(function (el) {
      gsap.fromTo(split(el, 'c'), { yPercent: 118 }, { yPercent: 0, duration: 1.3, ease: 'expo.out', stagger: 0.045, delay: arriving ? 0.5 : 0.15 });
    });
    $$('.ph').forEach(function (p) {
      var m = $('.ph-img', p);
      gsap.fromTo($('img', m), { scale: 1.07 }, { scale: 1, duration: 2.2, ease: 'expo.out', delay: arriving ? 0.2 : 0 });
      gsap.to(m, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: p, start: 'top top', end: 'bottom top', scrub: true } });
      gsap.fromTo($('.ph-row', p), { y: 16, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1.2, ease: 'expo.out', delay: arriving ? 1 : 0.7, clearProps: 'transform,opacity,visibility' });
    });
    /* lines rise out of their own baseline: the intro statement and the two scores */
    $$('.intro').forEach(function (sec) {
      var rows = $$('[data-line], .intro-proof dd', sec).map(function (el) { var i = document.createElement('i'); while (el.firstChild) i.appendChild(el.firstChild); el.appendChild(i); return i; });
      gsap.timeline({ scrollTrigger: once(sec, 'top 80%') })
        .fromTo(rows, { yPercent: 112 }, { yPercent: 0, duration: 1.15, ease: 'expo.out', stagger: 0.1 }, 0)
        .fromTo($$('.intro-proof .meta', sec), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5, ease: 'power1.out', stagger: 0.1 }, 0.55)
        .fromTo($('.intro-proof', sec), { '--rule': 0 }, { '--rule': 1, duration: 1.1, ease: 'expo.inOut' }, 0);
    });
    /* the three stays: the line is drawn, then each photograph rises out of it, smallest first */
    var grid = $('.ways-grid');
    if (grid) {
      var wide = window.matchMedia('(min-width: 901px)').matches, ways = $$('.way', grid);
      var rise = function (tl, list, at) {
        list.forEach(function (w, i) {
          var t = at + i * 0.16;
          tl.fromTo($('.way-photo', w), { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: 1.35, ease: 'expo.out', clearProps: 'clipPath' }, t)
            .fromTo($('.way-photo img', w), { scale: 1.16, transition: 'none' }, { scale: 1, duration: 1.9, ease: 'expo.out', clearProps: 'transform,transition' }, t)
            .fromTo($('.way-num>span', w), { yPercent: 112 }, { yPercent: 0, duration: 1.15, ease: 'expo.out' }, t + 0.18)
            .fromTo($$('.way-t>*', w), { y: 16, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.9, ease: 'expo.out', stagger: 0.05, clearProps: 'transform,opacity,visibility' }, t + 0.4);
        });
      };
      /* the line starts at the left edge of the window, wherever the grid sits */
      var line = $('.ways-line'), fitLine = function () { line.style.marginLeft = -Math.round(grid.getBoundingClientRect().left) + 'px'; };
      fitLine(); window.addEventListener('resize', fitLine);
      if (wide) {
        var tlW = gsap.timeline({ scrollTrigger: once(grid, 'top 72%') });
        tlW.fromTo('.ways-line', { scaleX: 0 }, { scaleX: 1, duration: 1.4, ease: 'expo.inOut' }, 0);
        rise(tlW, ways, 0.4);
      } else ways.forEach(function (w) { rise(gsap.timeline({ scrollTrigger: once(w, 'top 78%') }), [w], 0); });
    }
    $$('[data-words]').forEach(function (el) {
      gsap.fromTo(split(el, 'w'), { yPercent: 118 }, { yPercent: 0, duration: 1.15, ease: 'expo.out', stagger: 0.035, scrollTrigger: once(el, 'top 84%') });
    });
    /* photographs rise out of their lower edge, as the stays do */
    $$('[data-rise]').forEach(function (f) {
      gsap.timeline({ scrollTrigger: once(f, 'top 86%') })
        .fromTo(f, { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: 1.35, ease: 'expo.out', clearProps: 'clipPath' }, 0)
        .fromTo($('img', f), { scale: 1.16 }, { scale: 1, duration: 1.9, ease: 'expo.out', clearProps: 'transform' }, 0);
    });
    $$('.feat-t, .light-t, .rm-info').forEach(function (t) {
      gsap.fromTo(t.children, { y: 18, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1, ease: 'expo.out', stagger: 0.07, delay: t.classList.contains('rm-info') ? (arriving ? 0.55 : 0.15) : 0, clearProps: 'transform,opacity,visibility', scrollTrigger: once(t, 'top 84%') });
    });
    $$('.rows-h, .four figcaption').forEach(function (t) { gsap.fromTo(t, { y: 16, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1, ease: 'expo.out', clearProps: 'transform,opacity,visibility', scrollTrigger: once(t, 'top 88%') }); });
    $$('.rm').forEach(function (r) {
      gsap.fromTo($('.rm-gal', r), { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: 1.35, ease: 'expo.out', delay: arriving ? 0.4 : 0, clearProps: 'clipPath' });
      gsap.fromTo($('.rm-frame', r), { scale: 1.1 }, { scale: 1, duration: 1.9, ease: 'expo.out', delay: arriving ? 0.4 : 0, clearProps: 'transform' });
      gsap.fromTo($('.rm-bar', r), { y: 18, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1, ease: 'expo.out', delay: arriving ? 1 : 0.6, clearProps: 'transform,opacity,visibility' });
    });
    if (yearEl) gsap.fromTo('.yr-b', { scaleY: 0 }, { scaleY: 1, duration: 1.1, ease: 'expo.out', stagger: 0.04, scrollTrigger: once('#year', 'top 86%') });
    $$('[data-slats]').forEach(function (box) {
      var n = Math.max(4, Math.min(16, Math.round(box.clientWidth / (window.innerWidth < 761 ? 48 : 90)))), wrap = document.createElement('div'), pic = $('img', box);
      wrap.className = 'slats'; wrap.setAttribute('aria-hidden', 'true');
      for (var i = 0; i < n; i++) wrap.appendChild(document.createElement('i'));
      box.appendChild(wrap);
      var tl = gsap.timeline({ scrollTrigger: { trigger: box, start: 'top 92%', end: 'top 22%', scrub: true } });
      tl.fromTo(wrap.children, { scaleX: 1 }, { scaleX: 0, duration: 1, ease: 'power1.inOut', stagger: { amount: 0.9, from: 'start' } }, 0)
        .fromTo(pic, { scale: 1.12 }, { scale: 1, duration: 1.9, ease: 'none' }, 0);
    });
    $$('[data-widen]').forEach(function (w) {
      var phone = window.innerWidth < 761, inner = $('.widen-in', w);
      var tl = gsap.timeline({ scrollTrigger: { trigger: w, start: 'top 94%', end: 'top 6%', scrub: true } });
      tl.fromTo(inner, { clipPath: phone ? 'inset(8% 14% 8% 14%)' : 'inset(10% 27% 10% 27%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none', duration: 1 }, 0)
        .fromTo($('img', inner), { scale: 1.14 }, { scale: 1, ease: 'none', duration: 1 }, 0);
    });
    $$('.house-body').forEach(function (b) {
      gsap.fromTo($$('.house-a,.house-b', b), { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 1.3, ease: 'expo.out', stagger: 0.12, clearProps: 'clipPath', scrollTrigger: once(b, 'top 82%') });
      gsap.fromTo($$('.house-lead,.spec>div,.lnks', b), { y: 22, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1, ease: 'expo.out', stagger: 0.06, clearProps: 'transform,opacity,visibility', scrollTrigger: once(b, 'top 82%') });
    });
    $$('.apt').forEach(function (a) {
      gsap.fromTo($$('.apt-a,.apt-b', a), { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 1.3, ease: 'expo.out', stagger: 0.12, clearProps: 'clipPath', scrollTrigger: once($('.apt-grid', a), 'top 84%') });
      gsap.fromTo($('.apt-h', a), { y: 30, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1.1, ease: 'expo.out', clearProps: 'transform,opacity,visibility', scrollTrigger: once(a, 'top 86%') });
      gsap.fromTo($$('.apt-t>*', a), { y: 22, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1, ease: 'expo.out', stagger: 0.07, clearProps: 'transform,opacity,visibility', scrollTrigger: once($('.apt-t', a), 'top 88%') });
    });
    $$('[data-clip]').forEach(function (f) { gsap.fromTo(f, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 1.3, ease: 'expo.out', clearProps: 'clipPath', scrollTrigger: once(f, 'top 84%') }); });
    $$('.rows .spec,.road-list,.qa-list').forEach(function (l) { gsap.fromTo(l.children, { y: 22, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1, ease: 'expo.out', stagger: 0.05, clearProps: 'transform,opacity,visibility', scrollTrigger: once(l, 'top 86%') }); });
    gsap.fromTo('.book-row:not([hidden]), .cal, .read', { y: 30, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1, ease: 'expo.out', stagger: 0.07, clearProps: 'transform,opacity,visibility', scrollTrigger: once('.book', 'top 72%') });
    if ($('.q-row')) gsap.fromTo('.q-row .q', { y: 26, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1, ease: 'expo.out', stagger: 0.09, clearProps: 'transform,opacity,visibility', scrollTrigger: once('.q-row', 'top 86%') });
    gsap.fromTo('.ft-mark span:first-child', { yPercent: 62 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.ft-mark', start: 'top bottom', end: 'bottom bottom', scrub: true } });
    window.addEventListener('load', function () { ScrollTrigger.refresh(); });
  }

  /* ---------- the water (home and fjord) ---------- */
  if (!canvas) return;
  var foot = $('#foot');
  function fail() { root.classList.add('no-gl'); ScrollTrigger.refresh(); }
  function boot() {
    var one = {}; one[scene] = SC[scene];
    try { water = createWater(canvas, { scenes: SC, still: reduced, word: canvas.dataset.word }); } catch (e) { water = null; }
    if (!water) return fail();
    window.__water = water;
    water.init(scene).then(function () {
      root.classList.add('gl-sized'); water.poster(poster);
      root.classList.add('gl');
      var S = water.state, full = (canvas.dataset.word.length - 1) * 0.07 + 0.95;
      var calm = $('#calm');
      if (calm) calm.addEventListener('click', function () { var on = calm.getAttribute('aria-pressed') !== 'true'; calm.setAttribute('aria-pressed', on); calm.setAttribute('aria-label', on ? I.play : I.pause); water.pause(on); });
      if (reduced) { if (calm) calm.hidden = true; S.lift = full; water.render(); }
      else {
        water.start();
        var hdrShell = window.matchMedia('(min-width: 901px)').matches ? $('.hdr-shell') : null, kids = $$('#foot>*:not(.calm)');
        var tl = gsap.timeline({ delay: arriving ? 0.45 : 0 })
          .to(S, { lift: full, duration: 2.5, ease: 'none' }, 0.15)
          .fromTo(kids, { y: 16, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1.2, ease: 'expo.out', stagger: 0.1 }, 1.25);
        if (hdrShell && !arriving) tl.fromTo(hdrShell, { y: -18, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1.2, ease: 'expo.out', clearProps: 'transform,opacity,visibility' }, 0.9);
        gsap.to([canvas, poster], { yPercent: 9, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
        new IntersectionObserver(function (es) { es[0].isIntersecting && !document.hidden ? water.start() : water.stop(); }, { rootMargin: '40px' }).observe($('#stage'));
        document.addEventListener('visibilitychange', function () { document.hidden ? water.stop() : water.start(); });
      }
      var idle = window.requestIdleCallback || function (f) { setTimeout(f, 900); };
      idle(function () { water.preload(); });
      var lastW = window.innerWidth;
      window.addEventListener('resize', function () { if (window.innerWidth === lastW && !fine) return; lastW = window.innerWidth; water.resize(); water.poster(poster); });
      ScrollTrigger.refresh();
    }).catch(fail);
  }
  if (document.fonts && document.fonts.load) Promise.race([document.fonts.load('400 100px "Archivo Narrow"'), new Promise(function (r) { setTimeout(r, 2500); })]).then(boot, boot); else boot();
})();
