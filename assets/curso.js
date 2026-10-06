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
})();
