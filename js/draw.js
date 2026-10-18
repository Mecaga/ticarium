const st = document.createElement('style');
st.textContent = `
#drawPanel{position:fixed;inset:0;background:#000c;z-index:28;display:none;align-items:center;justify-content:center;touch-action:none}
#drawBox{background:#1d2330;color:#fff;border-radius:14px;padding:12px;width:min(96vw,380px);max-height:96vh;overflow:auto}
#drawCv{display:block;margin:0 auto;width:min(86vw,320px);height:min(86vw,320px);image-rendering:pixelated;background:#fff;border-radius:4px;touch-action:none}
#drawCols{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0}
#drawCols i{width:30px;height:30px;border-radius:6px;border:3px solid #fff4;display:block}
#drawCols i.on{border-color:#ffd84a}
#drawTools{display:flex;flex-wrap:wrap;gap:6px}
#drawTools button{flex:1;min-width:92px;padding:10px 6px;border:0;border-radius:8px;background:#444;color:#fff;font-weight:700}
#drawTools button.on{background:#1565c0}
`;
document.head.appendChild(st);

const S = 64;
const COLORS = ['#000000', '#ffffff', '#e53935', '#fb8c00', '#fdd835', '#43a047', '#1e88e5', '#8e24aa', '#8d6e63', '#ec407a', '#26c6da', '#9e9e9e'];
let el = null, cv = null, cx = null, open = false, color = '#000000', size = 2, tool = 'brush', cb = null, down = false, last = null;
export const isDrawOpen = () => open;

function pt(e) {
  const r = cv.getBoundingClientRect();
  return [
    Math.max(0, Math.min(S - 1, Math.floor((e.clientX - r.left) / r.width * S))),
    Math.max(0, Math.min(S - 1, Math.floor((e.clientY - r.top) / r.height * S)))
  ];
}
function plot(x, y) {
  cx.fillStyle = tool === 'erase' ? '#ffffff' : color;
  cx.fillRect(x - (size >> 1), y - (size >> 1), size, size);
}
function line(a, b) {
  const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), 1);
  for (let i = 0; i <= n; i++) plot(Math.round(a[0] + (b[0] - a[0]) * i / n), Math.round(a[1] + (b[1] - a[1]) * i / n));
}
function fill(x, y) {
  const img = cx.getImageData(0, 0, S, S), d = img.data;
  const i0 = (y * S + x) * 4, tr = d[i0], tg = d[i0 + 1], tb = d[i0 + 2];
  const nr = parseInt(color.slice(1, 3), 16), ng = parseInt(color.slice(3, 5), 16), nb = parseInt(color.slice(5, 7), 16);
  if (tr === nr && tg === ng && tb === nb) return;
  const st2 = [[x, y]];
  while (st2.length) {
    const [px, py] = st2.pop();
    if (px < 0 || py < 0 || px >= S || py >= S) continue;
    const i = (py * S + px) * 4;
    if (d[i] !== tr || d[i + 1] !== tg || d[i + 2] !== tb) continue;
    d[i] = nr; d[i + 1] = ng; d[i + 2] = nb; d[i + 3] = 255;
    st2.push([px + 1, py], [px - 1, py], [px, py + 1], [px, py - 1]);
  }
  cx.putImageData(img, 0, 0);
}
function clear() { cx.fillStyle = '#ffffff'; cx.fillRect(0, 0, S, S); }
function close() { open = false; el.style.display = 'none'; cb = null; down = false; }

function refresh() {
  el.querySelectorAll('#drawTools button').forEach(b => {
    const a = b.dataset.a;
    b.classList.toggle('on', a === tool);
    if (a === 'size') b.textContent = 'Kalınlık: ' + size;
  });
  el.querySelectorAll('#drawCols i').forEach(i => i.classList.toggle('on', i.dataset.c === color && tool !== 'erase'));
}

function build() {
  el = document.createElement('div');
  el.id = 'drawPanel';
  el.innerHTML = '<div id="drawBox"><canvas id="drawCv" width="64" height="64"></canvas><div id="drawCols"></div><div id="drawTools">' +
    '<button data-a="brush">🖌 Fırça</button><button data-a="erase">🧽 Silgi</button><button data-a="fill">🪣 Doldur</button>' +
    '<button data-a="size">Kalınlık: 2</button><button data-a="clear">Temizle</button>' +
    '<button data-a="save" style="background:#2e7d32">✔ Kaydet ve çık</button>' +
    '<button data-a="cancel" style="background:#b3261e">✖ İptal</button></div></div>';
  document.body.appendChild(el);
  cv = el.querySelector('#drawCv');
  cx = cv.getContext('2d');
  cx.imageSmoothingEnabled = false;
  const cols = el.querySelector('#drawCols');
  COLORS.forEach(c => { const i = document.createElement('i'); i.style.background = c; i.dataset.c = c; cols.appendChild(i); });
  cols.addEventListener('click', e => {
    const i = e.target.closest('i');
    if (!i) return;
    color = i.dataset.c;
    if (tool === 'erase') tool = 'brush';
    refresh();
  });
  el.querySelector('#drawTools').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    const a = b.dataset.a;
    if (a === 'brush' || a === 'erase' || a === 'fill') tool = a;
    else if (a === 'size') size = size === 1 ? 2 : size === 2 ? 4 : 1;
    else if (a === 'clear') clear();
    else if (a === 'save') { const data = cv.toDataURL('image/png'); const f = cb; close(); if (f) f(data); return; }
    else if (a === 'cancel') { close(); return; }
    refresh();
  });
  cv.addEventListener('pointerdown', e => {
    e.preventDefault();
    cv.setPointerCapture(e.pointerId);
    const p = pt(e);
    if (tool === 'fill') { fill(p[0], p[1]); return; }
    down = true; last = p; plot(p[0], p[1]);
  });
  cv.addEventListener('pointermove', e => {
    if (!down) return;
    e.preventDefault();
    const p = pt(e);
    line(last, p);
    last = p;
  });
  const up = () => { down = false; };
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', up);
}

// initial: kayıtlı çizim (data URL) ya da null. onSave(dataURL) kaydedilince çağrılır.
export function openDraw(initial, onSave) {
  if (!el) build();
  cb = onSave; tool = 'brush'; down = false;
  clear();
  open = true;
  if (initial) {
    const im = new Image();
    im.onload = () => { if (open) cx.drawImage(im, 0, 0, S, S); };
    im.src = initial;
  }
  el.style.display = 'flex';
  refresh();
}
