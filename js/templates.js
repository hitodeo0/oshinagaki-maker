// 海星式お品書きメーカー: テンプレート（templates/list.json に書いた見本を並べて、デザイン・並べ方を当てはめる）
// （読み込み順: data.js → core.js → state.js → render.js → layout.js → editor.js → items.js → themes.js → css-editor.js → io.js → help.js → templates.js → main.js）

// templates/list.json: [{ "file": "xxx.json", "name": "表示名", "note": "ひとこと（なくてもよい）" }, ...]
// テンプレート本体は「ファイルに保存」で保存したファイルそのまま
const tplUrl = file => 'templates/' + (/^[\w.-]+\.json$/.test(file) ? file : '_');   // フォルダの外は読まない
let tplList = [];        // [{ file, name, note, data }]
let tplBackup = null;    // 適用する前の状態（「元に戻す」用。ページを開いている間だけ）
let tplToastTimer;

// 一覧を読む。list.json が無い・空のときはボタンを出さない
async function loadTemplateList() {
  try {
    const list = await (await fetch('templates/list.json', { cache: 'no-cache' })).json();
    tplList = (Array.isArray(list) ? list : []).filter(t => t && t.file).map(t => ({ ...t, data: null }));
  } catch { tplList = []; }
  $('#btnTpl').hidden = !tplList.length;
}
async function loadTemplate(t) {
  if (!t.data) {
    const d = await (await fetch(tplUrl(t.file), { cache: 'no-cache' })).json();
    t.data = withDefaults({ ...defaultState(), ...d, items: (d.items || []).map(x => newItem(x)) });
  }
  return t.data;
}

// 置き換えないもの（その人の中身）。ここに無い項目はテンプレートの値になる
const TPL_CONTENT = {
  item: ['title', 'badge1', 'badge2', 'r18', 'spec', 'cp', 'desc', 'note', 'price', 'unit', 'img', 'phOn', 'phRatio', 'phText', 'phBg', 'phFg', 'phLine'],
  grp: ['text', 'sub'], sec: ['text'], txt: ['text'],
};
// 並べ方: テンプレートのブロックに、自分のブロックを種類ごとに上から順に入れる
// 自分の分が足りないところはテンプレートのサンプルのまま / 余った自分の分は最後の区画の終わりに入れる
function mergeLayout(tplItems, mine) {
  const queues = {};
  for (const type of Object.keys(TPL_CONTENT)) queues[type] = mine.filter(x => x.type === type);
  const out = tplItems.map(t => {
    const m = queues[t.type]?.shift();
    const it = newItem({ ...clone(t), id: m ? m.id : uid() });
    if (m) for (const k of TPL_CONTENT[t.type]) it[k] = clone(m[k]);
    return it;
  });
  const rest = mine.filter(x => queues[x.type]?.includes(x));
  if (rest.length) {
    const g = out.map(x => x.type).lastIndexOf('grp');
    let at = out.length;
    if (g >= 0) { const e = out.findIndex((x, i) => i > g && x.type === 'end'); if (e >= 0) at = e; }
    out.splice(at, 0, ...rest.map(clone));
  }
  return out;
}

async function applyTemplate(t, withLayout) {
  const d = await loadTemplate(t);
  const what = withLayout ? 'デザインと並べ方' : 'デザイン';
  if (!confirm(`テンプレート「${t.name}」の${what}を当てはめますか？\n\n適用したあとに出る「元に戻す」で戻せます。今のデザインはマイテーマにも「作業中：テーマ名」で残ります。`)) return;
  tplBackup = clone(state);
  await autoSaveWork();
  // 用紙サイズ（paper）と向き（orient）は今のまま
  for (const k of DESIGN_KEYS) if (k !== 'orient') state[k] = clone(d[k]);
  for (const f of d.fileFonts || []) if (!state.fileFonts.some(x => x.family === f.family)) state.fileFonts.push(clone(f));
  for (const f of d.userFonts || []) if (!state.userFonts.includes(f)) state.userFonts.push(f);
  if (withLayout) state.items = mergeLayout(d.items, state.items);
  withDefaults(state);
  await registerFileFonts();
  buildFontOptions(); syncFields(); $('#itemList').innerHTML = ''; buildItems(); render(); save();
  closeTemplates();
  $('#tplToast').classList.add('on');
  clearTimeout(tplToastTimer);
  tplToastTimer = setTimeout(() => $('#tplToast').classList.remove('on'), 20000);
}
$('#tplUndo').onclick = async () => {
  if (!tplBackup) return;
  state = tplBackup; tplBackup = null;
  await registerFileFonts();
  buildFontOptions(); syncFields(); $('#itemList').innerHTML = ''; buildItems(); render(); save();
  $('#tplToast').classList.remove('on');
};
$('#tplToastClose').onclick = () => $('#tplToast').classList.remove('on');

// 一覧の画面。プレビューは、そのテンプレートを読んだこのページを iframe で小さく表示する（CSSがお互いに混ざらないように）
const TPL_FRAME_W = 600;   // iframe の中の幅(px)。これを枠の幅に縮めて表示する
async function openTemplates() {
  $('#tplModal').classList.add('on');
  const list = $('#tplList');
  list.innerHTML = '<p class="hint">読み込み中…</p>';
  const cards = await Promise.all(tplList.map(async (t, i) => {
    try {
      const d = await loadTemplate(t);
      const [, w, h] = PAPERS[d.paper] || PAPERS.A3, land = d.orient === 'landscape';
      const n = d.items.filter(x => x.type === 'item').length;
      return `<div class="tpl-card">
        <div class="tpl-thumb" style="aspect-ratio:${land ? h : w}/${land ? w : h}" data-ratio="${(land ? w / h : h / w).toFixed(4)}">
          <iframe src="?tpl-preview=${encodeURIComponent(t.file)}" loading="lazy" tabindex="-1" title="${esc(t.name)} のプレビュー"></iframe></div>
        <h3>${esc(t.name)}</h3>
        <div class="tpl-meta">${esc(d.paper)}${land ? '横' : '縦'}向け・頒布物${n}つ</div>
        ${t.note ? `<div class="tpl-note">${esc(t.note)}</div>` : ''}
        <div class="row"><button data-tpl-apply="${i}">デザインだけ</button><button data-tpl-apply="${i}" data-layout="1">デザインと並べ方</button></div>
      </div>`;
    } catch { return `<div class="tpl-card"><h3>${esc(t.name || t.file)}</h3><div class="tpl-meta">読み込めませんでした</div></div>`; }
  }));
  list.innerHTML = cards.join('');
  for (const th of $$('.tpl-thumb', list)) {
    const fr = $('iframe', th), ratio = +th.dataset.ratio;
    fr.style.width = TPL_FRAME_W + 'px'; fr.style.height = TPL_FRAME_W * ratio + 'px';
    new ResizeObserver(() => fr.style.transform = `scale(${th.clientWidth / TPL_FRAME_W})`).observe(th);
  }
}
function closeTemplates() {
  $('#tplModal').classList.remove('on');
  $('#tplList').innerHTML = '';   // iframe を片付ける
}
$('#btnTpl').onclick = openTemplates;
$('#tplClose').onclick = closeTemplates;
$('#tplModal').addEventListener('click', e => {
  if (e.target.id === 'tplModal') closeTemplates();   // 外側の暗いところをクリックで閉じる
  const b = e.target.closest('[data-tpl-apply]');
  if (b) applyTemplate(tplList[+b.dataset.tplApply], !!b.dataset.layout);
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('#tplModal').classList.contains('on')) closeTemplates(); });
