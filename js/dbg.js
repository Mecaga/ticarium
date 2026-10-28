(function () {
  var logs = [], errCount = 0, open = false, base = location.href.replace(/[^\/]*$/, '');
  var short = function (s) { return String(s).split(base).join(''); };
  function fmt(a) {
    if (a instanceof Error) return a.message + (a.stack ? '\n' + short(a.stack) : '');
    if (typeof a === 'object') { try { return JSON.stringify(a); } catch (e) { return String(a); } }
    return String(a);
  }
  function add(type, s) {
    logs.push({ t: type, s: s, time: new Date().toLocaleTimeString() });
    if (logs.length > 200) logs.shift();
    if (type === 'err') errCount++;
    if (btn) { badge.textContent = errCount || ''; badge.style.display = errCount ? 'block' : 'none'; }
    if (open) render();
  }
  var oe = console.error, ow = console.warn;
  console.error = function () { add('err', [].slice.call(arguments).map(fmt).join(' ')); oe.apply(console, arguments); };
  console.warn = function () { add('warn', [].slice.call(arguments).map(fmt).join(' ')); ow.apply(console, arguments); };
  window.addEventListener('error', function (e) {
    var t = e.target;
    if (t && t !== window && (t.src || t.href)) { add('err', 'Dosya yüklenemedi: ' + short(t.src || t.href)); return; }
    add('err', (e.message || 'Hata') + '\n📍 ' + short(e.filename || '?') + ' satır ' + (e.lineno || '?') + ':' + (e.colno || '?') +
      (e.error && e.error.stack ? '\n' + short(e.error.stack) : ''));
  }, true);
  window.addEventListener('unhandledrejection', function (e) {
    var r = e.reason;
    add('err', 'Söz (promise) hatası: ' + (r && r.message ? r.message : String(r)) + (r && r.stack ? '\n' + short(r.stack) : ''));
  });

  var btn, badge, panel, list;
  function init() {
    btn = document.createElement('div');
    btn.textContent = '🐞';
    btn.style.cssText = 'position:fixed;left:4px;top:46%;width:36px;height:36px;border-radius:50%;background:#000a;color:#fff;font-size:18px;display:flex;align-items:center;justify-content:center;z-index:200;opacity:.75';
    badge = document.createElement('b');
    badge.style.cssText = 'position:absolute;top:-4px;right:-4px;background:#e53935;color:#fff;font-size:10px;border-radius:8px;padding:1px 5px;display:none';
    btn.appendChild(badge);
    document.body.appendChild(btn);
    panel = document.createElement('div');
    panel.style.cssText = 'position:fixed;inset:6% 3%;background:#101520f2;color:#ddd;z-index:201;border-radius:12px;padding:8px;display:none;flex-direction:column;font:11px/1.35 monospace';
    list = document.createElement('div');
    list.style.cssText = 'flex:1;overflow:auto;white-space:pre-wrap;word-break:break-all;-webkit-user-select:text;user-select:text';
    var bar = document.createElement('div');
    bar.style.cssText = 'display:flex;gap:6px;margin-bottom:6px;flex-wrap:wrap';
    var mk = function (t, fn) {
      var b = document.createElement('button');
      b.textContent = t; b.style.cssText = 'padding:7px 10px;border:0;border-radius:6px;background:#2b3345;color:#fff;font-size:12px';
      b.onclick = fn; bar.appendChild(b);
    };
    mk('Kopyala', function () {
      var t = logs.map(function (l) { return '[' + l.time + '] ' + l.t.toUpperCase() + ' ' + l.s; }).join('\n\n');
      (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).catch(function () {
        var a = document.createElement('textarea'); a.value = t; document.body.appendChild(a); a.select(); document.execCommand('copy'); a.remove();
      });
    });
    mk('Temizle', function () { logs = []; errCount = 0; badge.style.display = 'none'; render(); });
    mk('🔍 Tarama', function () { window.open('hata.html', '_blank'); });
    mk('Kapat', function () { open = false; panel.style.display = 'none'; });
    var inp = document.createElement('input');
    inp.placeholder = 'JS yaz (örn: P.x) ve Enter';
    inp.style.cssText = 'margin-top:6px;padding:8px;border-radius:6px;border:0;font:12px monospace;width:100%;box-sizing:border-box';
    inp.onkeydown = function (e) {
      if (e.key !== 'Enter' || !inp.value.trim()) return;
      var c = inp.value; inp.value = '';
      try { add('log', '> ' + c + '\n' + fmt((0, eval)(c))); } catch (er) { add('err', '> ' + c + '\n' + er.message); }
    };
    panel.appendChild(bar); panel.appendChild(list); panel.appendChild(inp);
    document.body.appendChild(panel);
    var tog = function (e) { e.preventDefault(); e.stopPropagation(); open = !open; panel.style.display = open ? 'flex' : 'none'; if (open) render(); };
    btn.addEventListener('touchstart', tog, { passive: false });
    btn.addEventListener('mousedown', tog);
    ['touchstart', 'mousedown', 'pointerdown'].forEach(function (ev) { panel.addEventListener(ev, function (e) { e.stopPropagation(); }, { passive: true }); });
    badge.textContent = errCount || ''; badge.style.display = errCount ? 'block' : 'none';
  }
  function render() {
    list.textContent = '';
    if (!logs.length) list.textContent = 'Kayıt yok ✅';
    logs.slice().reverse().forEach(function (l) {
      var d = document.createElement('div');
      d.style.cssText = 'padding:5px 0;border-bottom:1px solid #fff2;color:' + (l.t === 'err' ? '#ff8a80' : l.t === 'warn' ? '#ffd180' : '#b0d0ff');
      d.textContent = '[' + l.time + '] ' + l.s;
      list.appendChild(d);
    });
  }
  if (document.body) init(); else document.addEventListener('DOMContentLoaded', init);
})();
