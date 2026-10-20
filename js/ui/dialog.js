const st = document.createElement('style');
st.textContent = `
#dlg{position:fixed;inset:0;background:#000c;z-index:60;display:none;align-items:center;justify-content:center}
#dlgBox{background:#1d2330;color:#fff;border-radius:14px;padding:16px;width:min(92vw,360px)}
#dlgBox h3{margin:0 0 6px}
#dlgBox p{margin:0 0 10px;font-size:14px;opacity:.85}
#dlgBox input{width:100%;padding:12px;border-radius:8px;border:0;margin-bottom:10px;font-size:16px;box-sizing:border-box;-webkit-user-select:text;user-select:text}
#dlgBtns{display:flex;flex-direction:column;gap:8px}
#dlgBtns button{padding:12px;border:0;border-radius:8px;font-weight:700;font-size:15px;color:#fff;background:#444}
#dlgBtns button.ok{background:#2e7d32}
#dlgBtns button.danger{background:#b3261e}
`;
document.head.appendChild(st);

let el = null;

// buttons: [[yazı, anahtar, sınıf('ok' | 'danger')]]. Dönüş: { key, value }
export function askDialog({ title, text = '', input = null, buttons }) {
  return new Promise(res => {
    if (!el) {
      el = document.createElement('div');
      el.id = 'dlg';
      el.innerHTML = '<div id="dlgBox"></div>';
      document.body.appendChild(el);
    }
    const box = el.firstChild;
    box.textContent = '';
    const h = document.createElement('h3'); h.textContent = title; box.appendChild(h);
    if (text) { const p = document.createElement('p'); p.textContent = text; box.appendChild(p); }
    let inp = null;
    if (input !== null) {
      inp = document.createElement('input');
      inp.value = input; inp.maxLength = 24;
      box.appendChild(inp);
    }
    const row = document.createElement('div');
    row.id = 'dlgBtns';
    for (const [label, key, cls] of buttons) {
      const b = document.createElement('button');
      b.textContent = label;
      if (cls) b.className = cls;
      b.onclick = () => { el.style.display = 'none'; res({ key, value: inp ? inp.value : null }); };
      row.appendChild(b);
    }
    box.appendChild(row);
    el.style.display = 'flex';
    if (inp) inp.focus();
  });
}

export const askChoice = async (title, text, buttons) => (await askDialog({ title, text, buttons })).key;
