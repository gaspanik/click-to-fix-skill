function injectClickToFix() {
  if (document.getElementById('__ctf-bar')) return;

  const style = document.createElement('style');
  style.textContent = `
    #__ctf-overlay{position:fixed;inset:0;z-index:999998;cursor:crosshair;}
    #__ctf-overlay.inactive{pointer-events:none;}
    #__ctf-popup{position:fixed;z-index:999999;background:#1e1e2e;border:1.5px solid #7c3aed;border-radius:10px;padding:12px 14px;width:380px;box-shadow:0 8px 32px rgba(0,0,0,.5);font-family:system-ui,sans-serif;display:none;}
    #__ctf-popup .label{font-size:11px;color:#a78bfa;margin-bottom:8px;display:flex;align-items:center;gap:6px;}
    #__ctf-popup .coords{font-size:10px;color:#6b7280;}
    #__ctf-popup textarea{width:100%;box-sizing:border-box;background:#12121f;color:#e2e8f0;border:1px solid #4b5563;border-radius:6px;padding:8px;font-size:13px;resize:none;height:80px;outline:none;font-family:inherit;}
    #__ctf-popup textarea:focus{border-color:#7c3aed;}
    #__ctf-scope-wrap{margin:8px 0 4px;}
    #__ctf-scope-lbl{font-size:10px;color:#6b7280;margin-bottom:4px;}
    #__ctf-scope{display:flex;border-radius:6px;overflow:hidden;border:1px solid #374151;}
    #__ctf-scope button{flex:1;padding:5px 2px;font-size:10px;background:#12121f;color:#9ca3af;border:none;border-right:1px solid #374151;cursor:pointer;font-family:inherit;line-height:1.3;transition:background .15s,color .15s;}
    #__ctf-scope button:last-child{border-right:none;}
    #__ctf-scope button.active{background:#7c3aed;color:white;}
    #__ctf-popup .actions{display:flex;gap:8px;margin-top:8px;justify-content:flex-end;}
    #__ctf-popup button{padding:5px 14px;border-radius:6px;border:none;font-size:12px;cursor:pointer;font-family:inherit;}
    #__ctf-send{background:#7c3aed;color:white;}
    #__ctf-cancel{background:#374151;color:#d1d5db;}
    #__ctf-status{font-size:11px;color:#6b7280;margin-top:6px;min-height:16px;}
    #__ctf-bar{position:fixed;bottom:20px;right:20px;z-index:999999;display:flex;gap:8px;align-items:center;font-family:system-ui,sans-serif;}
    #__ctf-toggle{background:#7c3aed;color:white;border:none;border-radius:50px;padding:8px 16px;font-size:13px;cursor:pointer;box-shadow:0 4px 12px rgba(124,58,237,.4);}
    #__ctf-exit{background:#1e1e2e;color:#9ca3af;border:1px solid #374151;border-radius:50px;padding:8px 14px;font-size:13px;cursor:pointer;}
    #__ctf-exit:hover{color:#f87171;border-color:#f87171;}
  `;
  document.head.appendChild(style);

  function getBreakpoint(w) {
    if (w >= 1536) return '2xl';
    if (w >= 1280) return 'xl';
    if (w >= 1024) return 'lg';
    if (w >= 768)  return 'md';
    if (w >= 640)  return 'sm';
    return 'base';
  }

  const overlay = document.createElement('div');
  overlay.id = '__ctf-overlay';
  overlay.classList.add('inactive');

  const popup = document.createElement('div');
  popup.id = '__ctf-popup';

  const label = document.createElement('div');
  label.className = 'label';
  label.textContent = '✦ Claude への修正指示';
  const coords = document.createElement('span');
  coords.id = '__ctf-coords';
  coords.className = 'coords';
  label.appendChild(coords);

  const textarea = document.createElement('textarea');
  textarea.id = '__ctf-input';
  textarea.placeholder = 'ここに修正内容を入力…（例：このボタンの色を青にして）';

  // Scope selector
  const scopeWrap = document.createElement('div');
  scopeWrap.id = '__ctf-scope-wrap';
  const scopeLbl = document.createElement('div');
  scopeLbl.id = '__ctf-scope-lbl';
  scopeLbl.textContent = '適用範囲';
  const scopeBar = document.createElement('div');
  scopeBar.id = '__ctf-scope';

  let currentScope = 'all';
  const scopeOptions = [
    { value: 'all',   label: '全サイズ共通' },
    { value: 'below', label: 'このサイズ以下' },
    { value: 'exact', label: 'このサイズのみ' },
  ];
  scopeOptions.forEach(opt => {
    const btn = document.createElement('button');
    btn.dataset.scope = opt.value;
    btn.textContent = opt.label;
    if (opt.value === currentScope) btn.classList.add('active');
    btn.addEventListener('click', () => {
      currentScope = opt.value;
      scopeBar.querySelectorAll('button').forEach(b =>
        b.classList.toggle('active', b.dataset.scope === currentScope)
      );
    });
    scopeBar.appendChild(btn);
  });

  scopeWrap.appendChild(scopeLbl);
  scopeWrap.appendChild(scopeBar);

  const actions = document.createElement('div');
  actions.className = 'actions';
  const cancelBtn = document.createElement('button');
  cancelBtn.id = '__ctf-cancel';
  cancelBtn.textContent = 'キャンセル';
  const sendBtn = document.createElement('button');
  sendBtn.id = '__ctf-send';
  sendBtn.textContent = '送信';
  actions.appendChild(cancelBtn);
  actions.appendChild(sendBtn);

  const statusEl = document.createElement('div');
  statusEl.id = '__ctf-status';

  popup.appendChild(label);
  popup.appendChild(textarea);
  popup.appendChild(scopeWrap);
  popup.appendChild(actions);
  popup.appendChild(statusEl);

  const bar = document.createElement('div');
  bar.id = '__ctf-bar';
  const toggle = document.createElement('button');
  toggle.id = '__ctf-toggle';
  toggle.textContent = '✦ 修正モード ON';
  const exitBtn = document.createElement('button');
  exitBtn.id = '__ctf-exit';
  exitBtn.textContent = '✕ 終了';
  bar.appendChild(toggle);
  bar.appendChild(exitBtn);

  document.body.appendChild(overlay);
  document.body.appendChild(popup);
  document.body.appendChild(bar);

  function removeOverlay() {
    [overlay, popup, bar, style].forEach(el => el.remove());
  }

  let active = false, clickX, clickY, clickEl;

  toggle.addEventListener('click', () => {
    active = !active;
    overlay.classList.toggle('inactive', !active);
    toggle.textContent = active ? '✦ 修正モード OFF' : '✦ 修正モード ON';
    toggle.style.background = active ? '#dc2626' : '#7c3aed';
    if (!active) popup.style.display = 'none';
  });

  exitBtn.addEventListener('click', removeOverlay);

  overlay.addEventListener('click', (e) => {
    clickX = e.clientX; clickY = e.clientY;
    overlay.classList.add('inactive');
    clickEl = document.elementFromPoint(clickX, clickY);
    overlay.classList.remove('inactive');

    // Smart default: desktop (lg+) → 全サイズ共通, narrower → このサイズ以下
    const vw = window.innerWidth;
    currentScope = vw >= 1024 ? 'all' : 'below';
    scopeBar.querySelectorAll('button').forEach(b =>
      b.classList.toggle('active', b.dataset.scope === currentScope)
    );

    const popupW = 380, popupH = 240;
    let left = clickX + 12;
    if (left + popupW > window.innerWidth) left = clickX - popupW - 12;
    if (left < 8) left = 8;
    let top = clickY + 12;
    if (top + popupH > window.innerHeight) top = clickY - popupH - 12;
    if (top < 8) top = 8;
    popup.style.left = left + 'px';
    popup.style.top = top + 'px';
    popup.style.display = 'block';
    document.getElementById('__ctf-coords').textContent = ` (${clickX}, ${clickY}) ${vw}px`;
    document.getElementById('__ctf-input').value = '';
    document.getElementById('__ctf-status').textContent = '';
    setTimeout(() => document.getElementById('__ctf-input').focus(), 50);
  });

  sendBtn.addEventListener('click', () => {
    const text = document.getElementById('__ctf-input').value.trim();
    if (!text) return;
    const elDesc = clickEl
      ? (clickEl.tagName
        + (clickEl.className ? '.' + [...clickEl.classList].join('.') : '')
        + (clickEl.id ? '#' + clickEl.id : ''))
      : '';
    const vw = window.innerWidth;
    const payload = {
      instruction: text,
      x: clickX, y: clickY,
      element: elDesc,
      windowWidth: vw,
      breakpoint: getBreakpoint(vw),
      scope: currentScope,
      timestamp: new Date().toISOString()
    };

    statusEl.textContent = '送信中…';
    statusEl.style.color = '#6b7280';

    fetch('http://127.0.0.1:47753/instruction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(r => {
      if (r.ok) {
        statusEl.textContent = '✓ 送信しました。Claudeに「送信した」と伝えてください。';
        statusEl.style.color = '#a78bfa';
        overlay.classList.add('inactive');
        active = false;
        toggle.textContent = '✦ 修正モード ON';
        toggle.style.background = '#7c3aed';
      } else {
        statusEl.textContent = 'エラーが発生しました';
        statusEl.style.color = '#f87171';
      }
    }).catch(() => {
      statusEl.textContent = '✗ サーバーに接続できません。スキルの手順を確認してください。';
      statusEl.style.color = '#f87171';
    });
  });

  cancelBtn.addEventListener('click', () => {
    popup.style.display = 'none';
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectClickToFix);
} else {
  injectClickToFix();
}
