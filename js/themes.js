// 海星式お品書きメーカー: ベーステーマの切り替えとマイテーマ
// （読み込み順: data.js → core.js → state.js → render.js → layout.js → editor.js → items.js → themes.js → css-editor.js → io.js → help.js → templates.js → main.js）

let myThemes = [];   // マイテーマの一覧（IndexedDB の myThemes に保存）

// 今の見た目がテーマの初期状態から変わっていれば「作業中：テーマ名」としてマイテーマに自動保存（テーマごとに1つ）
async function autoSaveWork() {
  const key = state.theme;
  if (lookOf(state) === lookOf(themeLook(key))) return;
  const entry = { id: uid(), name: `作業中：${THEMES[key]?.name || key}`, auto: true, savedAt: Date.now(), ...snapshotDesign() };
  const i = myThemes.findIndex(t => t.auto && t.design.theme === key);
  if (i >= 0) myThemes[i] = entry; else myThemes.push(entry);
  await saveMyThemes();
}
async function switchTheme(key) {
  await autoSaveWork();
  const saved = myThemes.find(t => t.auto && t.design.theme === key);
  if (saved && confirm(`「${THEMES[key].name}」には前回作業中のデザインが自動保存されています。復元しますか？\n\nOK：作業中のデザインを復元する\nキャンセル：テーマの初期状態で始める`)) {
    await applyMyTheme(saved);
    return;
  }
  Object.assign(state, { theme: key }, themeLook(key));
  buildFontOptions(); syncFields(); render(); save();
}

function snapshotDesign() {
  const design = {};
  for (const k of DESIGN_KEYS) design[k] = clone(state[k]);
  // 使っている読み込みフォント（フォント指定 or CSS内で名前が出てくるもの）を同梱
  const used = state.fileFonts.filter(f => Object.values(state.fonts).includes(f.family) || state.css.includes(f.family));
  return { design, fileFonts: clone(used), userFonts: [...state.userFonts] };
}
async function saveMyThemes() {
  renderMyThemes();
  try { await DB.set('myThemes', myThemes); }
  catch (e) { alert('テーマをブラウザに保存できませんでした（' + e.message + '）。「テーマをファイルに保存」で保存しておいてください。'); }
}
function renderMyThemes() {
  $('#myThemeList').innerHTML = myThemes.length ? myThemes.map((t, i) => `<li>
      <span class="nm" style="font-size:13px">${esc(t.name)}</span>
      <span class="kind">${t.auto ? '自動保存・' : ''}${esc(THEMES[t.design.theme]?.name || '')}</span>
      <button data-th-apply="${i}">適用</button><button data-th-over="${i}">上書き</button><button data-th-del="${i}">削除</button></li>`).join('')
    : '<li style="color:var(--ui-sub);font-size:12px">まだありません</li>';
}
async function applyMyTheme(t) {
  Object.assign(state, clone(t.design));
  withDefaults(state);
  for (const f of t.fileFonts || []) if (!state.fileFonts.some(x => x.family === f.family)) state.fileFonts.push(clone(f));
  for (const f of t.userFonts || []) if (!state.userFonts.includes(f)) state.userFonts.push(f);
  await registerFileFonts();
  buildFontOptions(); syncFields(); buildItems(); render(); save();
}
$('#btnSaveTheme').onclick = async () => {
  const name = $('#myThemeName').value.trim() || `テーマ ${myThemes.length + 1}`;
  const same = myThemes.findIndex(t => t.name === name);
  if (same >= 0 && !confirm(`「${name}」を上書きしますか？`)) return;
  const entry = { id: uid(), name, savedAt: Date.now(), ...snapshotDesign() };
  if (same >= 0) myThemes[same] = entry; else myThemes.push(entry);
  $('#myThemeName').value = '';
  await saveMyThemes();
};
$('#myThemeList').addEventListener('click', async e => {
  const b = e.target.closest('button'); if (!b) return;
  const d = b.dataset;
  if (d.thApply) {
    const t = myThemes[+d.thApply];
    await autoSaveWork();   // 置き換わる前のデザインは「作業中：テーマ名」に残す
    await applyMyTheme(t);
  }
  if (d.thOver) {
    const t = myThemes[+d.thOver];
    if (!confirm(`「${t.name}」を今のデザインで上書きしますか？`)) return;
    myThemes[+d.thOver] = { ...t, savedAt: Date.now(), ...snapshotDesign() };
    await saveMyThemes();
  }
  if (d.thDel) {
    if (!confirm(`「${myThemes[+d.thDel].name}」を削除しますか？`)) return;
    myThemes.splice(+d.thDel, 1); await saveMyThemes();
  }
});
$('#btnExportThemes').onclick = () => {
  if (!myThemes.length) { alert('保存したテーマがありません'); return; }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify({ kind: 'oshinagaki-themes', themes: myThemes })], { type: 'application/json' }));
  a.download = 'お品書きテーマ.json'; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};
$('#themeImport').onchange = async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  try {
    const data = JSON.parse(await f.text());
    const list = data.kind === 'oshinagaki-themes' ? data.themes : [];
    if (!list.length) throw new Error('テーマのファイルではないようです');
    for (const t of list) {
      const i = myThemes.findIndex(x => x.name === t.name);
      if (i >= 0) myThemes[i] = t; else myThemes.push(t);
    }
    await saveMyThemes();
    alert(`${list.length} 個のテーマを読み込みました`);
  } catch (err) { alert('読み込めませんでした: ' + err.message); }
};

// 「デザインを全部リセット」: 今のテーマの初期状態に戻す（戻す前のデザインは「作業中：テーマ名」に残す）
$('#btnResetTheme').onclick = async () => {
  const name = THEMES[state.theme]?.name || state.theme;
  if (!confirm(`デザインの設定をすべて、テーマ「${name}」の初期状態に戻しますか？\n\n戻るもの：色・フォント・サイズ・ヘッダー・付箋・背景パターン・枠・背景画像・影・CSSタブに書いたCSS\nそのまま：頒布物の中身・用紙の向き・列数・列の比率・余白の使い方\n\n今のデザインは「作業中：${name}」としてマイテーマに保存されるので、あとから戻せます。`)) return;
  await autoSaveWork();   // 戻す前の状態は「作業中：テーマ名」に残す
  Object.assign(state, themeLook(state.theme));
  buildFontOptions(); syncFields(); render(); save();
};
