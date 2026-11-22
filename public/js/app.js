(function () {
  'use strict';
  var S = window.SITE;
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var catById = {}; S.cats.forEach(function (c) { catById[c.id] = c; });

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmtDate(d) {
    try { return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }
    catch (e) { return d; }
  }
  function getJSON(url) {
    return fetch(url).then(function (r) { if (!r.ok) throw new Error(r.status + ' ' + url); return r.json(); });
  }
  function toast(msg) {
    var t = $('#toast'); if (!t) return;
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('show'); }, 1800);
  }
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(function () { toast('Prompt copied'); });
    }
    var ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); toast('Prompt copied'); } catch (e) { toast('Copy failed'); }
    document.body.removeChild(ta);
  }
  function downloadText(name, text) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  /* ---------- route helpers (/cat  or  /cat/id) ---------- */
  function route() {
    var p = new URLSearchParams(location.search);
    var seg = location.pathname.replace(/\/+$/, '').split('/').filter(Boolean);
    var cat = p.get('c') || (catById[seg[0]] ? seg[0] : '');
    var id = p.get('id') || (seg[1] || '');
    return { cat: cat, id: decodeURIComponent(id) };
  }
  function itemUrl(it) { return '/' + it.cat + '/' + encodeURIComponent(it.id); }

  /* ---------- header / footer ---------- */
  function renderChrome() {
    var cur = route().cat, page = document.body.dataset.page;
    var stock = ['freepik', 'adobe-stock', 'shutterstock'];
    function a(id, label) {
      return '<a href="/' + id + '"' + (cur === id ? ' class="on"' : '') + '>' + esc(label) + '</a>';
    }
    var dd = '<div class="dd"><button class="dd-btn' + (stock.indexOf(cur) > -1 ? ' on' : '') + '" aria-haspopup="true">Stock Files ▾</button><div class="dd-menu">' +
      stock.map(function (id) { return a(id, catById[id].label); }).join('') + '</div></div>';
    var nav = '<a href="/"' + (page === 'home' ? ' class="on"' : '') + '>Home</a>' +
      a('illustrations', 'Illustrations') + dd + a('pinterest', 'Pinterest') + a('clients', 'Clients') + a('premium', 'Premium');
    $('#site-header').innerHTML =
      '<div class="wrap"><a class="logo" href="/" aria-label="Home">AD<b>DESIGN</b></a>' +
      '<nav class="nav" id="nav">' + nav + '</nav>' +
      '<a class="head-cta" href="' + esc(S.linktree) + '" target="_blank" rel="noopener">Hire me</a>' +
      '<button class="burger" id="burger" aria-label="Menu" aria-expanded="false"><i></i></button></div>';
    $('#burger').addEventListener('click', function () {
      var open = document.body.classList.toggle('menu-open');
      this.setAttribute('aria-expanded', open);
    });
    $$('#nav a').forEach(function (l) { l.addEventListener('click', function () { document.body.classList.remove('menu-open'); }); });

    $('#site-footer').innerHTML = '<div class="wrap"><span>© ' + new Date().getFullYear() + ' ' + esc(S.name) + '. All rights reserved.</span>' +
      '<nav>' + S.cats.map(function (c) { return '<a href="/' + c.id + '">' + esc(c.label) + '</a>'; }).join('') +
      '<a href="' + esc(S.linktree) + '" target="_blank" rel="noopener">Linktree ↗</a></nav></div>';
  }

  /* ---------- reveal + counters ---------- */
  var io = ('IntersectionObserver' in window) ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0.05 }) : null;
  function observe() {
    $$('.reveal:not(.in)').forEach(function (el) { io ? io.observe(el) : el.classList.add('in'); });
  }
  function counters() {
    $$('[data-count]').forEach(function (el) {
      var end = +el.dataset.count, suf = el.dataset.suffix || '';
      if (reduce) { el.textContent = end + suf; return; }
      var t0 = performance.now(), dur = 1400;
      (function tick(t) {
        var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
        el.textContent = Math.round(end * e) + suf;
        if (k < 1) requestAnimationFrame(tick);
      })(t0);
    });
  }

  /* ---------- cards ---------- */
  function card(it) {
    var c = it.cover;
    return '<a class="card reveal" href="' + itemUrl(it) + '">' +
      '<div class="thumb"><img src="' + esc(c.src) + '" width="' + c.w + '" height="' + c.h + '" loading="lazy" decoding="async" alt="' + esc(it.title) + '">' +
      '<span class="pill">' + esc(it.catName) + '</span>' +
      (it.price ? '<span class="price">' + esc(it.price) + '</span>' : '') + '</div>' +
      '<div class="cmeta"><h3>' + esc(it.title) + '</h3><span>' + fmtDate(it.date) +
      (it.imageCount > 1 ? ' · ' + it.imageCount + ' images' : '') + '</span></div></a>';
  }
  function showError(el, msg) {
    el.innerHTML = '<div class="err">' + msg + '</div>';
  }
  var LOCAL_HINT = 'Data load nahi hua. Agar tum file seedha double-click se khol rahe ho to ye kaam nahi karta. Terminal mein <b>npm run dev</b> chalao aur browser mein <b>localhost</b> link kholo.';

  /* ---------- carousel ---------- */
  function carousel(el, images, alt) {
    var i = 0, timer = null, hover = false;
    el.innerHTML =
      '<div class="stage"><img alt="" decoding="async">' +
      (images.length > 1 ? '<button class="nav-b prev" aria-label="Previous image">‹</button><button class="nav-b next" aria-label="Next image">›</button><div class="count"></div>' : '') +
      '</div>' +
      (images.length > 1 ? '<div class="strip">' + images.map(function (im, n) {
        return '<button data-i="' + n + '" aria-label="Image ' + (n + 1) + '"><img src="' + esc(im.t) + '" loading="lazy" alt=""></button>';
      }).join('') + '</div>' : '');
    var img = $('.stage img', el), count = $('.count', el), thumbs = $$('.strip button', el);
    function show(n) {
      i = (n + images.length) % images.length;
      img.classList.add('swap');
      var src = images[i].f, pre = new Image();
      pre.onload = pre.onerror = function () {
        img.src = src; img.alt = alt + ' (' + (i + 1) + ' of ' + images.length + ')';
        requestAnimationFrame(function () { img.classList.remove('swap'); });
        var nx = new Image(); nx.src = images[(i + 1) % images.length].f;
      };
      pre.src = src;
      if (count) count.textContent = (i + 1) + ' / ' + images.length;
      thumbs.forEach(function (b, k) { b.classList.toggle('on', k === i); });
      if (thumbs[i] && thumbs[i].scrollIntoView) {
        var s = $('.strip', el); if (s) s.scrollTo({ left: thumbs[i].offsetLeft - 60, behavior: reduce ? 'auto' : 'smooth' });
      }
    }
    function play() {
      stop(); if (reduce || images.length < 2) return;
      timer = setInterval(function () { if (!hover && !document.hidden) show(i + 1); }, 4500);
    }
    function stop() { if (timer) clearInterval(timer); timer = null; }
    $$('.nav-b', el).forEach(function (b) {
      b.addEventListener('click', function () { show(i + (b.classList.contains('next') ? 1 : -1)); play(); });
    });
    thumbs.forEach(function (b) { b.addEventListener('click', function () { show(+b.dataset.i); play(); }); });
    el.addEventListener('mouseenter', function () { hover = true; });
    el.addEventListener('mouseleave', function () { hover = false; });
    el.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { show(i + 1); play(); } else if (e.key === 'ArrowLeft') { show(i - 1); play(); }
    });
    var sx = null, stage = $('.stage', el);
    stage.addEventListener('pointerdown', function (e) { sx = e.clientX; });
    stage.addEventListener('pointerup', function (e) {
      if (sx == null) return; var dx = e.clientX - sx; sx = null;
      if (Math.abs(dx) > 40) { show(i + (dx < 0 ? 1 : -1)); play(); }
    });
    img.src = images[0].f; img.alt = alt; show(0); play();
  }

  /* ---------- prompt box ---------- */
  function promptBox(it) {
    if (!it.prompt) return '';
    return '<div class="pbox"><div class="pbox-h"><b>MASTER PROMPT</b><div>' +
      '<button class="btn red sm" data-act="copy">Copy prompt</button>' +
      '<button class="btn ghost sm" data-act="txt">Download .txt</button></div></div>' +
      '<pre>' + esc(it.prompt) + '</pre></div>';
  }
  function bindPrompt(root, it) {
    var c = $('[data-act="copy"]', root), t = $('[data-act="txt"]', root);
    if (c) c.addEventListener('click', function () { copyText(it.prompt); });
    if (t) t.addEventListener('click', function () { downloadText(it.id + '-prompt.txt', it.prompt); });
  }

  /* ---------- YouTube (lite: iframe sirf click par load hota hai) ---------- */
  function ytId(u) {
    var m = String(u || '').match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([A-Za-z0-9_-]{11})/);
    return m ? m[1] : '';
  }
  function ytBlock(url) {
    if (!url) return '';
    var id = ytId(url);
    if (!id) return '<div class="actions"><a class="btn ghost" href="' + esc(url) + '" target="_blank" rel="noopener">Watch tutorial ↗</a></div>';
    return '<div class="yt" data-yt="' + id + '"><img src="https://i.ytimg.com/vi/' + id + '/hqdefault.jpg" loading="lazy" alt="Tutorial video thumbnail">' +
      '<button aria-label="Play tutorial video"><span class="play"></span></button><span class="yt-label">Watch the tutorial</span></div>';
  }
  function bindYT(root) {
    $$('.yt', root).forEach(function (box) {
      $('button', box).addEventListener('click', function () {
        box.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + box.dataset.yt + '?autoplay=1&rel=0" title="Tutorial video" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>';
      });
    });
  }

  /* ===================== PAGES ===================== */
  function pageHome() {
    var tagEl = $('[data-tagline]'); if (tagEl && S.tagline) tagEl.textContent = S.tagline;
    var cta = $('#cta-link'); if (cta) cta.href = S.linktree;
    var words = ['Adobe Stock', 'Magnific', 'Shutterstock', 'Pinterest', 'New files daily', 'Illustrations', 'Master prompts'];
    var mq = $('#marquee');
    mq.innerHTML = words.concat(words).concat(words).concat(words).map(function (w) { return '<span>' + w + '</span>'; }).join('');
    counters();

    var tabsEl = $('#tabs'), grid = $('#latest-cards'), more = $('#latest-more');
    var tabIds = ['all', 'illustrations', 'freepik', 'adobe-stock', 'shutterstock', 'pinterest'];
    var tabLabel = { all: 'All' }; S.cats.forEach(function (c) { tabLabel[c.id] = c.label; });
    var items = [], cur = 'all';

    function draw() {
      var list = items.filter(function (it) { return cur === 'all' ? it.cat !== 'premium' : it.cat === cur; }).slice(0, 8);
      grid.innerHTML = list.length ? list.map(card).join('') : '<div class="empty">Nothing here yet. New files coming soon.</div>';
      more.href = cur === 'all' ? '/illustrations' : '/' + cur;
      more.textContent = cur === 'all' ? 'Browse illustrations →' : 'View all ' + tabLabel[cur] + ' →';
      observe();
    }
    tabsEl.innerHTML = tabIds.map(function (id) {
      return '<button class="tab' + (id === 'all' ? ' on' : '') + '" role="tab" data-t="' + id + '">' + esc(tabLabel[id]) + '</button>';
    }).join('');
    tabsEl.addEventListener('click', function (e) {
      var b = e.target.closest('.tab'); if (!b) return;
      cur = b.dataset.t; $$('.tab', tabsEl).forEach(function (x) { x.classList.toggle('on', x === b); }); draw();
    });
    getJSON('/data/latest.json').then(function (d) { items = d; draw(); })
      .catch(function () { showError(grid, LOCAL_HINT); });

    /* Prompt lab: latest illustration set */
    getJSON('/data/illustrations.json').then(function (list) {
      if (!list.length) return;
      return getJSON('/data/items/illustrations/' + list[0].id + '.json').then(function (it) {
        $('#prompts').hidden = false;
        carousel($('#lab-car'), it.images, it.title);
        var info = $('#lab-info');
        info.innerHTML = '<h3 class="h3">' + esc(it.title) + '</h3><p class="d">' + fmtDate(it.date) + (it.desc ? ' · ' + esc(it.desc) : '') + '</p>' +
          '<ol class="how"><li>Watch the tutorial or browse the images</li><li>Copy the master prompt</li><li>Paste it in your AI tool and make your own</li></ol>' +
          promptBox(it) +
          '<div class="actions"><a class="btn ghost" href="' + itemUrl(it) + '">Open full set →</a><a class="btn ghost" href="/illustrations">All illustrations</a></div>';
        bindPrompt(info, it); observe();
      });
    }).catch(function () { });

    /* Premium teaser */
    getJSON('/data/premium.json').then(function (list) {
      if (!list.length) return;
      $('#premium-teaser').hidden = false;
      $('#premium-cards').innerHTML = list.slice(0, 4).map(card).join(''); observe();
    }).catch(function () { });
  }

  function pageGallery() {
    var cat = route().cat, meta = catById[cat];
    var grid = $('#g-cards');
    if (!meta) { $('#g-title').textContent = 'Not found'; showError(grid, 'Ye category maujood nahi.'); return; }
    document.title = meta.label + ' | ' + S.name;
    $('#g-eyebrow').textContent = 'Gallery';
    $('#g-title').textContent = meta.label;
    $('#g-blurb').textContent = meta.blurb;
    var prof = S.profiles && S.profiles[cat], pb = $('#g-profile');
    if (prof) { pb.href = prof; pb.hidden = false; }

    var all = [], list = [], shown = 0, PAGE = 24, more = $('#g-more');
    function draw(reset) {
      if (reset) { grid.innerHTML = ''; shown = 0; }
      var next = list.slice(shown, shown + PAGE);
      if (!list.length) { grid.innerHTML = '<div class="empty">Nothing here yet. New files coming soon.</div>'; }
      else grid.insertAdjacentHTML('beforeend', next.map(card).join(''));
      shown += next.length; more.hidden = shown >= list.length; observe();
    }
    getJSON('/data/' + cat + '.json').then(function (d) { all = d; list = d; draw(true); })
      .catch(function () { showError(grid, LOCAL_HINT); });
    more.addEventListener('click', function () { draw(false); });
    $('#g-search').addEventListener('input', function () {
      var q = this.value.trim().toLowerCase();
      list = all.filter(function (it) { return !q || (it.title + ' ' + it.tag).toLowerCase().indexOf(q) > -1; }); draw(true);
    });
  }

  function pageItem() {
    var r = route(), app = $('#app');
    if (!catById[r.cat] || !r.id) { showError(app, 'Item nahi mila.'); return; }
    getJSON('/data/items/' + r.cat + '/' + encodeURIComponent(r.id) + '.json').then(function (it) {
      document.title = it.title + ' | ' + S.name;
      var isPremium = it.cat === 'premium';
      var tags = '<span class="hot">' + esc(it.catName) + '</span><span>' + fmtDate(it.date) + '</span>' + (it.tag ? '<span>' + esc(it.tag) + '</span>' : '') +
        (it.price ? '<span class="hot">' + esc(it.price) + '</span>' : '');
      var actions = '';
      if (it.buy) actions += '<a class="btn red" href="' + esc(it.buy) + '" target="_blank" rel="noopener">Buy now' + (it.price ? ' · ' + esc(it.price) : '') + '</a>';
      if (it.download && !isPremium) actions += '<a class="btn red" href="' + esc(it.download) + '" ' + (/^https?:/.test(it.download) ? 'target="_blank" rel="noopener"' : 'download') + '>Download file</a>';
      if (it.link) actions += '<a class="btn ghost" href="' + esc(it.link) + '" target="_blank" rel="noopener">View on ' + (isPremium ? 'store' : 'marketplace') + ' ↗</a>';

      app.innerHTML =
        '<p class="crumb"><a href="/">Home</a> / <a href="/' + it.cat + '">' + esc(it.catName) + '</a> / ' + esc(it.title) + '</p>' +
        '<div class="item-grid"><div><div id="i-car" class="car" tabindex="0" aria-label="Image slider"></div></div>' +
        '<div><h1>' + esc(it.title) + '</h1><div class="tags">' + tags + '</div>' +
        (it.desc ? '<p class="d">' + esc(it.desc) + '</p>' : '') +
        (actions ? '<div class="actions">' + actions + '</div>' : '') +
        promptBox(it) + ytBlock(it.youtube) + '</div></div>' +
        '<div class="sec-head" style="margin-top:70px"><div><div class="eyebrow">More</div><h2 class="h2">More ' + esc(it.catName) + '</h2></div></div>' +
        '<div class="cards" id="i-more"></div>';
      carousel($('#i-car'), it.images, it.title);
      bindPrompt(app, it); bindYT(app);
      getJSON('/data/' + it.cat + '.json').then(function (list) {
        var rest = list.filter(function (x) { return x.id !== it.id; }).slice(0, 4);
        $('#i-more').innerHTML = rest.length ? rest.map(card).join('') : '<div class="empty">More coming soon.</div>'; observe();
      });
    }).catch(function () { showError(app, LOCAL_HINT); });
  }

  /* ---------- boot ---------- */
  renderChrome();
  var pg = document.body.dataset.page;
  if (pg === 'home') pageHome(); else if (pg === 'gallery') pageGallery(); else if (pg === 'item') pageItem();
  observe();
})();
