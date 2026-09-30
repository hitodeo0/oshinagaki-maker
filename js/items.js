// 海星式お品書きメーカー: 頒布物タブ（カードの編集欄・追加・並べ替え・画像）
// （読み込み順: data.js → core.js → state.js → render.js → layout.js → editor.js → items.js → themes.js → css-editor.js → io.js → help.js → main.js）

/* ---------- エディター: 頒布物 ---------- */
const TYPE_LABEL = { item: '', sec: '見出し', txt: 'テキスト', hr: '区切り線', grp: '区画', end: '区画おわり' };
const cardTitle = it =>
  it.type === 'hr' ? '―― 区切り線 ――' :
  it.type === 'end' ? '―― 区画ここまで ――' :
  (it.type === 'item' ? it.title : it.text).split('\n')[0] || (it.type === 'grp' ? '(見出しなし)' : '(無題)');
// バッジ1・バッジ2の設定欄（n: 1 or 2）
function badgeUI(it, n) {
  const k = n === 1
    ? { text:'badge1', mode:'badgeMode', pos:'stampPos', shape:'stampShape', ring:'stampRing', jag:'stampJag', defPos:'tl', ph:'新刊 / 既刊 / NEW', list:' list="badgeList"' }
    : { text:'badge2', mode:'badge2Mode', pos:'stamp2Pos', shape:'stamp2Shape', ring:'stamp2Ring', jag:'stamp2Jag', defPos:'br', ph:'残りわずか など', list:'' };
  return `<div class="row">
        <label class="f">バッジ${n}<input type="text" data-ik="${k.text}" value="${esc(it[k.text])}"${k.list} placeholder="${k.ph}"></label>
        <label class="f" data-dep="${k.text}">出し方<select data-ik="${k.mode}">${opts([['text','タイトルの上'],['stamp','スタンプ（画像に重ねる）']], it[k.mode] || 'text')}</select></label>
      </div>
      ${it[k.mode] === 'stamp' ? `<div class="stamp-opts" data-dep="${k.text}">
        <div class="row">
          <label class="f">スタンプの位置<select data-ik="${k.pos}">${opts([['tl','左上'],['tr','右上'],['bl','左下'],['br','右下']], it[k.pos] || k.defPos)}</select></label>
          <label class="f">スタンプの形<select data-ik="${k.shape}">${opts([['none','文字だけ'],['rect','長方形'],['round','角丸'],['circle','正円']], it[k.shape] || 'circle')}</select></label>
        </div>
        <div class="row">
          <label class="f" data-dep="${k.shape}!=none">内側の線<select data-ik="${k.ring}">${opts([['none','なし'],['single','1本'],['double','2本'],['dotted','点線']], it[k.ring] || 'single')}</select></label>
          <label class="chk" data-dep="${k.shape}!=none"><input type="checkbox" data-ik="${k.jag}"${it[k.jag] ? ' checked' : ''}>ギザギザ</label>
        </div>
      </div>` : ''}`;
}
// 頒布物カードの中の区切り（見出しつきの枠）
// クリックで畳める。閉じた区切りは cardSecClosed に「カードのid:見出し」で覚えておき、カードを作り直しても閉じたままにする
const cardSecClosed = new Set();
const cardSec = (title, body, id) => `<details class="card-sec" data-cs="${id}:${title}"${cardSecClosed.has(id + ':' + title) ? '' : ' open'}><summary class="card-sec-h">${title}</summary>${body}</details>`;
const BLANK_HINT = '<p class="hint" style="margin:6px 0 8px">空欄にした項目は、お品書きに表示されません。</p>';
// ctxCols: このブロックが置かれている場所の列数（区画の中なら区画の列数）
function itemCard(it, n, open, ctxCols = state.cols, inGrp = false) {
  const sec = (title, body) => cardSec(title, body, it.id);
  const spanOpts = Array.from({ length: ctxCols }, (_, i) => `<option value="${i + 1}"${+it.span === i + 1 ? ' selected' : ''}>${i + 1}列分</option>`).join('')
    + `<option value="99"${+it.span >= 99 ? ' selected' : ''}>全幅</option>`;
  const head = `<details class="card${it.type === 'grp' || it.type === 'end' ? ' grp-card' : ''}${inGrp ? ' in-grp' : ''}" data-id="${it.id}"${open ? ' open' : ''}>
    <summary><span>#${n}</span>${TYPE_LABEL[it.type] ? `<span class="kind" style="font-size:10px;font-weight:400;color:var(--ui-sub)">${TYPE_LABEL[it.type]}</span>` : ''}<span class="t">${esc(cardTitle(it))}</span>
      <button data-act="up" title="上へ">↑</button><button data-act="down" title="下へ">↓</button><button data-act="dup">複製</button><button data-act="del">削除</button></summary>
    <div class="card-body">`;
  const common = `<div class="row">
        <label class="f">横幅<select data-ik="span" data-num>${spanOpts}</select></label>
        <label class="f">クラス名（CSS用）<input type="text" data-ik="cls" value="${esc(it.cls)}" placeholder="big など"></label>
      </div>`;
  if (it.type === 'end') return head + `<p class="hint" style="margin:0">ここより下のブロックは、区画に入らず用紙に直接並びます。</p></div></details>`;
  if (it.type === 'grp') return head + sec('見出し', BLANK_HINT + `
      <div class="row">
        <label class="f">見出し<input type="text" data-ik="text" value="${esc(it.text)}" list="badgeList" placeholder="新刊 / 既刊 / NEW / OLD"></label>
        <label class="f">サブ文字<input type="text" data-ik="sub" value="${esc(it.sub)}" placeholder="残部少！ など"></label>
      </div>
      <div class="row">
        <label class="f">見出しの形<select data-ik="badgeShape">${opts([['none','文字だけ'],['rect','長方形'],['round','角丸'],['circle','正円']], grpShape(it).shape)}</select></label>
        <label class="f" data-dep="badgeShape!=none">内側の線<select data-ik="badgeRing">${opts([['none','なし'],['single','1本'],['double','2本'],['dotted','点線']], grpShape(it).ring)}</select></label>
        <label class="chk" style="flex:.7" data-dep="badgeShape!=none"><input type="checkbox" data-ik="badgeJag"${grpShape(it).jag ? ' checked' : ''}>ギザギザ</label>
      </div>
      <label class="f">見出しの位置<select data-ik="badgePos">${opts([['top','区画の上'],['overlay','区画の左上に重ねる'],['overlay-r','区画の右上に重ねる'],['img-tl','最初の画像の左上'],['img-tr','最初の画像の右上'],['img-bl','最初の画像の左下'],['img-br','最初の画像の右下'],['side','区画の左に縦書き（線つき）'],['side-r','区画の右に縦書き（線つき）']], it.badgePos)}</select></label>
      <label class="chk" style="margin:0 0 6px"><input type="checkbox" data-ik="badgeAuto"${it.badgeAuto ? ' checked' : ''}>見出しの色をテーマの色に合わせる</label>
      <div class="row" data-dep="!badgeAuto">
        <label class="f">見出しの色<input type="color" data-ik="badgeBg" value="${esc(it.badgeBg)}" class="color-full"></label>
        <label class="f">見出しの文字色<input type="color" data-ik="badgeFg" value="${esc(it.badgeFg)}" class="color-full"></label>
      </div>`) + sec('区画の中', `
      <div class="row">
        <label class="f">区画の線<select data-ik="line">${opts([['none','なし'],['top','上に線'],['left','左に線'],['box','四角で囲む']], it.line)}</select></label>
        <label class="f">区画の中の列数<select data-ik="gcols" data-num>${opts([1, 2, 3, 4].map(c => [c, c + '列']), +it.gcols)}</select></label>
      </div>
      <label class="f" data-dep="gcols>1">区画の中の列の幅の比率（空欄なら均等）<input type="text" data-ik="gratio" value="${esc(it.gratio)}" placeholder="例: 60 40"></label>
      <p class="hint" style="margin:0 0 8px">次の「区画」か「区画おわり」までのブロックが、この区画に入ります。</p>`) + sec('配置・CSS', common) + `
    </div></details>`;
  if (it.type !== 'item') return head + (it.type === 'hr' ? '' :`<label class="f">${TYPE_LABEL[it.type]}<textarea data-ik="text">${esc(it.text)}</textarea></label>`) + common + '</div></details>';
  return head + sec('画像', `
      <div class="imgslot">
        <div class="thumb" style="${it.img ? `background-image:url(${urlFor(it.img)})` : ''}">${it.img ? '' : '画像なし'}</div>
        <div><label class="btn">画像を選択<input type="file" accept="image/*" data-act="img" hidden></label>
        ${it.img ? '<button data-act="clearimg">外す</button>' : ''}</div>
      </div>
      <label class="chk" style="margin:-4px 0 6px"><input type="checkbox" data-ik="phOn"${it.phOn ? ' checked' : ''}>仮の画像にする（表紙まだ など）</label>
      ${it.phOn ? `<div class="row">
        <label class="f">縦横比<select data-ik="phRatio">${opts(Object.entries(PH_RATIOS).map(([k, [l]]) => [k, l]), it.phRatio || 'a5')}</select></label>
        <label class="f" style="flex:.5">背景<input type="color" data-ik="phBg" value="${esc(it.phBg)}" class="color-full"></label>
        <label class="f" style="flex:.5">文字<input type="color" data-ik="phFg" value="${esc(it.phFg)}" class="color-full"></label>
      </div>
      <label class="f">仮の画像の文字<textarea data-ik="phText" rows="1" class="ta1">${esc(it.phText)}</textarea></label>
      <label class="chk" style="margin:-4px 0 8px"><input type="checkbox" data-ik="phLine"${it.phLine ? ' checked' : ''}>内側に点線の枠を表示する</label>` : ''}
      <div class="row" data-dep="img|phOn">
        <label class="f">画像の位置<select data-ik="imgPos">
          ${[['left','左'],['right','右'],['top','上']].map(([v, l]) => `<option value="${v}"${it.imgPos === v ? ' selected' : ''}>${l}</option>`).join('')}
        </select></label>
        <label class="f">画像の縦位置<select data-ik="imgAlign">
          ${[['start','上'],['center','中央'],['end','下']].map(([v, l]) => `<option value="${v}"${(it.imgAlign || 'start') === v ? ' selected' : ''}>${l}</option>`).join('')}
        </select></label>
      </div>
      <label class="f" data-dep="img|phOn">画像の幅 <span class="rangeval">${it.imgW}%</span><input type="range" min="15" max="100" step="1" data-ik="imgW" data-num value="${it.imgW}"></label>
      <label class="chk" style="margin:-2px 0 8px" data-dep="img&imgPos!=top|phOn&imgPos!=top"><input type="checkbox" data-ik="imgFill"${it.imgFill ? ' checked' : ''}>画像の縦幅を区画の縦幅に合わせる（横幅は自動。画像の位置が左・右のとき）</label>`) + sec('内容', BLANK_HINT + `
      <label class="f">タイトル<textarea data-ik="title" rows="1" class="ta1">${esc(it.title)}</textarea></label>
      <div class="row">
        <label class="f">詳細（判型・ページ数・サイズ）<textarea data-ik="spec" rows="1" class="ta1" placeholder="A5 / 34P">${esc(it.spec)}</textarea></label>
        <label class="chk" style="flex:.3"><input type="checkbox" data-ik="r18"${it.r18 ? ' checked' : ''}>R-18</label>
      </div>
      <label class="f">カップリング・ジャンル<textarea data-ik="cp" rows="1" class="ta1">${esc(it.cp)}</textarea></label>
      <label class="f">説明文<textarea data-ik="desc">${esc(it.desc)}</textarea></label>
      <label class="f">注意書き（小さい文字）<textarea data-ik="note" rows="1" class="ta1">${esc(it.note)}</textarea></label>
      <div class="row">
        <label class="f">価格<input type="text" data-ik="price" value="${esc(it.price)}" placeholder="500 / 無料配布"></label>
        <label class="f" style="flex:.5">単位<input type="text" data-ik="unit" value="${esc(it.unit)}"></label>
      </div>`) + sec('バッジ・スタンプ', badgeUI(it, 1) + '<div class="card-div"></div>' + badgeUI(it, 2) + `
      <p class="hint" style="margin:0 0 8px">バッジ1は「新刊」など、頒布物の種類を表すバッジです（CSSの <code>.item[data-badge="新刊"]</code> はバッジ1で見分けます）。スタンプの大きさと傾きは、デザインタブの「サイズ」で変えられます。画像がないときはタイトルの上に出ます。</p>`) + sec('配置・CSS', `
      ${common}
      <label class="f" data-dep="img|phOn">タイトルの位置<select data-ik="titlePos">${opts([['info','画像の横（詳細と同じ欄）'],['top','ブロックの一番上（画像の上にまたがる）']], it.titlePos || 'info')}</select></label>
      <label class="f">値段の位置<select data-ik="pricePos">${opts([['bottom','文字の下（右下）'],['side','説明文の横（右）'],['over','説明文に重ねる（右下）']], it.pricePos || 'bottom')}</select></label>`) + `
    </div>
  </details>`;
}
function buildItems() {
  const open = new Set($$('#itemList .card[open]').map(d => d.dataset.id));
  const first = !$('#itemList').children.length;
  let grp = null;
  $('#itemList').innerHTML = state.items.map((it, n) => {
    if (it.type === 'grp') grp = it;
    if (it.type === 'end') grp = null;
    const inGrp = grp && it.type !== 'grp';
    return itemCard(it, n + 1, first ? n === 0 : open.has(it.id), inGrp ? +grp.gcols || 1 : state.cols, inGrp);
  }).join('')
    + `<datalist id="badgeList"><option>新刊</option><option>既刊</option><option>NEW</option><option>OLD</option><option>再販</option></datalist>`;
  $$('#itemList .card').forEach(card => { const it = state.items.find(x => x.id === card.dataset.id); if (it) itemDeps(card, it); });
}
// 頒布物カードの「今は反映されない設定」を薄くする（区画の見出しの形は昔のデータの読み替えも含めて判定）
function itemDeps(card, it) {
  applyDeps(card, k => it.type === 'grp' && k === 'badgeShape' ? grpShape(it).shape : it[k]);
}
const findItem = el => { const card = el.closest('.card'); return card && [card, state.items.findIndex(x => x.id === card.dataset.id)]; };

$('#itemList').addEventListener('input', e => {
  const el = e.target; const k = el.dataset.ik; if (!k) return;
  const [card, idx] = findItem(el); const it = state.items[idx];
  it[k] = el.type === 'checkbox' ? el.checked : el.hasAttribute('data-num') ? +el.value : el.value;
  if (k === 'title' || k === 'text') $('.t', card).textContent = cardTitle(it);
  if (k === 'gcols') { render(); save(); buildItems(); return; }  // 区画内の横幅の選択肢を作り直す
  if (k === 'phOn' || k === 'badgeMode' || k === 'badge2Mode') { render(); save(); buildItems(); return; }   // 設定欄の出し入れ・有効/無効を切り替える
  if (k === 'imgW') el.previousElementSibling.textContent = el.value + '%';
  itemDeps(card, it);
  render(); save();
});
$('#itemList').addEventListener('click', e => {
  // カードの中の区切りの開閉を覚える（開閉はクリックの後に切り替わるので、少し待ってから読む）
  const cs = e.target.closest('.card-sec-h');
  if (cs) { const d = cs.parentElement; setTimeout(() => cardSecClosed[d.open ? 'delete' : 'add'](d.dataset.cs)); return; }
  const b = e.target.closest('button[data-act]'); if (!b) return;
  e.preventDefault();
  const [, idx] = findItem(b); const items = state.items;
  switch (b.dataset.act) {
    case 'up': if (idx > 0) [items[idx - 1], items[idx]] = [items[idx], items[idx - 1]]; break;
    case 'down': if (idx < items.length - 1) [items[idx + 1], items[idx]] = [items[idx], items[idx + 1]]; break;
    case 'dup': items.splice(idx + 1, 0, { ...items[idx], id: uid() }); break;
    case 'del': if (!confirm(`「${cardTitle(items[idx])}」を削除しますか？`)) return; items.splice(idx, 1); break;
    case 'clearimg': items[idx].img = ''; break;
  }
  buildItems(); render(); save();
});
async function setImage(idx, file) {
  if (!file || !file.type.startsWith('image/')) return;
  state.items[idx].img = await readFile(file);
  buildItems(); render(); save();
}
$('#itemList').addEventListener('change', e => {
  if (e.target.dataset.act !== 'img') return;
  const [, idx] = findItem(e.target); setImage(idx, e.target.files[0]);
});
$('#itemList').addEventListener('dragover', e => { const s = e.target.closest('.imgslot'); if (s) { e.preventDefault(); s.classList.add('drag'); } });
$('#itemList').addEventListener('dragleave', e => e.target.closest('.imgslot')?.classList.remove('drag'));
$('#itemList').addEventListener('drop', e => {
  const s = e.target.closest('.imgslot'); if (!s) return;
  e.preventDefault(); s.classList.remove('drag');
  const [, idx] = findItem(s); setImage(idx, e.dataTransfer.files[0]);
});
const ADD_PRESET = {
  item: { title: '新しい頒布物' },
  sec:  { type: 'sec', text: '既刊', span: 99 },
  txt:  { type: 'txt', text: '残部少！', span: 1 },
  hr:   { type: 'hr', span: 99 },
  grp:  { type: 'grp', text: '新刊', span: 99, gcols: 2, badgeAuto: true },
  end:  { type: 'end' },
};
$$('[data-add]').forEach(b => b.onclick = () => {
  const it = newItem(ADD_PRESET[b.dataset.add]);
  state.items.push(it); buildItems();
  const card = $(`.card[data-id="${it.id}"]`); card.open = true; card.scrollIntoView({ behavior: 'smooth' });
  render(); save();
});

// サークルロゴ・イベントロゴ（key: info.logo / info.eventLogo）
async function setLogo(file, key) {
  if (!file || !file.type.startsWith('image/')) return;
  state.info[key] = await readFile(file); render(); save();
}
for (const [pre, key] of [['logo', 'logo'], ['eventLogo', 'eventLogo']]) {
  $(`#${pre}File`).onchange = e => { setLogo(e.target.files[0], key); e.target.value = ''; };
  $(`#${pre}Clear`).onclick = () => { state.info[key] = ''; render(); save(); };
  const slot = $(`#${pre}Slot`);
  slot.addEventListener('dragover', e => { e.preventDefault(); slot.classList.add('drag'); });
  slot.addEventListener('dragleave', () => slot.classList.remove('drag'));
  slot.addEventListener('drop', e => { e.preventDefault(); slot.classList.remove('drag'); setLogo(e.dataTransfer.files[0], key); });
}

// プレビュークリック → 該当カードへ
$('#sheet').addEventListener('click', e => {
  const item = e.target.closest('[data-id]'); if (!item) return;
  showTab('items');
  const card = $(`.card[data-id="${item.dataset.id}"]`);
  card.open = true; card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  card.classList.add('flash'); setTimeout(() => card.classList.remove('flash'), 900);
});
