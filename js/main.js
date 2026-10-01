// 海星式お品書きメーカー: 起動（保存データの読み込み → 画面を作る）
// （読み込み順: data.js → core.js → state.js → render.js → layout.js → editor.js → items.js → themes.js → css-editor.js → io.js → help.js → templates.js → main.js）

/* ---------- 起動 ---------- */
(async () => {
  // テンプレートの縮小プレビュー: そのテンプレートを読んで用紙だけ描く（保存データ・マイテーマには触らない）
  if (TPL_PREVIEW) {
    document.body.classList.add('tpl-preview');
    try {
      const t = await (await fetch(tplUrl(TPL_PREVIEW))).json();
      state = withDefaults({ ...defaultState(), ...t, items: (t.items || []).map(x => newItem(x)) });
    } catch (e) { console.warn(e); }
    await registerFileFonts();
    fillStatic(); render();
    return;
  }
  try {
    const saved = await DB.get('state');
    if (saved) state = withDefaults({ ...defaultState(), ...saved, items: saved.items.map(x => newItem(x)) });
    myThemes = (await DB.get('myThemes')) || [];
  } catch (e) { console.warn(e); }
  renderMyThemes();
  await registerFileFonts();
  fillStatic(); buildItems(); render();
  $('#status').textContent = '自動保存ON';
  // 初めて開いたときだけ、使い方を自動で表示
  let seen = false;
  try { seen = localStorage.getItem('oshinagaki-guide-seen') === '1'; } catch {}
  if (!seen) openHelp('guide');
  loadTemplateList();
})();
