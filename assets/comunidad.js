/* Comunidad (opcional): login, perfil, reto del día y ranking con Supabase.
   Sin URL/clave configuradas, no hace nada y el curso funciona igual con localStorage.
   El navegador nunca escribe tablas: solo llama a funciones (RPC) que validan en el servidor. */
(function () {
  'use strict';
  var SUPA_URL = 'https://kypbeslnyxzynradjlkv.supabase.co';   // https://xxxx.supabase.co
  var SUPA_KEY = 'sb_publishable_WyfGhjSy1cHCpJ19MjiCfg_hbleJJ3S';   // anon key (pública por diseño)
  var enabled = !!(SUPA_URL && SUPA_KEY);
  var api = { enabled: enabled };
  window.__comunidad = api;
  if (!enabled) return;

  var client = null, session = null, perfil = null, loading = null, listeners = [];
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  var ready = function () {
    if (loading) return loading;
    loading = new Promise(function (ok, fail) {
      var s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js';
      s.onload = ok; s.onerror = fail; document.head.appendChild(s);
    }).then(function () {
      client = window.supabase.createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: true, detectSessionInUrl: true } });
      client.auth.onAuthStateChange(function (_e, ses) { session = ses; perfil = null; listeners.forEach(function (f) { f(); }); });
      return client.auth.getSession().then(function (r) { session = r.data.session; return client; });
    }).catch(function () { loading = null; return null; });
    return loading;
  };

  // Cada lección completada con sesión iniciada se registra en el servidor (él valida límites)
  var origSet = Storage.prototype.setItem;
  Storage.prototype.setItem = function (k, v) {
    origSet.apply(this, arguments);
    try {
      if (this === window.localStorage && /^leccion:/.test(k) && v === '1') {
        ready().then(function (c) { if (c && session) c.rpc('completar_leccion', { p_leccion: k.slice(8) }).then(function (r) { if (r.data && r.data.ok === false && api.say) api.say('⏱ ' + r.data.motivo); }); });
      }
    } catch (e) { /* opcional */ }
  };
  ready();

  var loadPerfil = function () {
    if (perfil !== null || !session) return Promise.resolve(perfil);
    return client.from('perfiles').select('apodo,avatar').eq('user_id', session.user.id).maybeSingle().then(function (r) { perfil = r.data || false; return perfil; });
  };

  var entrar = function (prov) { client.auth.signInWithOAuth({ provider: prov, options: { redirectTo: location.href.split('#')[0] } }); };

  /* ctx: { q:[pregunta,opciones,correcta], dia:int, avatar:int, avatars:[], say:fn, onReto:fn(acierto) } */
  api.render = function (el, ctx) {
    api.say = ctx.say;
    var draw = function () { api.render(el, ctx); };
    listeners = [draw];
    el.innerHTML = '<p class="pp-small">Cargando comunidad…</p>';
    ready().then(function (c) {
      if (!c) { el.innerHTML = '<p class="pp-small">No se pudo conectar con la comunidad. Revisa tu conexión.</p>'; return; }
      if (!session) {
        el.innerHTML = '<p class="pp-small">El <b>reto del día</b>, el <b>ranking semanal</b> y tu <b>perfil público</b> necesitan una cuenta. Las lecciones siguen siendo libres y sin cuenta.</p>' +
          '<div class="pp-actions"><button type="button" class="btn" data-p="github">Entrar con GitHub</button></div>';
        Array.prototype.forEach.call(el.querySelectorAll('[data-p]'), function (b) { b.onclick = function () { entrar(b.getAttribute('data-p')); }; });
        return;
      }
      loadPerfil().then(function (p) {
        if (!p) {
          el.innerHTML = '<p class="pp-small">Elige un apodo público (3–20 letras, números, _ o -). No uses tu nombre real si no quieres.</p>' +
            '<div class="pp-actions"><input id="pc-apodo" maxlength="20" placeholder="tu_apodo" aria-label="Apodo"><button type="button" class="btn" id="pc-ok">Guardar</button></div><p class="pp-small" id="pc-err"></p>';
          el.querySelector('#pc-ok').onclick = function () {
            c.rpc('guardar_perfil', { p_apodo: el.querySelector('#pc-apodo').value.trim(), p_avatar: ctx.avatar || 0 }).then(function (r) {
              if (r.error) el.querySelector('#pc-err').textContent = /unique|duplicate/i.test(r.error.message) ? 'Ese apodo ya existe.' : 'Apodo no válido.';
              else { perfil = null; draw(); }
            });
          };
          return;
        }
        Promise.all([
          c.rpc('mi_estado'),
          c.from('retos_resueltos').select('acierto').eq('dia', new Date().toISOString().slice(0, 10)).maybeSingle(),
          c.from('clasificacion_semanal').select('*')
        ]).then(function (res) {
          var est = res[0].data || {}, hoy = res[1].data, rank = res[2].data || [];
          var h = '<p class="pp-small">👤 <b>' + esc(p.apodo) + '</b> · servidor: ' + (est.lecciones || 0) + ' lecciones, nivel ' + (est.nivel || 1) + ' · <button type="button" class="icon-btn" id="pc-out">Salir</button></p>';
          h += '<div class="pp-daily"><p><b>' + esc(ctx.q[0]) + '</b></p><div class="pp-dopts">';
          ctx.q[1].forEach(function (o, i) { h += '<button type="button" class="chip" data-d="' + i + '"' + (hoy ? ' disabled' : '') + '>' + esc(o) + '</button>'; });
          h += '</div>' + (hoy ? '<p class="pp-small">' + (hoy.acierto ? '✅ ¡Correcto!' : '❌ Hoy fallaste') + ' Vuelve mañana por otro.</p>' : '') + '</div>';
          h += '<h4>🏆 Ranking de la semana</h4><ol class="pp-rank">' + (rank.length ? rank.map(function (r) { return '<li>' + (ctx.avatars[r.avatar] || '🙂') + ' ' + esc(r.apodo) + ' <small>' + r.xp_semana + ' XP</small></li>'; }).join('') : '<li>Aún no hay nadie. ¡Sé la primera persona!</li>') + '</ol>';
          el.innerHTML = h;
          el.querySelector('#pc-out').onclick = function () { c.auth.signOut(); };
          Array.prototype.forEach.call(el.querySelectorAll('[data-d]'), function (b) {
            b.onclick = function () {
              c.rpc('responder_reto', { p_dia: ctx.dia, p_respuesta: +b.getAttribute('data-d') }).then(function (r) {
                if (r.data && r.data.ok) ctx.onReto(r.data.acierto); else if (r.data) ctx.say('⚠ ' + r.data.motivo);
                draw();
              });
            };
          });
        });
      });
    });
  };
})();
