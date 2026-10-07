// Curso de HTML · interacciones mínimas (todo es opcional, la página funciona sin JS)
(function () {
  var root = document.documentElement;
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  // Tema claro / oscuro
  var saved = store.get('tema');
  if (saved) root.setAttribute('data-theme', saved);
  var themeBtn = document.getElementById('tema');
  if (themeBtn) themeBtn.addEventListener('click', function () {
    var dark = root.getAttribute('data-theme') === 'dark' ||
      (!root.getAttribute('data-theme') && matchMedia('(prefers-color-scheme: dark)').matches);
    var next = dark ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    store.set('tema', next);
  });

  // Botones "Copiar" en los bloques de código
  document.querySelectorAll('.code').forEach(function (block) {
    var btn = block.querySelector('.copy');
    var code = block.querySelector('pre code');
    if (!btn || !code) return;
    btn.addEventListener('click', function () {
      var done = function () { btn.textContent = '¡Copiado!'; setTimeout(function () { btn.textContent = 'Copiar'; }, 1500); };
      if (navigator.clipboard) navigator.clipboard.writeText(code.innerText).then(done);
    });
  });

  // Índice lateral: resalta la sección visible
  var links = document.querySelectorAll('.toc a');
  if (links.length && 'IntersectionObserver' in window) {
    var map = {};
    links.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting && map[e.target.id]) {
          links.forEach(function (l) { l.classList.remove('active'); });
          map[e.target.id].classList.add('active');
        }
      });
    }, { rootMargin: '-20% 0px -70% 0px' });
    Object.keys(map).forEach(function (id) { var el = document.getElementById(id); if (el) io.observe(el); });
  }

  // Checklist con progreso guardado en el navegador
  var boxes = document.querySelectorAll('.checklist input');
  var bar = document.querySelector('.progress > div');
  var label = document.getElementById('progreso-texto');
  function update() {
    var done = 0;
    boxes.forEach(function (b) { if (b.checked) done++; });
    if (bar) bar.style.width = (boxes.length ? done / boxes.length * 100 : 0) + '%';
    if (label) label.textContent = done + ' de ' + boxes.length + ' pasos completados';
  }
  boxes.forEach(function (b) {
    var key = 'check:' + location.pathname + ':' + b.id;
    b.checked = store.get(key) === '1';
    b.addEventListener('change', function () { store.set(key, b.checked ? '1' : '0'); update(); });
  });
  update();

  // ---------- Animaciones y componentes (v2) ----------
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.classList.add('js');

  // Barra de progreso de lectura
  if (document.querySelector('article')) {
    var rp = document.createElement('div');
    rp.className = 'read-progress';
    document.body.appendChild(rp);
    var onScroll = function () {
      var h = document.documentElement.scrollHeight - innerHeight;
      rp.style.width = (h > 0 ? scrollY / h * 100 : 0) + '%';
    };
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // Aparición al hacer scroll
  if (!reduce && 'IntersectionObserver' in window) {
    var targets = document.querySelectorAll('article h2, article .callout, article .code, article .table-wrap, article .demo, article .apuntes, article .quiz, article .playground, article details, article .steps, .feature');
    var rio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); rio.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    targets.forEach(function (el) { el.classList.add('reveal'); rio.observe(el); });
  }

  // Diagramas de anatomía: animación escalonada
  document.querySelectorAll('.anatomy').forEach(function (a) {
    a.querySelectorAll('.part').forEach(function (p, i) { p.style.setProperty('--i', i); });
    if ('IntersectionObserver' in window && !reduce) {
      var aio = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { a.classList.add('in'); aio.disconnect(); } });
      }, { threshold: .4 });
      aio.observe(a);
    }
  });

  // Zona de práctica en vivo
  var BASE = '<meta charset="utf-8"><style>body{font:16px/1.6 system-ui,sans-serif;color:#1e2235;padding:12px;margin:0}img{max-width:100%;height:auto}table{border-collapse:collapse}</style>';
  document.querySelectorAll('.playground').forEach(function (pg) {
    var ta = pg.querySelector('.pg-code'), fr = pg.querySelector('.pg-out'), rs = pg.querySelector('[data-reset]');
    if (!ta || !fr) return;
    var original = ta.value, t;
    var render = function () { fr.srcdoc = BASE + ta.value; };
    ta.addEventListener('input', function () { clearTimeout(t); t = setTimeout(render, 150); });
    ta.addEventListener('keydown', function (e) {
      if (e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault();
        var s = ta.selectionStart;
        ta.value = ta.value.slice(0, s) + '  ' + ta.value.slice(ta.selectionEnd);
        ta.selectionStart = ta.selectionEnd = s + 2;
        render();
      }
    });
    if (rs) rs.addEventListener('click', function () { ta.value = original; render(); });
    render();
  });

  // Autoevaluación
  document.querySelectorAll('.quiz').forEach(function (quiz) {
    var qs = quiz.querySelectorAll('.quiz-q'), score = quiz.querySelector('.quiz-score'), answered = 0, right = 0;
    qs.forEach(function (q) {
      var opts = q.querySelectorAll('.opt'), ex = q.querySelector('.explain');
      opts.forEach(function (o) {
        o.addEventListener('click', function () {
          opts.forEach(function (x) { x.disabled = true; if (x.hasAttribute('data-ok')) x.classList.add('ok'); });
          if (o.hasAttribute('data-ok')) right++; else o.classList.add('bad');
          if (ex) ex.hidden = false;
          answered++;
          if (score && answered === qs.length) score.textContent = 'Resultado: ' + right + ' de ' + qs.length + (right === qs.length ? ' · ¡Excelente!' : right >= qs.length / 2 ? ' · Muy bien, repasa lo que falló.' : ' · Vuelve a leer la lección y prueba de nuevo.');
        });
      });
    });
  });

  // Marcar lección completada
  document.querySelectorAll('[data-complete]').forEach(function (btn) {
    var key = 'leccion:' + btn.getAttribute('data-complete');
    var paint = function (on) { btn.classList.toggle('done', on); btn.textContent = on ? 'Lección completada' : 'Marcar como completada'; };
    paint(store.get(key) === '1');
    btn.addEventListener('click', function () { var on = store.get(key) !== '1'; store.set(key, on ? '1' : '0'); paint(on); });
  });
  var cards = document.querySelectorAll('[data-leccion]'), total = cards.length, done = 0;
  cards.forEach(function (c) {
    if (store.get('leccion:' + c.getAttribute('data-leccion')) === '1') {
      done++; c.classList.add('done');
      var tag = c.querySelector('.tag'); if (tag) { tag.textContent = '✓ Completada'; tag.className = 'tag done'; }
    }
  });
  var av = document.getElementById('avance');
  if (av && total) av.innerHTML = 'Tu avance: <strong>' + done + ' de ' + total + '</strong> lecciones completadas<div class="progress"><div style="width:' + (done / total * 100) + '%"></div></div>';

  // Hero: código que se escribe solo
  var typing = document.getElementById('typing'), out = document.getElementById('typing-out');
  if (typing && out) {
    var lines = JSON.parse(typing.getAttribute('data-lines'));
    var fin = function () { typing.classList.remove('caret'); };
    if (reduce) { typing.textContent = lines.join('\n'); out.innerHTML = lines.join(''); }
    else {
      typing.textContent = ''; out.innerHTML = ''; typing.classList.add('caret');
      var li = 0, ci = 0;
      var step = function () {
        if (li >= lines.length) return fin();
        var ln = lines[li];
        if (ci < ln.length) { typing.textContent += ln[ci++]; setTimeout(step, 28); }
        else { out.insertAdjacentHTML('beforeend', ln); typing.textContent += '\n'; li++; ci = 0; setTimeout(step, 450); }
      };
      setTimeout(step, 600);
    }
  }

  // ---------- Comprobador de ejercicios ----------
  var cfgEl = document.getElementById('checks');
  if (cfgEl) {
    var cfg = JSON.parse(cfgEl.textContent);
    var cta = document.getElementById('chk-code'), clist = document.getElementById('chk-list'), csum = document.getElementById('chk-sum');
    var ckey = 'borrador:' + location.pathname;
    var saved2 = store.get(ckey); if (saved2) cta.value = saved2;
    cta.addEventListener('input', function () { store.set(ckey, cta.value); });

    var q = function (doc, sel) { try { return [].slice.call(doc.querySelectorAll(sel)); } catch (e) { return []; } };
    var special = {
      anclas: function (doc) {
        var l = q(doc, 'a[href^="#"]').filter(function (a) { return a.getAttribute('href').length > 1; });
        return l.length > 0 && l.every(function (a) { return doc.getElementById(a.getAttribute('href').slice(1)); });
      },
      labels: function (doc) {
        var l = q(doc, 'label[for]');
        return l.length > 0 && l.every(function (x) { var t = doc.getElementById(x.getAttribute('for')); return t && /^(input|select|textarea)$/i.test(t.tagName); });
      },
      names: function (doc) {
        var f = q(doc, 'input, select, textarea').filter(function (e) { return !/^(submit|reset|button)$/i.test(e.getAttribute('type') || ''); });
        return f.length > 0 && f.every(function (e) { return (e.getAttribute('name') || '').trim() !== ''; });
      },
      img: function (doc) {
        var l = q(doc, 'img');
        return l.length > 0 && l.every(function (i) { return i.getAttribute('src') && i.hasAttribute('alt') && (i.getAttribute('alt').trim() !== '' || i.getAttribute('alt') === '') ; }) && l.some(function (i) { return i.getAttribute('alt').trim() !== '' && i.getAttribute('width') && i.getAttribute('height'); });
      },
      secciones: function (doc) { return q(doc, 'table thead').length > 0 && q(doc, 'table tbody').length > 0 && q(doc, 'table tfoot').length > 0; },
      radios: function (doc) {
        return q(doc, 'fieldset').some(function (f) {
          var r = q(f, 'input[type="radio"]'); return f.querySelector('legend') && r.length >= 2 && r.every(function (x) { return x.getAttribute('name') === r[0].getAttribute('name') && r[0].getAttribute('name'); });
        });
      },
      botones: function (doc) { return q(doc, 'button[type="submit"]').length > 0 && q(doc, 'button[type="reset"]').length > 0; },
      nav: function (doc) { return q(doc, 'nav[aria-label]').some(function (n) { return n.querySelectorAll('a').length >= 3; }); },
      sections: function (doc) { var s = q(doc, 'main section').filter(function (x) { return x.querySelector('h2'); }); return s.length >= 2; },
      sections3: function (doc) { var s = q(doc, 'section').filter(function (x) { return x.querySelector('h2'); }); return s.length >= 3; },
      audiosrc: function (doc) { return q(doc, 'audio[src], audio source[src]').length > 0; },
      picture: function (doc) { return q(doc, 'picture').some(function (pc) { var i = pc.querySelector('img'); return pc.querySelector('source[media], source[type]') && i && (i.getAttribute('alt') || '').trim() !== ''; }); },
      saltar: function (doc) { var a = q(doc, 'a[href^="#"]')[0]; return !!a && /salt|ir al|contenido/i.test(a.textContent) && !!doc.getElementById(a.getAttribute('href').slice(1)); },
      imgalt: function (doc) { var l = q(doc, 'img'); return l.length > 0 && l.every(function (i) { return i.hasAttribute('alt') && !/^(imagen|foto|img|image|picture)\d*$/i.test((i.getAttribute('alt') || '').trim()); }) && l.some(function (i) { return (i.getAttribute('alt') || '').trim() !== ''; }); },
      niveles: function (doc) { var h = q(doc, 'h1,h2,h3,h4,h5,h6').map(function (x) { return +x.tagName[1]; }); if (!h.length || h.filter(function (n) { return n === 1; }).length !== 1) return false; for (var i = 1; i < h.length; i++) if (h[i] - h[i - 1] > 1) return false; return true; },
      sinclic: function (doc) { return q(doc, 'button').length > 0 && q(doc, '[onclick]').filter(function (e) { return !/^(button|a|input)$/i.test(e.tagName); }).length === 0; },
      enlaces: function (doc) { var l = q(doc, 'a[href]'); return l.length > 0 && l.every(function (a) { var t = a.textContent.trim().toLowerCase(); return t.length > 3 && !/^(clic|click|aquí|aqui|más|mas|ver|pulsa|leer más|haz clic aquí|haz click aquí|enlace)$/.test(t) && !/^(haz )?(clic|click|pulsa) aqu[ií]$/.test(t); }); },
      titlelen: function (doc) { var t = doc.querySelector('head title'); var n = t ? t.textContent.trim().length : 0; return n >= 30 && n <= 60; },
      desclen: function (doc) { var m = doc.querySelector('meta[name="description"]'); var n = m ? (m.getAttribute('content') || '').trim().length : 0; return n >= 70 && n <= 160; },
      ogtexto: function (doc) { return !!doc.querySelector('meta[property="og:title"][content]') && !!doc.querySelector('meta[property="og:description"][content]'); },
      ogimg: function (doc) { return !!doc.querySelector('meta[property="og:image"][content]') && !!doc.querySelector('meta[property="og:url"][content]'); },
      estructura: function (doc) { return q(doc, 'body > header, body header').length > 0 && q(doc, 'main').length > 0 && q(doc, 'footer').length > 0; }
    };
    var test = function (c, src, doc) {
      if (c.t && special[c.t]) return special[c.t](doc);
      if (c.raw) { var mm = src.match(new RegExp(c.raw, 'gim')); return !!mm && mm.length >= (c.n || 1); }
      var els = q(doc, c.sel);
      if (c.attr) els = els.filter(function (e) { var v = e.getAttribute(c.attr); return v !== null && v.trim() !== ''; });
      if (c.text) { var re = new RegExp(c.text); els = els.filter(function (e) { return re.test(e.textContent); }); }
      var min = c.min == null ? 1 : c.min;
      return els.length >= min && (c.max == null || els.length <= c.max);
    };
    var run = function () {
      var src = cta.value;
      clist.innerHTML = ''; csum.className = 'chk-sum';
      if (!src.trim()) { csum.textContent = 'Pega primero tu código en el cuadro de arriba.'; return; }
      var doc = new DOMParser().parseFromString(src, 'text/html');
      var ok = 0;
      cfg.checks.forEach(function (c, i) {
        var pass = false; try { pass = !!test(c, src, doc); } catch (e) {}
        if (pass) ok++;
        var li = document.createElement('li'); li.style.setProperty('--i', i);
        if (pass) li.className = 'ok';
        var d = document.createElement('span'); d.textContent = c.d;
        var h = document.createElement('span'); h.className = 'hint'; h.textContent = '💡 ' + c.h;
        li.appendChild(d); li.appendChild(h); clist.appendChild(li);
      });
      var all = ok === cfg.checks.length;
      csum.textContent = all ? '🎉 ¡Todo correcto! Cumples los ' + ok + ' puntos.' : ok + ' de ' + cfg.checks.length + ' puntos cumplidos. Revisa las pistas en rojo.';
      if (all) csum.className = 'chk-sum all';
    };
    document.getElementById('chk-run').addEventListener('click', run);
    document.getElementById('chk-clear').addEventListener('click', function () { cta.value = ''; store.set(ckey, ''); clist.innerHTML = ''; csum.textContent = ''; csum.className = 'chk-sum'; });
    cta.addEventListener('keydown', function (e) {
      if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); var st = cta.selectionStart; cta.value = cta.value.slice(0, st) + '  ' + cta.value.slice(cta.selectionEnd); cta.selectionStart = cta.selectionEnd = st + 2; }
    });
  }

  // ---------- Widget: comprobador de contraste ----------
  document.querySelectorAll('[data-widget="contrast"]').forEach(function (w) {
    var fg = w.querySelector('.c-fg'), bg = w.querySelector('.c-bg'), sample = w.querySelector('.c-sample');
    var ratioEl = w.querySelector('.c-ratio'), res = w.querySelector('.c-res');
    var lum = function (hex) {
      var c = [1, 3, 5].map(function (i) { var v = parseInt(hex.substr(i, 2), 16) / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
      return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    };
    var upd = function () {
      var a = lum(fg.value), b = lum(bg.value), r = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      sample.style.color = fg.value; sample.style.background = bg.value;
      ratioEl.textContent = 'Contraste ' + r.toFixed(2) + ' : 1';
      var tests = [['Texto normal (AA, mínimo 4.5)', r >= 4.5], ['Texto grande (AA, mínimo 3)', r >= 3], ['Texto normal (AAA, mínimo 7)', r >= 7]];
      res.innerHTML = '';
      tests.forEach(function (t) { var li = document.createElement('li'); li.className = t[1] ? 'ok' : 'bad'; li.textContent = (t[1] ? '✓ ' : '✗ ') + t[0]; res.appendChild(li); });
    };
    fg.addEventListener('input', upd); bg.addEventListener('input', upd); upd();
  });

  // ---------- Widget: vista previa en buscadores ----------
  document.querySelectorAll('[data-widget="serp"]').forEach(function (w) {
    var t = w.querySelector('.s-title'), d = w.querySelector('.s-desc'), u = w.querySelector('.s-url');
    var pt = w.querySelector('.serp-title'), pd = w.querySelector('.serp-desc'), pu = w.querySelector('.serp-url');
    var ct = w.querySelector('.count-title'), cd = w.querySelector('.count-desc');
    var cut = function (str, n) { return str.length > n ? str.slice(0, n - 1).trim() + '…' : str; };
    var upd = function () {
      pt.textContent = cut(t.value || 'Título de tu página', 60);
      pd.textContent = cut(d.value || 'Aquí aparecerá la descripción de tu página.', 160);
      pu.textContent = u.value || 'https://tusitio.com';
      var lt = t.value.length, ld = d.value.length;
      ct.textContent = lt + ' caracteres · ideal entre 30 y 60'; ct.className = 'counter count-title ' + (lt >= 30 && lt <= 60 ? 'ok' : 'bad');
      cd.textContent = ld + ' caracteres · ideal entre 70 y 160'; cd.className = 'counter count-desc ' + (ld >= 70 && ld <= 160 ? 'ok' : 'bad');
    };
    [t, d, u].forEach(function (i) { i.addEventListener('input', upd); }); upd();
  });

  // Regiones con desplazamiento: accesibles con teclado solo cuando de verdad se desbordan
  var scrollers = document.querySelectorAll('.code pre, .table-wrap, .demo, .anatomy');
  var markScrollers = function () {
    scrollers.forEach(function (el) {
      var over = el.scrollWidth > el.clientWidth + 1;
      if (over) el.setAttribute('tabindex', '0');
      else if (el.getAttribute('tabindex') === '0') el.removeAttribute('tabindex');
    });
  };
  markScrollers();
  addEventListener('resize', markScrollers);
  addEventListener('load', markScrollers);
})();
