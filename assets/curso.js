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
})();
