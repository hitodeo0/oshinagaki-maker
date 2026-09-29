// 海星式お品書きメーカー: 編集欄の共通部分（基本情報・デザインタブ・フォント・タブ切り替え）
// （読み込み順: data.js → core.js → state.js → render.js → layout.js → editor.js → items.js → themes.js → css-editor.js → io.js → help.js → main.js）

/* ---------- エディター: 共通フィールド ---------- */
function fillStatic() {
  $('#themeSel').innerHTML = Object.entries(THEMES).map(([k, t]) => `<option value="${k}">${t.name}（${t.desc}）</option>`).join('');
  $('#lineMarkSel').innerHTML = Object.entries(LINE_MARKS).map(([k, [name]]) => `<option value="${k}">${name}</option>`).join('');
  $('#patternSel').innerHTML = Object.entries(PATTERNS).map(([k, [name]]) => `<option value="${k}">${name}</option>`).join('');
  $('#palettes').innerHTML = PALETTES.map((p, i) => `<button class="pal" data-pal="${i}" title="${esc(p.name)}">
      <span class="dots">${['bg', 'paper', 'ink', 'accent', 'sub'].map(r => `<i style="background:${p.colors[r]}"></i>`).join('')}</span>${esc(p.name)}</button>`).join('');
  buildFontOptions();
  syncFields();
}
$('#palBtn').addEventListener('click', () => $('#palDD').classList.toggle('open'));
document.addEventListener('click', e => { if (!e.target.closest('#palDD')) $('#palDD').classList.remove('open'); });
$('#palettes').addEventListener('click', e => {
  const b = e.target.closest('[data-pal]'); if (!b) return;
  const p = PALETTES[+b.dataset.pal];
  applyPalette(p);
  $('#palDD').classList.remove('open');
  // 選んだ配色をボタンに表示
  $('#palBtnDots').innerHTML = b.querySelector('.dots').innerHTML;
  $('#palBtnName').textContent = p.name;
});

/* ---------- フォント管理 ---------- */
let pcFonts = [];                 // queryLocalFonts で取得した一覧（保存しない）
const registeredFonts = new Set(); // FontFace 登録済みの family

function buildFontOptions() {
  const uniq = a => [...new Set(a)];
  const file = state.fileFonts.map(f => f.family);
  let pc = uniq([...state.userFonts, ...pcFonts]);
  // 選択中なのに一覧に無いフォント（別PCで保存した等）も選べるように残す
  const extra = EXTRA_FONTS.flatMap(([, list]) => list.map(([f]) => f));
  const missing = Object.values(state.fonts).filter(f => f && ![...FONTS, ...extra, ...file, ...pc].includes(f));
  pc = uniq([...pc, ...missing]);
  const opt = (f, styled) => `<option value="${esc(f)}"${styled ? ` style="font-family:${esc(fontStack(f))}"` : ''}>${esc(f)}</option>`;
  // 追加のWebフォントは、選ぶまで読み込まないので一覧では見本の書体にしない
  const groups = [['Webフォント', FONTS, true], ...EXTRA_FONTS.map(([label, list]) => [`Webフォント：${label}`, list.map(([f]) => f), false]),
    ['読み込んだフォント', file, true], ['PCのフォント', pc, pc.length < 80]];
  const html = groups.filter(g => g[1].length).map(([label, fs, styled]) => `<optgroup label="${label}">${fs.map(f => opt(f, styled)).join('')}</optgroup>`).join('');
  // data-same がある欄（サークル名）は「見出しと同じ」を先頭に足す
  $$('.fontSel').forEach(sel => { sel.innerHTML = (sel.dataset.same ? `<option value="">${sel.dataset.same}</option>` : '') + html; sel.value = getPath(state, sel.dataset.k) || ''; });
  $('#fontList').innerHTML =
    state.fileFonts.map((f, i) => `<li><span class="nm" style="font-family:${esc(fontStack(f.family))}">${esc(f.family)}</span><span class="kind">ファイル</span><button data-del-file="${i}">削除</button></li>`).join('') +
    state.userFonts.map((f, i) => `<li><span class="nm" style="font-family:${esc(fontStack(f))}">${esc(f)}</span><span class="kind">PC</span><button data-del-user="${i}">削除</button></li>`).join('');
}

async function registerFileFonts() {
  for (const f of state.fileFonts) {
    if (registeredFonts.has(f.family)) continue;
    try {
      const face = new FontFace(f.family, dataUrlToBytes(f.data).buf.buffer, { weight: '100 900' });
      await face.load();
      document.fonts.add(face);
      registeredFonts.add(f.family);
    } catch (e) { console.warn(e); alert(`フォント「${f.family}」を読み込めませんでした: ${e.message}`); }
  }
}

$('#fontFile').onchange = async e => {
  const files = [...e.target.files]; e.target.value = '';
  for (const file of files) {
    let family = file.name.replace(/\.(ttf|otf|woff2?|ttc)$/i, '');
    const taken = new Set([...FONTS, ...EXTRA_FONTS.flatMap(([, list]) => list.map(([f]) => f)), ...state.fileFonts.map(f => f.family)]);
    for (let n = 2; taken.has(family); n++) family = family.replace(/ \(\d+\)$/, '') + ` (${n})`;
    state.fileFonts.push({ family, file: file.name, data: await readFile(file) });
  }
  await registerFileFonts();
  buildFontOptions(); render(); save();
};
$('#btnAddFontName').onclick = () => {
  const name = $('#fontName').value.trim(); if (!name) return;
  if (!state.userFonts.includes(name)) state.userFonts.push(name);
  $('#fontName').value = '';
  buildFontOptions(); save();
};
$('#fontName').addEventListener('keydown', e => { if (e.key === 'Enter') $('#btnAddFontName').click(); });
$('#btnLocalFonts').onclick = async () => {
  if (!('queryLocalFonts' in window)) { alert('このブラウザはPCのフォント一覧の取得に対応していません（Chrome / Edge で開いてください）。\nフォント名を直接入力して「追加」でも使えます。'); return; }
  try {
    const list = await window.queryLocalFonts();
    pcFonts = [...new Set(list.map(f => f.family))].sort((a, b) => a.localeCompare(b, 'ja'));
    buildFontOptions();
    alert(`${pcFonts.length} 個のフォントを取得しました。フォント選択の「PCのフォント」から選べます。`);
  } catch (e) { alert('フォント一覧を取得できませんでした: ' + e.message + '\n（許可のダイアログで「許可」を選んでください）'); }
};
$('#fontList').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.delFile) state.fileFonts.splice(+b.dataset.delFile, 1);
  if (b.dataset.delUser) state.userFonts.splice(+b.dataset.delUser, 1);
  buildFontOptions(); render(); save();
});
function syncFields() {
  $$('[data-k]').forEach(el => {
    const v = getPath(state, el.dataset.k);
    if (el.type === 'checkbox') el.checked = !!v; else el.value = v ?? '';
  });
  if (cssEditor && cssEditor.getValue() !== (state.css || '')) cssEditor.setValue(state.css || '');
}
document.addEventListener('input', e => {
  const el = e.target.closest('[data-k]');
  if (!el) return;
  const k = el.dataset.k;
  if (k === 'theme') { switchTheme(el.value); return; }   // テーマ切り替えは専用処理（作業中のデザインを自動保存してから切り替える）
  const ROLE_COLOR = { 'pattern.role': 'pattern.color', 'tab.bgRole': 'tab.bg', 'tab.fgRole': 'tab.fg', 'hlStyle.bgRole': 'hlStyle.bg', 'hlStyle.fgRole': 'hlStyle.fg' };
  if (ROLE_COLOR[k] && el.value === 'custom') { const prev = getPath(state, k); if (state.colors[prev]) { setPath(state, ROLE_COLOR[k], state.colors[prev]); setTimeout(syncFields); } }
  setPath(state, k, el.type === 'checkbox' ? el.checked : el.hasAttribute('data-num') ? +el.value : el.value);
  if (k === 'pattern.type') { const [, size, weight] = PATTERNS[el.value]; Object.assign(state.pattern, { size, weight }); syncFields(); }
  if (k === 'cols') buildItems();
  render(); save();
});
$('#ratioPresets').addEventListener('click', e => {
  const b = e.target.closest('[data-ratio]'); if (!b) return;
  const input = $('[data-k="colRatio"]');
  input.value = b.dataset.ratio;
  input.dispatchEvent(new Event('input', { bubbles: true }));
});

// 背景画像
async function setBg(file) {
  if (!file || !file.type.startsWith('image/')) return;
  state.bg.img = await readFile(file); render(); save();
}
$('#bgFile').onchange = e => { setBg(e.target.files[0]); e.target.value = ''; };
$('#bgClear').onclick = () => { state.bg.img = ''; render(); save(); };
const bgSlot = $('#bgSlot');
bgSlot.addEventListener('dragover', e => { e.preventDefault(); bgSlot.classList.add('drag'); });
bgSlot.addEventListener('dragleave', () => bgSlot.classList.remove('drag'));
bgSlot.addEventListener('drop', e => { e.preventDefault(); bgSlot.classList.remove('drag'); setBg(e.dataTransfer.files[0]); });

$$('.tabs button').forEach(b => b.onclick = () => showTab(b.dataset.tab));
// デザインタブの大項目の開閉は、このブラウザに覚えておく（読めなくても全部開いた状態で動く）
(() => {
  const KEY = 'oshinagaki-dsec-closed';
  let closed = [];
  try { closed = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch {}
  for (const d of $$('.dsec')) {
    if (closed.includes(d.dataset.sec)) d.open = false;
    d.addEventListener('toggle', () => {
      try { localStorage.setItem(KEY, JSON.stringify($$('.dsec').filter(x => !x.open).map(x => x.dataset.sec))); } catch {}
    });
  }
})();
// スクロール位置はタブごとに覚えておく（全タブで1つのスクロール欄を共有しているため、覚えないと前のタブの位置のまま開く）
const tabScroll = {};
function showTab(name) {
  const panes = $('.panes'), cur = $('.pane.on');
  if (cur) tabScroll[cur.dataset.pane] = panes.scrollTop;
  $$('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === name));
  $$('.pane').forEach(p => p.classList.toggle('on', p.dataset.pane === name));
  panes.scrollTop = tabScroll[name] || 0;
}

document.addEventListener('click', e => {
  const b = e.target.closest('[data-shadow-preset]'); if (!b) return;
  const key = b.closest('[data-shadow]').dataset.shadow;
  Object.assign(state[key], SHADOW_PRESETS[key][b.dataset.shadowPreset]);
  syncFields(); render(); save();
});
