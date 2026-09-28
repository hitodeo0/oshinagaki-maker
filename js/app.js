// 海星式お品書きメーカー: 画面の動き（data.js の後に読み込む）
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// 配色を入れ替える: 今の5色 → 新しい5色 の対応表を作り、同じ色を使っている設定・CSSもまとめて置き換える
function applyPalette(p) {
  const map = {};
  for (const r of ['bg', 'paper', 'ink', 'accent', 'sub']) {
    const o = (state.colors[r] || '').toLowerCase();
    if (o && !(o in map)) map[o] = p.colors[r];
  }
  const sw = v => (typeof v === 'string' && map[v.toLowerCase()]) || v;
  state.pattern.color = sw(state.pattern.color);
  for (const k of ['color', 'fillColor']) state.frame[k] = sw(state.frame[k]);
  // 暗い配色なのに枠の中の塗りが白のままだと、明るい文字が読めなくなるので背景色にそろえる
  const lum = hex => { const n = parseInt(hex.slice(1, 7), 16); return (0.299 * (n >> 16 & 255) + 0.587 * (n >> 8 & 255) + 0.114 * (n & 255)) / 255; };
  if (lum(p.colors.bg) < 0.4 && lum(state.frame.fillColor) > 0.85) state.frame.fillColor = p.colors.bg;
  for (const k of ['bg', 'fg', 'borderColor']) state.tab[k] = sw(state.tab[k]);
  for (const k of ['textShadow', 'imgShadow']) state[k].color = sw(state[k].color);
  for (const it of state.items) for (const k of ['badgeBg', 'badgeFg', 'phBg', 'phFg']) it[k] = sw(it[k]);
  state.css = state.css.replace(/#[0-9a-fA-F]{6}\b/g, m => map[m.toLowerCase()] || m);
  state.colors = { ...p.colors };
  syncFields(); buildItems(); render(); save();
}


const uid = () => Math.random().toString(36).slice(2, 10);
// type: item=頒布物 / sec=見出し / txt=テキスト / hr=区切り線 / grp=区画 / end=区画おわり
const newItem = (o = {}) => ({ id: uid(), type:'item', cls:'', text:'', title:'',
  sub:'', badgeStyle:'tag', badgePos:'top', badgeBg:'#1f2440', badgeFg:'#ffffff', badgeAuto:false, line:'none', gcols:1, gratio:'',  // 区画用（badgeAuto: 見出しの色をテーマに合わせる。昔のデータは false のまま）
  badge1:'', r18:false, badge2:'', spec:'', cp:'', desc:'', note:'', price:'', unit:'円', img:'', span:1, imgPos:'left', imgAlign:'start', imgW:45, imgFill:false, titlePos:'info',
  badgeMode:'text', stampPos:'tl', stampShape:'circle', stampRing:'single', stampJag:false,   // バッジをスタンプにするとき
  phOn:false, phRatio:'a5', phText:'表紙まだ', phBg:'#dddddd', phFg:'#555555', phLine:false,   // 仮の画像
  ...o });

function defaultState() {
  return {
    v: 1, theme: 'blank', orient: 'portrait', cols: 2, colRatio: '', vfill: 'start', scale: 1.25, hs: 0.9, gap: 1,   /* A3に貼って離れて読むので、文字は大きめが初期値 */
    headAlign: 'none', circleFit: false, circleSX: 100,
    imgGap: 6, stampTilt: -8, stampSize: 1,   // 画像と文字の間(mm)・重ねた見出し（スタンプ）の傾き(度)・大きさ(倍)
    colLine: { on:false, width:0.4, role:'ink', inner:true },   // 列の間の区切り線（太さmm・色はデザインの色の役割・区画の中にも引くか）
    // 影（ずれ・ぼかしは mm、濃さは 0〜1）。画像の影 mode: theme=テーマのまま / none=なし / custom=自分で決める
    textShadow: { on:false, x:0.3, y:0.3, blur:0.8, color:'#000000', alpha:0.35 },
    imgShadow: { mode:'theme', x:1.5, y:1.5, blur:3, color:'#000000', alpha:0.4 },
    colors: { ...THEMES.blank.colors }, fonts: { ...THEMES.blank.fonts },
    bg: { img:'', fit:'cover', layer:'front', opacity:1, tile:60 },
    pattern: { type:'none', color:'#c8c8c8', size:10, weight:0.3, opacity:1 },
    // 付箋ヘッダー（日付・イベント名・スペースを色つきの箱にして、用紙の端まで伸ばす）
    tab: { on:false, bg:'#1136e8', fg:'#fff200', border:0, borderColor:'#111111', topLine:false,shape:'straight', size:3, toTop:true, toLeft:false, pad:5 },
    frame: { type:'none', color:'#111111', width:1, radius:8, inset:10, fill:false, fillColor:'#ffffff', fillAlpha:1,shadow:0, pad:true, padding:10 },
    fileFonts: [],   // [{ family, file, data(dataURL) }]
    userFonts: [],   // PCにインストール済みのフォント名
    info: { event:'イベント名', date:'2026/10/01', circle:'サークル名', logo:'', space:'A01', headline:'', notes:'' },
    items: [
      newItem({ type:'grp', text:'新刊', span:99, gcols:1, badgeAuto:true }),
      newItem({ title:'サンプル新刊', badge1:'新刊', r18:true, spec:'A5 / 34P', cp:'○○ × △△', desc:'ここに本の説明を書きます。\n改行もそのまま反映されます。', note:'※年齢確認のため、身分証の提示をお願いします。', price:'500', span:2 }),
      newItem({ type:'grp', text:'既刊', span:99, gcols:2, line:'top', badgeAuto:true }),
      newItem({ title:'ステッカー', badge1:'既刊', spec:'45mm × 65mm / 2枚セット', price:'400', imgPos:'top', imgW:70 }),
      newItem({ title:'ポストカード', spec:'配布は無くなり次第終了', price:'無料配布', unit:'' }),
    ],
    css: DEFAULT_CSS,
  };
}
let state = defaultState();

/* ---------- utils ---------- */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
const getPath = (o, p) => p.split('.').reduce((a, k) => a?.[k], o);
const setPath = (o, p, v) => { const ks = p.split('.'); const last = ks.pop(); ks.reduce((a, k) => a[k], o)[last] = v; };
const fontStack = (...fs) => fs.map(f => `'${String(f).replace(/'/g, "\\'")}'`).join(',') + ',sans-serif';

// '#rrggbb' + 不透明度(0〜1) → 'rgba(r, g, b, a)'
function hexToRgba(hex, a = 1) {
  const h = String(hex).replace('#', '');
  const n = parseInt(h.length === 3 ? [...h].map(c => c + c).join('') : h.slice(0, 6), 16);
  return `rgba(${n >> 16 & 255}, ${n >> 8 & 255}, ${n & 255}, ${a})`;
}

function dataUrlToBytes(dataUrl) {
  const [head, b64] = dataUrl.split(',');
  const mime = head.match(/data:(.*?);/)?.[1] || 'application/octet-stream';
  const bin = atob(b64); const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return { mime, buf };
}

// dataURL → blob URL（再描画のたびに巨大な文字列をデコードしないため）
const imgCache = new Map();
function urlFor(dataUrl) {
  if (!dataUrl) return '';
  if (imgCache.has(dataUrl)) return imgCache.get(dataUrl);
  const { mime, buf } = dataUrlToBytes(dataUrl);
  const url = URL.createObjectURL(new Blob([buf], { type: mime }));
  imgCache.set(dataUrl, url);
  return url;
}
const readFile = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(f); });

// ギザギザ吹き出しの clip-path
(function makeBurst() {
  const n = 28, jitter = [0,3,1,4,2,0,3,1,2,4,0,2,3,1];
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = (i % 2 ? 40 : 50) - (i % 2 ? 0 : jitter[i % jitter.length]);
    pts.push(`${(50 + r * Math.cos(a)).toFixed(1)}% ${(50 + r * Math.sin(a)).toFixed(1)}%`);
  }
  document.documentElement.style.setProperty('--burst', `polygon(${pts.join(',')})`);
})();

/* ---------- 保存（IndexedDB） ---------- */
const DB = {
  open() { return this._p ??= new Promise((res, rej) => { const r = indexedDB.open('oshinagaki', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); },
  async get(k) { const db = await this.open(); return new Promise((res, rej) => { const q = db.transaction('kv').objectStore('kv').get(k); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }); },
  async set(k, v) { const db = await this.open(); return new Promise((res, rej) => { const t = db.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, k); t.oncomplete = res; t.onerror = () => rej(t.error); }); },
};
let saveTimer;
function save() {
  $('#status').textContent = '編集中…';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try { await DB.set('state', state); $('#status').textContent = '自動保存済み ' + new Date().toLocaleTimeString().slice(0, 5); }
    catch (e) { $('#status').textContent = '保存失敗: ' + e.message; }
  }, 400);
}

/* ---------- プレビュー描画 ---------- */
// 「60 40」→ grid-template-columns。足りない列は指定した比率の平均で埋める
function colsTpl(ratio, n) {
  const nums = String(ratio || '').split(/[\s,:：、/]+/).map(Number).filter(x => x > 0);
  if (!nums.length) return `repeat(${n},minmax(0,1fr))`;
  const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
  return Array.from({ length: n }, (_, i) => `minmax(0,${nums[i] ?? avg}fr)`).join(' ');
}

// 区画(grp)の下に並んだブロックはその区画に入る（次の区画 or 区画おわり(end)まで）
function blocksHTML() {
  const out = []; let cur = null;
  state.items.forEach((it, i) => {
    const n = i + 1;
    if (it.type === 'grp') { cur = { g: it, n, kids: [] }; out.push(cur); return; }
    if (it.type === 'end') { cur = null; return; }
    // 見出しの位置が「最初の画像の○○」なら、区画の中で最初に画像がある頒布物の画像に見出しを重ねる
    let imgExtra = '';
    if (cur && /^img-/.test(cur.g.badgePos) && !cur.headUsed && it.type === 'item' && (it.phOn || it.img)) {
      imgExtra = grpHeadHTML(cur.g);
      cur.headUsed = true;
    }
    const html = itemHTML(it, n, cur ? +cur.g.gcols || 1 : state.cols, imgExtra);
    if (cur) cur.kids.push(html); else out.push(html);
  });
  return out.map(o => typeof o === 'string' ? o : groupHTML(o.g, o.n, o.kids.join(''), o.headUsed)).join('');
}
const grpHeadHTML = g => (g.text || g.sub) ? `<div class="grp-head">${g.text ? `<span class="grp-badge">${esc(g.text)}</span>` : ''}${g.sub ? `<span class="grp-sub">${esc(g.sub)}</span>` : ''}</div>` : '';
function grpShape(g) {
  const [shape, ring, jag] = LEGACY_SHAPE[g.badgeStyle] || LEGACY_SHAPE.tag;
  return { shape: g.badgeShape || shape, ring: g.badgeRing || ring, jag: g.badgeJag ?? jag };
}
function groupHTML(g, n, kids, headUsed) {
  const span = Math.min(Math.max(1, +g.span || 1), state.cols);
  const cls = g.cls ? ' ' + esc(g.cls) : '';
  // 画像に重ねた場合は区画の上には出さない（区画に画像が1つもなければ、区画の左上に重ねる）
  const head = headUsed ? '' : grpHeadHTML(g);
  const sh = grpShape(g);
  return `<section class="grp grp-shape-${sh.shape} grp-ring-${sh.ring}${sh.jag ? ' grp-jag' : ''} grp-pos-${g.badgePos} grp-line-${g.line}${g.badgeAuto ? ' grp-auto' : ''}${cls}" data-id="${g.id}" data-n="${n}" data-label="${esc(g.text)}" style="--span:${span}${g.badgeAuto ? '' : `;--grp-bg:${g.badgeBg};--grp-fg:${g.badgeFg}`}">
    ${head}<div class="items grp-items" style="--cols:${+g.gcols || 1};--cols-tpl:${colsTpl(g.gratio, +g.gcols || 1)}">${kids}</div></section>`;
}

// imgExtra: 画像の上に重ねて出すもの（区画の見出しを画像の角に置くとき）
function itemHTML(it, n, cols = state.cols, imgExtra = '') {
  const span = Math.min(Math.max(1, +it.span || 1), cols);
  const cls = it.cls ? ' ' + esc(it.cls) : '';
  const attrs = `data-id="${it.id}" data-n="${n}" style="--span:${span}"`;
  if (it.type === 'sec') return `<h2 class="blk blk-sec${cls}" ${attrs}>${esc(it.text)}</h2>`;
  if (it.type === 'txt') return `<p class="blk blk-txt${cls}" ${attrs}>${esc(it.text)}</p>`;
  if (it.type === 'hr')  return `<hr class="blk blk-hr${cls}" ${attrs}>`;
  // 仮の画像（表紙まだ など）にしている場合は、画像があってもそちらを優先して出す
  const hasImg = it.phOn || it.img;
  const pos = hasImg ? it.imgPos : 'noimg';
  const stamp = it.badge1 && it.badgeMode === 'stamp' && hasImg;
  if (stamp) {
    imgExtra += `<div class="item-stamp st-${it.stampPos || 'tl'} grp-auto grp-shape-${it.stampShape || 'circle'} grp-ring-${it.stampRing || 'single'}${it.stampJag ? ' grp-jag' : ''}"><span class="grp-badge">${esc(it.badge1)}</span></div>`;
  }
  const imgHTML = it.phOn
    ? `<div class="img"><div class="ph${it.phLine ? ' ph-line' : ''}" style="--ph-ar:${PH_RATIOS[it.phRatio]?.[1] || '148 / 210'};--ph-bg:${it.phBg};--ph-fg:${it.phFg}">${esc(it.phText)}</div>${imgExtra}</div>`
    : it.img ? `<div class="img"><img src="${urlFor(it.img)}" alt="">${imgExtra}</div>` : '';
  const isNum = /^[\d,.\s]+$/.test(it.price);
  const badges = [
    !stamp && it.badge1 && `<span class="badge new">${esc(it.badge1)}</span>`,
    it.badge2 && `<span class="badge free">${esc(it.badge2)}</span>`,
  ].filter(Boolean).join('');
  // タイトルの位置が「ブロックの一番上」なら、バッジとタイトルを画像の上にまたがる行に出す
  const titleTop = it.titlePos === 'top';
  const headHTML = `${badges ? `<div class="badges">${badges}</div>` : ''}${it.title ? `<h2 class="title">${esc(it.title)}</h2>` : ''}`;
  const fill = it.imgFill && hasImg && (pos === 'left' || pos === 'right');
  // 値段以外（タイトル〜注意書き）。テーマによってはこのまとまりを色の箱で囲む
  const mainHTML = [
    titleTop ? '' : headHTML,
    (it.r18 || it.spec) ? `<div class="spec">${it.r18 ? '<span class="badge r18">R-18</span>' : ''}${esc(it.spec)}</div>` : '',
    it.cp ? `<div class="cp">${esc(it.cp)}</div>` : '',
    it.desc ? `<p class="desc">${esc(it.desc)}</p>` : '',
    it.note ? `<div class="note">${esc(it.note)}</div>` : '',
  ].join('');
  return `<article class="item pos-${pos}${hasImg ? '' : ' noimg'}${titleTop ? ' title-top' : ''}${fill ? ' img-fill' : ''}${cls}" data-id="${it.id}" data-n="${n}" data-badge="${esc(it.badge1)}" style="--span:${span};--imgw:${+it.imgW || 45}%;--img-al:${it.imgAlign || 'start'}">
    ${titleTop && headHTML ? `<div class="item-head">${headHTML}</div>` : ''}
    ${imgHTML}
    <div class="info">
      ${mainHTML ? `<div class="info-main">${mainHTML}</div>` : ''}
      ${it.price ?`<div class="price${isNum ? '' : ' text'}"><span class="num">${esc(it.price)}</span>${it.unit ? `<span class="unit">${esc(it.unit)}</span>` : ''}</div>` : ''}
    </div>
  </article>`;
}

function render() {
  const s = state, i = s.info, sh = $('#sheet');
  const p = s.pattern, fr = s.frame, hasFrame = fr.type !== 'none' || fr.fill;
  sh.className = `sheet theme-${s.theme} ${s.orient}${hasFrame && fr.pad ? ' fr-pad' : ''}${s.tab.on ? ' tab-on' : ''}${s.tab.on && s.tab.topLine === false ? ' tab-notop' : ''}${s.textShadow.on ? ' ts-on' : ''}${s.imgShadow.mode !== 'theme' ? ' is-' + s.imgShadow.mode : ''}`;
  const vars = {
    '--c-bg': s.colors.bg, '--c-paper': s.colors.paper, '--c-ink': s.colors.ink, '--c-accent': s.colors.accent, '--c-sub': s.colors.sub,
    '--f-head': fontStack(s.fonts.head, s.fonts.body), '--f-body': fontStack(s.fonts.body), '--f-num': fontStack(s.fonts.num, s.fonts.head, s.fonts.body),
    '--scale': s.scale, '--hs': s.hs, '--gap': s.gap, '--cols': s.cols, '--cols-tpl': colsTpl(s.colRatio, s.cols),
    '--bgimg': s.bg.img ? `url("${urlFor(s.bg.img)}")` : 'none', '--bg-op': s.bg.opacity, '--bg-tile': s.bg.tile,
    '--p-c': p.color, '--p-s': p.size, '--p-w': p.weight, '--p-op': p.opacity,
    '--fr-c': fr.color, '--fr-w': fr.type === 'none' ? 0 : fr.width, '--fr-r': fr.radius, '--fr-inset': fr.inset,
    '--fr-style': ['double', 'dashed', 'dotted'].includes(fr.type) ? fr.type : 'solid',
    '--fr-fill': fr.fill ? hexToRgba(fr.fillColor, fr.fillAlpha ?? 1) : 'transparent', '--fr-sh': fr.shadow, '--fr-pad': fr.padding,
    '--img-gap': s.imgGap ?? 6, '--stamp-tilt': s.stampTilt ?? -8, '--stamp-size': s.stampSize ?? 1,
    '--ts': shadowCss(s.textShadow), '--is': shadowCss(s.imgShadow),
    '--col-line-c': `var(--c-${s.colLine.role || 'ink'})`, '--col-line-w': s.colLine.width,
    '--tab-bg': s.tab.bg, '--tab-fg': s.tab.fg, '--tab-bw': s.tab.border, '--tab-bc': s.tab.borderColor, '--tab-pad': s.tab.pad,
  };
  for (const [k, v] of Object.entries(vars)) sh.style.setProperty(k, v);
  const f = (cls, v) => v ? `<div class="${cls}">${esc(v)}</div>` : '';
  const bgLayer = s.bg.img ? `<div class="bgimg fit-${s.bg.fit}"></div>` : '';
  const deco = '<div class="deco"></div>';
  // 重なり順: パターン → (背景画像:下) → テーマ装飾 → 枠 → (背景画像:上) → 中身
  const pattern = p.type !== 'none' ? `<div class="pattern p-${p.type}"></div>` : '';
  const frame = hasFrame ? `<div class="frame f-${fr.type}"></div>` : '';
  sh.innerHTML = `${pattern}${s.bg.layer === 'back' ? bgLayer + deco + frame : deco + frame + bgLayer}
    <header class="sh"><div class="sh-box">${f('sh-date', i.date)}${f('sh-event', i.event)}${f('sh-space', i.space)}</div>${i.logo ? `<div class="sh-circle"><img src="${urlFor(i.logo)}" alt="${esc(i.circle)}"></div>` : i.circle ? `<div class="sh-circle"><span class="sh-circle-t">${esc(i.circle)}</span></div>` : ''}</header>
    ${i.headline ? `<div class="headline">${esc(i.headline)}</div>` : ''}
    <main class="items vfill-${s.vfill || 'start'}">${blocksHTML()}</main>
    ${i.notes ? `<footer class="notes">${esc(i.notes)}</footer>` : ''}`;
  $('#pageCss').textContent = `@page{size:A3 ${s.orient};margin:0}`;
  $('#userCss').textContent = s.css;
  $$('[data-show]').forEach(el => { const v = +getPath(s, el.dataset.show); el.textContent = Math.abs(v) >= 10 || Number.isInteger(v) && el.dataset.show === 'stampTilt' ? Math.round(v) : v.toFixed(2).replace(/0$/, ''); });
  // 影の欄: オフ・テーマのままのときは薄く表示
  $$('.shadow-ui').forEach(el => el.classList.toggle('off', el.dataset.shadow === 'textShadow' ? !s.textShadow.on : s.imgShadow.mode !== 'custom'));
  const th = $('#bgThumb');
  th.style.backgroundImage = s.bg.img ? `url("${urlFor(s.bg.img)}")` : '';
  th.textContent = s.bg.img ? '' : '画像なし';
  const lt = $('#logoThumb');
  lt.style.backgroundImage = i.logo ? `url("${urlFor(i.logo)}")` : '';
  lt.textContent = i.logo ? '' : 'ロゴなし';
  layoutHeader();
  fitImages();
  fitPrices();
  drawColLines();
  fit();
  // 画像読み込み後にもう一度（画像の縦横比が分かってから高さ合わせ・はみ出しチェック）
  $$('img', sh).forEach(img => img.complete || img.addEventListener('load', () => { fitImages(); fitPrices(); drawColLines(); checkOverflow(); }, { once: true }));
  document.fonts?.ready.then(() => { layoutHeader(); fitImages(); fitPrices(); drawColLines(); checkOverflow(); });
  checkOverflow();
}

// 列の間の区切り線。列の境目（列と列のすき間の真ん中）に縦線を置く。
// 境目をまたぐブロック（横いっぱいの見出し・区画など）があるところは線を途切れさせる
function drawColLines() {
  const sh = $('#sheet');
  $$('.col-line', sh).forEach(e => e.remove());
  const cl = state.colLine;
  if (!cl || !cl.on) return;
  for (const l of $$('.items', sh)) {
    if (l.classList.contains('grp-items') && !cl.inner) continue;
    const cs = getComputedStyle(l);
    const cols = cs.gridTemplateColumns.split(' ').map(parseFloat).filter(n => !isNaN(n));
    if (cols.length < 2) continue;
    const colGap = parseFloat(cs.columnGap) || 0, rowGap = parseFloat(cs.rowGap) || 0;
    const kids = [...l.children].filter(c => !c.classList.contains('col-line'));
    const H = l.clientHeight;
    let x = 0;
    for (let i = 0; i < cols.length - 1; i++) {
      x += cols[i];
      const bx = x + colGap / 2;   // 境目の位置（並びの左端から）
      x += colGap;
      // この境目をまたぐブロックの上下の範囲（少し余白をとる）は線を引かない
      const blocked = kids.filter(c => c.offsetLeft < bx - 1 && c.offsetLeft + c.offsetWidth > bx + 1)
        .map(c => [c.offsetTop - rowGap / 2, c.offsetTop + c.offsetHeight + rowGap / 2]).sort((a, b) => a[0] - b[0]);
      let y = 0;
      const segs = [];
      for (const [t, b] of blocked) { if (t > y) segs.push([y, t]); y = Math.max(y, b); }
      if (y < H) segs.push([y, H]);
      for (const [t, b] of segs) {
        if (b - t < 4) continue;
        const d = document.createElement('div');
        d.className = 'col-line';
        d.style.left = bx + 'px'; d.style.top = t + 'px'; d.style.height = (b - t) + 'px';
        l.appendChild(d);
      }
    }
  }
}

// 値段の大きさを、同じ並び（区画の中・区画の外）でそろえる。
// 一番狭い欄に収まる倍率を並びごとに求めて、その並びの値段すべてに同じ倍率をかける（--price-fit）
function fitPrices() {
  const lists = $$('#sheet .items');
  lists.forEach(l => l.style.setProperty('--price-fit', 1));
  for (const l of lists) {
    let fitK = 1;
    for (const a of $$(':scope > .item', l)) {
      const p = $(':scope > .info > .price', a), info = $(':scope > .info', a);
      if (!p || !info) continue;
      const need = p.scrollWidth, room = info.clientWidth;
      if (need > room && need > 0) fitK = Math.min(fitK, room / need);
    }
    l.style.setProperty('--price-fit', Math.max(0.3, fitK * 0.98).toFixed(3));
  }
}

// 「画像の縦幅を区画の縦幅に合わせる」
// 目標の高さ R0 = 元の並び（「画像の幅」スライダーの幅）で、画像を除いたときの行の高さ
//   （横に並ぶ頒布物や自分の文字で決まる高さ）
// 画像の高さを R0 にしたいが、画像を広げると文字の欄が狭くなって行が伸びることがある。
// 行を R0 より高くしない（＝ページをはみ出させない）範囲で、一番広い画像の幅を二分探索で探す
function fitImages() {
  const arts = $$('#sheet .item.img-fill');
  for (const a of arts) {
    a.style.gridTemplateColumns = '';
    const box = $(':scope > .img', a); if (!box) continue;
    const im = $('img', box), ph = $('.ph', box);
    let ratio;   // 横 ÷ 縦
    if (ph) { const [w, h] = getComputedStyle(ph).getPropertyValue('--ph-ar').split('/').map(parseFloat); ratio = w / h; }
    else if (im && im.naturalWidth) ratio = im.naturalWidth / im.naturalHeight;
    if (!ratio) continue;   // 画像の読み込み待ち（読み込み後にもう一度呼ばれる）
    const right = a.classList.contains('pos-right');
    const setW = w => a.style.gridTemplateColumns = right ? `minmax(0,1fr) ${w}px` : `${w}px minmax(0,1fr)`;
    const head = $(':scope > .item-head', a);
    const gap = parseFloat(getComputedStyle(a).rowGap) || 0;
    // 画像の幅 w のとき、画像以外で決まる高さ（w = null なら元の並び）
    const rowH = w => {
      if (w == null) a.style.gridTemplateColumns = ''; else setW(w);
      box.style.height = '0'; box.style.overflow = 'hidden';
      const h = a.offsetHeight - (head ? head.offsetHeight + gap : 0);
      box.style.height = ''; box.style.overflow = '';
      return h;
    };
    const R0 = rowH(null);
    // 画像の高さがちょうど R0 になる幅（ただし頒布物の幅の10%〜60%の範囲）
    let lo = a.clientWidth * 0.1, hi = Math.max(lo, Math.min(R0 * ratio, a.clientWidth * 0.6));
    if (rowH(hi) <= R0 + 0.5) { setW(hi); continue; }       // 行が伸びない → そのまま
    // 行が伸びてしまう → 伸びない範囲で一番広い幅を探す
    for (let k = 0; k < 14 && hi - lo > 0.5; k++) {
      const mid = (lo + hi) / 2;
      if (rowH(mid) <= R0 + 0.5) lo = mid; else hi = mid;
    }
    setW(lo);
  }
}

// ヘッダーの自動調整。順番が大事: 付箋を端まで伸ばす → 3行の左右揃え → サークル名の大きさ → 付箋の下端の形
function layoutHeader() {
  tabExtend();
  justifyHeader();
  fitCircle();
  tabShape();
}

const MM = 96 / 25.4;   // 1mm あたりの px
// 付箋: 用紙の上端・左端までの距離を測り、その分だけ箱を外に広げる（中の文字の位置は変えない）
function tabExtend() {
  const sh = $('#sheet'), box = $('.sh-box', sh);
  if (!box) return;
  Object.assign(box.style, { marginTop: '', marginLeft: '', paddingTop: '', paddingLeft: '', paddingBottom: '', clipPath: '', borderRadius: '' });
  const t = state.tab;
  if (!t.on) return;
  const k = sh.getBoundingClientRect().width / sh.offsetWidth || 1;
  const sr = sh.getBoundingClientRect(), br = box.getBoundingClientRect(), cs = getComputedStyle(box);
  if (t.toTop) {
    const d = (br.top - sr.top) / k;
    box.style.marginTop = -d + 'px';
    box.style.paddingTop = parseFloat(cs.paddingTop) + d + 'px';
  }
  if (t.toLeft) {
    const d = (br.left - sr.left) / k;
    box.style.marginLeft = -d + 'px';
    box.style.paddingLeft = parseFloat(cs.paddingLeft) + d + 'px';
  }
  // ギザギザ・斜めは下端を削るので、その分だけ下の余白を足して文字が欠けないようにする
  const z = (+t.size || 3) * MM;
  if (t.shape === 'zigzag') box.style.paddingBottom = parseFloat(cs.paddingBottom) + z + 'px';
  if (t.shape === 'slant') box.style.paddingBottom = parseFloat(cs.paddingBottom) + z * 2 + 'px';
}
// 付箋の下端の形（大きさが決まった後に切り抜く）
function tabShape() {
  const box = $('#sheet .sh-box'), t = state.tab;
  if (!box || !t.on) return;
  const w = box.offsetWidth, h = box.offsetHeight, z = (+t.size || 3) * MM;
  if (t.shape === 'zigzag') {
    const n = Math.max(2, Math.round(w / (z * 2))), tw = w / n;
    const pts = ['0 0', `${w}px 0`, `${w}px ${h - z}px`];
    for (let i = n; i > 0; i--) pts.push(`${(i - .5) * tw}px ${h}px`, `${(i - 1) * tw}px ${h - z}px`);
    box.style.clipPath = `polygon(${pts.join(',')})`;
  } else if (t.shape === 'slant') {
    box.style.clipPath = `polygon(0 0, 100% 0, 100% calc(100% - ${z * 2}px), 0 100%)`;
  } else if (t.shape === 'round') {
    box.style.borderRadius = `0 0 ${z * 2}px ${z * 2}px`;
  }
}

// 日付・イベント名・スペースの字間を調整して、左右の端を揃える
function justifyHeader() {
  const sh = $('#sheet');
  const els = ['.sh-date', '.sh-event', '.sh-space'].map(s => $(s, sh)).filter(Boolean);
  for (const el of els) Object.assign(el.style, { letterSpacing: '', width: '', textAlign: '', whiteSpace: '', marginLeft: '' });
  if (state.headAlign === 'none' || els.length < 2) return;
  // 文字の「インク」の幅を測る（大きい数字は字形の左右に余白があるので、送り幅ではなく実際の線の端で揃える）
  const ctx = (justifyHeader.ctx ??= document.createElement('canvas').getContext('2d'));
  const ink = els.map(el => {
    const cs = getComputedStyle(el);
    ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const m = ctx.measureText(el.textContent);
    return { left: -m.actualBoundingBoxLeft, width: m.actualBoundingBoxLeft + m.actualBoundingBoxRight };
  });
  const space = $('.sh-space', sh);
  const target = state.headAlign === 'space' && space ? ink[els.indexOf(space)].width : Math.max(...ink.map(x => x.width));
  els.forEach((el, i) => {
    const n = [...el.textContent].length;
    // 字間を広げると最後の文字が (n-1) 回分右へずれる → インクの右端が target に来るように字間を決める
    if (n >= 2) el.style.letterSpacing = (target - ink[i].width) / (n - 1) + 'px';
    el.style.whiteSpace = 'nowrap';
    el.style.textAlign = 'left';
    el.style.width = target + 'px';
    el.style.marginLeft = -ink[i].left + 'px';  // 左の字形余白を打ち消してインクの左端を揃える
  });
}

// 1行の文字要素について、要素の上端から見たインク（実際に線がある部分）の上端・下端を返す（単位: 拡大縮小前のpx）
function inkBox(el) {
  const ctx = (inkBox.ctx ??= document.createElement('canvas').getContext('2d'));
  const cs = getComputedStyle(el);
  ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  const m = ctx.measureText(el.textContent);
  const fs = parseFloat(cs.fontSize);
  const lh = cs.lineHeight === 'normal' ? m.fontBoundingBoxAscent + m.fontBoundingBoxDescent : parseFloat(cs.lineHeight);
  // 行ボックスの中でのベースライン位置（行の余白は上下に半分ずつ）
  const baseline = parseFloat(cs.paddingTop) + (lh - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2 + m.fontBoundingBoxAscent;
  return { top: baseline - m.actualBoundingBoxAscent, bottom: baseline + m.actualBoundingBoxDescent, inkPerPx: (m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) / fs };
}

// サークル名の高さを「日付の上端〜スペースの下端」に合わせる
function fitCircle() {
  const sh = $('#sheet'), circle = $('.sh-circle', sh);
  if (!circle) return;
  const img = $('img', circle), t = $('.sh-circle-t', circle);
  Object.assign(circle.style, { fontSize: '', lineHeight: '', whiteSpace: '', height: '', position: '', top: '', display: '', width: '', textAlign: '', justifySelf: '', marginLeft: '', marginRight: '', flex: '' });
  if (img) img.style.height = '';
  if (t) Object.assign(t.style, { display: '', transform: '', transformOrigin: '', whiteSpace: '' });
  const target = state.circleFit ? fitCircleHeight(sh, circle, img) : null;
  squeezeCircle(circle, t);
  if (target != null) alignCircleBottom(sh, circle, img, t, target);
}

// 下端をスペース（最後の行）のインクの下端に合わせる（長体で中身が inline-block になった後に測る）
function alignCircleBottom(sh, circle, img, t, bottom) {
  const k = sh.getBoundingClientRect().height / sh.offsetHeight || 1;
  const y = el => el.getBoundingClientRect().top / k;
  const textEl = t && t.style.display === 'inline-block' ? t : circle;
  const inkBottom = img ? y(img) + img.offsetHeight : y(textEl) + inkBox(textEl).bottom;
  circle.style.position = 'relative';
  circle.style.top = (bottom - inkBottom) + 'px';
}

// 長体: 中身(span)だけを横に縮め、入れ物の幅は縮めた後の幅にする → 右揃え・左揃えが崩れない
function squeezeCircle(circle, t) {
  const sx = (+state.circleSX || 100) / 100;
  if (!t || sx >= 1) return;
  // 元の揃え方向（テーマやCSSの text-align）を覚えておき、入れ物ごとその方向に寄せる
  const align = getComputedStyle(circle).textAlign;
  Object.assign(t.style, { display: 'inline-block', whiteSpace: 'nowrap', transform: `scaleX(${sx})`, transformOrigin: '0 0' });
  circle.style.width = t.offsetWidth * sx + 'px';   // offsetWidth は縮める前の幅
  circle.style.flex = 'none';                         // 付箋ヘッダー(flex)の中で幅が引き伸ばされないように
  circle.style.whiteSpace = 'nowrap';
  circle.style.textAlign = 'left';                    // 入れ物＝縮めた幅なので、中は左から詰める
  const m = { right: 'end', end: 'end', center: 'center' }[align] || 'start';
  circle.style.justifySelf = m;                       // grid の中で寄せる
  circle.style.marginLeft = m === 'end' || m === 'center' ? 'auto' : '';   // flex/block の中で寄せる
  circle.style.marginRight = m === 'center' ? 'auto' : '';
}

function fitCircleHeight(sh, circle, img) {
  const stack = ['.sh-date', '.sh-event', '.sh-space'].map(s => $(s, sh)).filter(Boolean);
  if (!stack.length) return;
  const k = sh.getBoundingClientRect().height / sh.offsetHeight || 1;   // プレビューの縮小率
  const y = el => el.getBoundingClientRect().top / k;
  const first = stack[0], last = stack[stack.length - 1];
  // サークル名がすでに大きいと行が引き伸ばされるので、いったん消した状態で左側の高さを測る
  circle.style.display = 'none';
  const top = y(first) + inkBox(first).top, bottom = y(last) + inkBox(last).bottom;
  circle.style.display = '';
  const H = bottom - top;
  if (!(H > 0)) return;
  if (img) {
    img.style.height = H + 'px';
    circle.style.lineHeight = '0';
  } else {
    circle.style.whiteSpace = 'nowrap';
    const tt = $('.sh-circle-t', circle);
    if (tt) tt.style.whiteSpace = 'nowrap';   // 中の span は pre-wrap なので、こちらも止めないと折り返してしまう
    circle.style.fontSize = '100px';
    let fs = H / inkBox(circle).inkPerPx;
    circle.style.fontSize = fs + 'px';
    // 横に入りきらない場合は、入る大きさまで小さくする（左の日付〜スペースを押しつぶさないため）
    const head = $('.sh', sh), hs = getComputedStyle(head);
    const avail = head.clientWidth - parseFloat(hs.paddingLeft) - parseFloat(hs.paddingRight)
      - Math.max(...stack.map(el => el.offsetWidth)) - (parseFloat(hs.columnGap) || 0);
    const t = $('.sh-circle-t', circle);
    const w = (t || circle).getBoundingClientRect().width / k * ((+state.circleSX || 100) / 100);
    if (avail > 0 && w > avail) { fs *= avail / w; circle.style.fontSize = fs + 'px'; }
    circle.style.lineHeight = H + 'px';   // 行の高さを揃えたい高さぴったりにして、ヘッダーの行が広がらないようにする
  }
  return bottom;   // 合わせたい下端の位置
}

function checkOverflow() {
  const sh = $('#sheet'), r = sh.getBoundingClientRect();
  const over = $$('.sh, .headline, .item, .blk, .grp, .notes', sh).some(el => {
    const b = el.getBoundingClientRect();
    return b.bottom > r.bottom + 1 || b.right > r.right + 1;
  });
  $('#warn').classList.toggle('on', over);
}

function fit() {
  const sh = $('#sheet'), stage = $('#stage'), sc = $('#scaler');
  const w = sh.offsetWidth, h = sh.offsetHeight;
  const aw = stage.clientWidth - 48, ah = stage.clientHeight - 48;
  const z = $('#zoomSel').value;
  const k = z === 'fit' ? Math.min(aw / w, ah / h) : z === 'width' ? aw / w : +z;
  sh.style.transform = `scale(${k})`;
  sc.style.width = w * k + 'px';
  sc.style.height = h * k + 'px';
}
new ResizeObserver(() => { fit(); checkOverflow(); }).observe($('#stage'));
$('#zoomSel').addEventListener('change', () => { fit(); checkOverflow(); });

/* ---------- エディター: 共通フィールド ---------- */
function fillStatic() {
  $('#themeSel').innerHTML = Object.entries(THEMES).map(([k, t]) => `<option value="${k}">${t.name}（${t.desc}）</option>`).join('');
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
  const missing = Object.values(state.fonts).filter(f => ![...FONTS, ...file, ...pc].includes(f));
  pc = uniq([...pc, ...missing]);
  const opt = (f, styled) => `<option value="${esc(f)}"${styled ? ` style="font-family:${esc(fontStack(f))}"` : ''}>${esc(f)}</option>`;
  const groups = [['Webフォント', FONTS, true], ['読み込んだフォント', file, true], ['PCのフォント', pc, pc.length < 80]];
  const html = groups.filter(g => g[1].length).map(([label, fs, styled]) => `<optgroup label="${label}">${fs.map(f => opt(f, styled)).join('')}</optgroup>`).join('');
  $$('.fontSel').forEach(sel => { sel.innerHTML = html; sel.value = getPath(state, sel.dataset.k); });
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
    const taken = new Set([...FONTS, ...state.fileFonts.map(f => f.family)]);
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
$('#btnResetTheme').onclick = async () => {
  await autoSaveWork();   // 戻す前の状態は「作業中：テーマ名」に残す
  Object.assign(state, themeLook(state.theme));
  buildFontOptions(); syncFields(); render(); save();
};

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
function showTab(name) {
  $$('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === name));
  $$('.pane').forEach(p => p.classList.toggle('on', p.dataset.pane === name));
}

/* ---------- エディター: 頒布物 ---------- */
const TYPE_LABEL = { item: '', sec: '見出し', txt: 'テキスト', hr: '区切り線', grp: '区画', end: '区画おわり' };
const cardTitle = it =>
  it.type === 'hr' ? '―― 区切り線 ――' :
  it.type === 'end' ? '―― 区画ここまで ――' :
  (it.type === 'item' ? it.title : it.text).split('\n')[0] || (it.type === 'grp' ? '(見出しなし)' : '(無題)');
const opts = (list, cur) => list.map(([v, l]) => `<option value="${v}"${cur === v ? ' selected' : ''}>${l}</option>`).join('');
// ctxCols: このブロックが置かれている場所の列数（区画の中なら区画の列数）
function itemCard(it, n, open, ctxCols = state.cols, inGrp = false) {
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
  if (it.type === 'end') return head + `<p class="hint" style="margin:0">ここより下のブロックは、どの区画にも入らず用紙に直接並びます。</p></div></details>`;
  if (it.type === 'grp') return head + `
      <div class="row">
        <label class="f">見出し<input type="text" data-ik="text" value="${esc(it.text)}" list="badgeList" placeholder="新刊 / 既刊 / NEW / OLD"></label>
        <label class="f">サブ文字<input type="text" data-ik="sub" value="${esc(it.sub)}" placeholder="残部少！ など"></label>
      </div>
      <div class="row">
        <label class="f">見出しの形<select data-ik="badgeShape">${opts([['none','文字だけ'],['rect','長方形'],['round','角丸'],['circle','正円']], grpShape(it).shape)}</select></label>
        <label class="f">内側の線<select data-ik="badgeRing">${opts([['none','なし'],['single','1本'],['double','2本']], grpShape(it).ring)}</select></label>
        <label class="chk" style="flex:.7"><input type="checkbox" data-ik="badgeJag"${grpShape(it).jag ? ' checked' : ''}>ギザギザ</label>
      </div>
      <div class="row">
        <label class="f">見出しの位置<select data-ik="badgePos">${opts([['top','区画の上'],['overlay','区画の左上に重ねる'],['overlay-r','区画の右上に重ねる'],['img-tl','最初の画像の左上'],['img-tr','最初の画像の右上'],['img-bl','最初の画像の左下'],['img-br','最初の画像の右下']], it.badgePos)}</select></label>
      </div>
      <label class="chk" style="margin:0 0 6px"><input type="checkbox" data-ik="badgeAuto"${it.badgeAuto ? ' checked' : ''}>見出しの色をテーマの色に合わせる</label>
      <div class="row"${it.badgeAuto ? ' style="opacity:.4;pointer-events:none"' : ''}>
        <label class="f">見出しの色<input type="color" data-ik="badgeBg" value="${esc(it.badgeBg)}" style="width:100%;height:31px;padding:0"${it.badgeAuto ? ' disabled' : ''}></label>
        <label class="f">見出しの文字色<input type="color" data-ik="badgeFg" value="${esc(it.badgeFg)}" style="width:100%;height:31px;padding:0"${it.badgeAuto ? ' disabled' : ''}></label>
      </div>
      <div class="row">
        <label class="f">区画の線<select data-ik="line">${opts([['none','なし'],['top','上に線'],['left','左に線'],['box','四角で囲む']], it.line)}</select></label>
        <label class="f">区画の中の列数<select data-ik="gcols" data-num>${opts([1, 2, 3, 4].map(c => [c, c + '列']), +it.gcols)}</select></label>
      </div>
      <label class="f">区画の中の列の幅の比率（空欄なら均等）<input type="text" data-ik="gratio" value="${esc(it.gratio)}" placeholder="例: 60 40"></label>
      ${common}
      <p class="hint" style="margin:0">この下に並べたブロックが、次の「区画」か「区画おわり」までこの区画に入ります。「文字だけ」のときは見出しの色が文字の色になります。</p>
    </div></details>`;
  if (it.type !== 'item') return head + (it.type === 'hr' ? '' :`<label class="f">${TYPE_LABEL[it.type]}<textarea data-ik="text">${esc(it.text)}</textarea></label>`) + common + '</div></details>';
  return head + `
      <div class="imgslot">
        <div class="thumb" style="${it.img ? `background-image:url(${urlFor(it.img)})` : ''}">${it.img ? '' : '画像なし'}</div>
        <div><label class="btn">画像を選択<input type="file" accept="image/*" data-act="img" hidden></label>
        ${it.img ? '<button data-act="clearimg">外す</button>' : ''}</div>
      </div>
      <label class="chk" style="margin:-4px 0 6px"><input type="checkbox" data-ik="phOn"${it.phOn ? ' checked' : ''}>仮の画像にする（表紙まだ など）</label>
      ${it.phOn ? `<div class="row">
        <label class="f">縦横比<select data-ik="phRatio">${opts(Object.entries(PH_RATIOS).map(([k, [l]]) => [k, l]), it.phRatio || 'a5')}</select></label>
        <label class="f" style="flex:.5">背景<input type="color" data-ik="phBg" value="${esc(it.phBg)}" style="width:100%;height:31px;padding:0"></label>
        <label class="f" style="flex:.5">文字<input type="color" data-ik="phFg" value="${esc(it.phFg)}" style="width:100%;height:31px;padding:0"></label>
      </div>
      <label class="f">仮の画像の文字<textarea data-ik="phText" rows="1" style="min-height:0">${esc(it.phText)}</textarea></label>
      <label class="chk" style="margin:-4px 0 8px"><input type="checkbox" data-ik="phLine"${it.phLine ? ' checked' : ''}>内側に点線の枠を表示する</label>` : ''}
      <label class="f">タイトル<textarea data-ik="title" rows="1" style="min-height:0">${esc(it.title)}</textarea></label>
      <div class="row">
        <label class="f">バッジ<input type="text" data-ik="badge1" value="${esc(it.badge1)}" list="badgeList" placeholder="新刊/既刊/NEW"></label>
        <label class="f">自由バッジ<input type="text" data-ik="badge2" value="${esc(it.badge2)}" placeholder="残りわずか 等"></label>
        <label class="chk"><input type="checkbox" data-ik="r18"${it.r18 ? ' checked' : ''}>R-18</label>
      </div>
      <div class="row">
        <label class="f">バッジの出し方<select data-ik="badgeMode">${opts([['text','タイトルの上'],['stamp','画像に重ねる（スタンプ）']], it.badgeMode || 'text')}</select></label>
        ${it.badgeMode === 'stamp' ? `<label class="f">スタンプの位置<select data-ik="stampPos">${opts([['tl','左上'],['tr','右上'],['bl','左下'],['br','右下']], it.stampPos || 'tl')}</select></label>` : ''}
      </div>
      ${it.badgeMode === 'stamp' ? `<div class="row">
        <label class="f">スタンプの形<select data-ik="stampShape">${opts([['none','文字だけ'],['rect','長方形'],['round','角丸'],['circle','正円']], it.stampShape || 'circle')}</select></label>
        <label class="f">内側の線<select data-ik="stampRing">${opts([['none','なし'],['single','1本'],['double','2本']], it.stampRing || 'single')}</select></label>
        <label class="chk" style="flex:.7"><input type="checkbox" data-ik="stampJag"${it.stampJag ? ' checked' : ''}>ギザギザ</label>
      </div>
      <p class="hint" style="margin-top:-4px">スタンプの色はテーマの色、傾きはデザインタブの「重ねた見出し（スタンプ）の傾き」に合わせます。画像がないときはタイトルの上に出ます。</p>` : ''}
      <label class="f">詳細（判型・ページ数・サイズ）<textarea data-ik="spec" rows="1" style="min-height:0" placeholder="A5 / 34P">${esc(it.spec)}</textarea></label>
      <label class="f">カップリング・ジャンル<textarea data-ik="cp" rows="1" style="min-height:0">${esc(it.cp)}</textarea></label>
      <label class="f">説明文<textarea data-ik="desc">${esc(it.desc)}</textarea></label>
      <label class="f">注意書き（小さい文字）<textarea data-ik="note" rows="1" style="min-height:0">${esc(it.note)}</textarea></label>
      <div class="row">
        <label class="f">価格<input type="text" data-ik="price" value="${esc(it.price)}" placeholder="500 / 無料配布"></label>
        <label class="f" style="flex:.5">単位<input type="text" data-ik="unit" value="${esc(it.unit)}"></label>
      </div>
      ${common}
      <div class="row">
        <label class="f">画像の位置<select data-ik="imgPos">
          ${[['left','左'],['right','右'],['top','上']].map(([v, l]) => `<option value="${v}"${it.imgPos === v ? ' selected' : ''}>${l}</option>`).join('')}
        </select></label>
        <label class="f">画像の縦位置<select data-ik="imgAlign">
          ${[['start','上'],['center','中央'],['end','下']].map(([v, l]) => `<option value="${v}"${(it.imgAlign || 'start') === v ? ' selected' : ''}>${l}</option>`).join('')}
        </select></label>
      </div>
      <label class="chk" style="margin:-2px 0 8px"><input type="checkbox" data-ik="imgFill"${it.imgFill ? ' checked' : ''}>画像の縦幅を区画の縦幅に合わせる（横幅は自動。画像の位置が左・右のとき）</label>
      <label class="f">画像の幅 <span class="rangeval">${it.imgW}%</span><input type="range" min="15" max="100" step="1" data-ik="imgW" data-num value="${it.imgW}"></label>
      <label class="f">タイトルの位置<select data-ik="titlePos">${opts([['info','画像の横（詳細と同じ欄）'],['top','ブロックの一番上（画像の上にまたがる）']], it.titlePos || 'info')}</select></label>
    </div>
  </details>`;
}
function buildItems() {
  const open = new Set($$('#itemList details[open]').map(d => d.dataset.id));
  const first = !$('#itemList').children.length;
  let grp = null;
  $('#itemList').innerHTML = state.items.map((it, n) => {
    if (it.type === 'grp') grp = it;
    if (it.type === 'end') grp = null;
    const inGrp = grp && it.type !== 'grp';
    return itemCard(it, n + 1, first ? n === 0 : open.has(it.id), inGrp ? +grp.gcols || 1 : state.cols, inGrp);
  }).join('')
    + `<datalist id="badgeList"><option>新刊</option><option>既刊</option><option>NEW</option><option>OLD</option><option>再販</option></datalist>`;
}
const findItem = el => { const card = el.closest('.card'); return card && [card, state.items.findIndex(x => x.id === card.dataset.id)]; };

$('#itemList').addEventListener('input', e => {
  const el = e.target; const k = el.dataset.ik; if (!k) return;
  const [card, idx] = findItem(el); const it = state.items[idx];
  it[k] = el.type === 'checkbox' ? el.checked : el.hasAttribute('data-num') ? +el.value : el.value;
  if (k === 'title' || k === 'text') $('.t', card).textContent = cardTitle(it);
  if (k === 'gcols') { render(); save(); buildItems(); return; }  // 区画内の横幅の選択肢を作り直す
  if (k === 'phOn' || k === 'badgeAuto' || k === 'badgeMode') { render(); save(); buildItems(); return; }   // 設定欄の出し入れ・有効/無効を切り替える
  if (k === 'imgW') el.previousElementSibling.textContent = el.value + '%';
  render(); save();
});
$('#itemList').addEventListener('click', e => {
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

// サークルロゴ
async function setLogo(file) {
  if (!file || !file.type.startsWith('image/')) return;
  state.info.logo = await readFile(file); render(); save();
}
$('#logoFile').onchange = e => { setLogo(e.target.files[0]); e.target.value = ''; };
$('#logoClear').onclick = () => { state.info.logo = ''; render(); save(); };
const logoSlot = $('#logoSlot');
logoSlot.addEventListener('dragover', e => { e.preventDefault(); logoSlot.classList.add('drag'); });
logoSlot.addEventListener('dragleave', () => logoSlot.classList.remove('drag'));
logoSlot.addEventListener('drop', e => { e.preventDefault(); logoSlot.classList.remove('drag'); setLogo(e.dataTransfer.files[0]); });

// プレビュークリック → 該当カードへ
$('#sheet').addEventListener('click', e => {
  const item = e.target.closest('[data-id]'); if (!item) return;
  showTab('items');
  const card = $(`.card[data-id="${item.dataset.id}"]`);
  card.open = true; card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  card.classList.add('flash'); setTimeout(() => card.classList.remove('flash'), 900);
});

/* ---------- マイテーマ ---------- */
// デザインに関わる項目だけを保存・適用する（お品書きの中身には触らない）
const DESIGN_KEYS = ['theme', 'orient', 'cols', 'colRatio', 'vfill','scale', 'hs', 'gap', 'headAlign', 'circleFit', 'circleSX', 'imgGap', 'stampTilt', 'stampSize', 'textShadow', 'imgShadow', 'colLine', 'colors', 'fonts', 'bg', 'pattern', 'frame', 'tab', 'css'];
// 古い保存データに無い項目を既定値で補う
// 影の設定 → 「横 縦 ぼかし 色」（text-shadow と drop-shadow の両方でそのまま使える形）
const shadowCss = sd => `${+sd.x || 0}mm ${+sd.y || 0}mm ${Math.max(0, +sd.blur || 0)}mm ${hexToRgba(sd.color || '#000000', sd.alpha ?? 0.4)}`;
const SHADOW_PRESETS = {
  textShadow: { soft: { on:true, x:0, y:0.4, blur:1.5, alpha:0.35 }, hard: { on:true, x:0.5, y:0.5, blur:0, alpha:0.3 } },
  imgShadow:  { soft: { mode:'custom', x:0, y:1.5, blur:3, alpha:0.4 }, hard: { mode:'custom', x:2, y:2, blur:0, alpha:1 } },
};
document.addEventListener('click', e => {
  const b = e.target.closest('[data-shadow-preset]'); if (!b) return;
  const key = b.closest('[data-shadow]').dataset.shadow;
  Object.assign(state[key], SHADOW_PRESETS[key][b.dataset.shadowPreset]);
  syncFields(); render(); save();
});

function withDefaults(s) {
  const d = defaultState();
  const TS = { soft: { on:true, x:0, y:0.4, blur:1.5, alpha:0.35 }, hard: { on:true, x:0.5, y:0.5, blur:0, alpha:0.3 } };
  const IS = { soft: { mode:'custom', x:0, y:1.5, blur:3, alpha:0.4 }, hard: { mode:'custom', x:2, y:2, blur:0, alpha:1 }, none: { mode:'none' }, theme: { mode:'theme' } };
  if (typeof s.textShadow === 'string') s.textShadow = TS[s.textShadow] || {};
  if (typeof s.imgShadow === 'string') s.imgShadow = IS[s.imgShadow] || {};
  for (const k of ['info', 'bg', 'pattern', 'frame', 'tab', 'textShadow', 'imgShadow', 'colLine']) s[k] = { ...d[k], ...s[k] };
  return s;
}
let myThemes = [];
const clone = o => JSON.parse(JSON.stringify(o));

// テーマの初期状態の「見た目」。用紙の向き・列数・列の比率・余白の使い方は中身の並びに関わるので含めない
const LOOK_KEYS = ['colors', 'fonts', 'scale', 'hs', 'gap', 'headAlign', 'circleFit', 'circleSX', 'imgGap', 'stampTilt', 'stampSize', 'textShadow', 'imgShadow', 'colLine', 'bg', 'pattern', 'frame', 'tab', 'css'];
function themeLook(key) {
  const d = defaultState(), look = {};
  for (const k of LOOK_KEYS) look[k] = clone(d[k]);
  look.colors = { ...THEMES[key].colors };
  look.fonts = { ...THEMES[key].fonts };
  // テーマごとの初期設定（例: 報告書は付箋ヘッダーをオン）
  for (const [k, v] of Object.entries(THEMES[key].look || {})) look[k] = v && typeof v === 'object' ? { ...look[k], ...clone(v) } : v;
  return look;
}
const lookOf = s => JSON.stringify(LOOK_KEYS.map(k => s[k]));
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

/* ---------- CSS: 骨組み・スニペット ---------- */
$('#snippetSel').innerHTML += Object.entries(SNIPPETS).map(([group, list]) =>
  `<optgroup label="${esc(group)}">${Object.keys(list).map(k => `<option value="${esc(group + '|' + k)}">${esc(k)}</option>`).join('')}</optgroup>`).join('');
/* ---------- CSSエディター（CodeMirror） ---------- */
function cssHintWithValues(cm, opts) {
  const cur = cm.getCursor();
  const before = cm.getLine(cur.line).slice(0, cur.ch);
  const m = before.match(/([a-z-]+)\s*:\s*([^;{}:]*)$/i);
  if (m && VALUE_HINTS[m[1].toLowerCase()]) {
    const word = (m[2].match(/[\w#().,-]*$/) || [''])[0];
    const list = VALUE_HINTS[m[1].toLowerCase()].filter(v => v.toLowerCase().startsWith(word.toLowerCase()));
    if (list.length) return { list, from: CodeMirror.Pos(cur.line, cur.ch - word.length), to: cur };
  }
  return CodeMirror.hint.css(cm, opts);
}

let cssEditor = null;
if (window.CodeMirror) {
  cssEditor = CodeMirror.fromTextArea($('.css-area'), {
    mode: 'css', lineNumbers: true, lineWrapping: true, tabSize: 2, indentUnit: 2,
    autoCloseBrackets: true, matchBrackets: true,
    extraKeys: {
      'Ctrl-Space': 'autocomplete', 'Ctrl-/': 'toggleComment', 'Cmd-/': 'toggleComment',
    },
    hintOptions: { completeSingle: false, hint: cssHintWithValues },
  });
  cssEditor.on('change', (cm, ch) => {
    if (ch.origin === 'setValue') return;   // 外から入れた値（テーマ適用など）のときは何もしない
    state.css = cm.getValue();
    render(); save();
  });
  // 英字・ハイフン・コロンを打ったら候補を出す（例: text-a → text-align、: の後 → center など）
  cssEditor.on('inputRead', (cm, ch) => {
    if (ch.origin !== '+input' || cm.state.completionActive) return;
    if (/^[a-zA-Z\-:]$/.test(ch.text[0]) || (ch.text[0] === ' ' && /:\s$/.test(cm.getLine(ch.from.line).slice(0, ch.from.ch + 1)))) {
      cm.showHint({ completeSingle: false });
    }
  });
  // 色見本: #fff などの前に四角い見本を出し、クリックでカラーピッカー
  let swatchMarks = [], swatchTimer;
  const hex6 = h => h.length === 4 ? '#' + [...h.slice(1)].map(c => c + c).join('') : h.slice(0, 7);
  const refreshSwatches = () => {
    swatchMarks.forEach(m => m.clear()); swatchMarks = [];
    cssEditor.eachLine(line => {
      const n = line.lineNo(), re = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;
      let m;
      while ((m = re.exec(line.text))) {
        const from = { line: n, ch: m.index }, to = { line: n, ch: m.index + m[0].length };
        const range = cssEditor.markText(from, to, {});
        const sw = document.createElement('span');
        sw.className = 'cm-swatch'; sw.style.background = m[0]; sw.title = 'クリックで色を選ぶ';
        sw.onmousedown = ev => {
          ev.preventDefault();
          const picker = document.createElement('input');
          picker.type = 'color'; picker.value = hex6(m[0]);
          picker.style.cssText = 'position:fixed;left:-100px;top:0;opacity:0';
          document.body.appendChild(picker);
          picker.oninput = () => {
            const r = range.find(); if (!r) return;
            cssEditor.replaceRange(picker.value, r.from, r.to);
          };
          picker.onchange = () => picker.remove();
          picker.click();
        };
        swatchMarks.push(range, cssEditor.setBookmark(from, { widget: sw }));
      }
    });
  };
  cssEditor.on('changes', () => { clearTimeout(swatchTimer); swatchTimer = setTimeout(refreshSwatches, 200); });
  // タブを開いたときに表示を整える（非表示の間に作ると幅が0になるため）
  $$('.tabs button').forEach(b => b.addEventListener('click', () => { if (b.dataset.tab === 'css') setTimeout(() => { cssEditor.refresh(); refreshSwatches(); }, 0); }));
}

// inline=true: 改行を足さずカーソル位置にそのまま入れる（変数など）
function insertCss(text, inline = false) {
  if (cssEditor) {
    const cur = cssEditor.getCursor();
    const sep = !inline && cssEditor.getLine(cur.line).slice(0, cur.ch).length ? '\n' : '';
    const ins = sep + text + (inline ? '' : '\n');
    const start = cssEditor.indexFromPos(cur);
    cssEditor.replaceRange(ins, cur);
    cssEditor.setCursor(cssEditor.posFromIndex(start + ins.length));
    cssEditor.focus();
    return;
  }
  const ta = $('.css-area');
  const pos = ta.selectionStart ?? ta.value.length;
  const pre = ta.value.slice(0, pos), post = ta.value.slice(pos);
  const sep = !inline && pre && !pre.endsWith('\n') ? '\n' : '';
  const ins = sep + text + (inline ? '' : '\n');
  ta.value = pre + ins + post;
  ta.selectionStart = ta.selectionEnd = (pre + ins).length;
  ta.dispatchEvent(new Event('input', { bubbles: true }));
  ta.focus();
}
// CSS欄の一番最後に追加する（スニペット・骨組み・テーマの書き出し用。書きかけの指定の途中に割り込まないように）
function appendCss(text) {
  if (cssEditor) {
    const value = cssEditor.getValue();
    // 前の内容との間に空行を1つあける
    const sep = !value.trim() ? '' : value.endsWith('\n\n') ? '' : value.endsWith('\n') ? '\n' : '\n\n';
    const end = CodeMirror.Pos(cssEditor.lastLine());
    cssEditor.replaceRange(sep + text + '\n', { line: end.line, ch: cssEditor.getLine(end.line).length });
    const last = CodeMirror.Pos(cssEditor.lastLine());
    cssEditor.setCursor(last);
    cssEditor.scrollIntoView(last, 40);
    cssEditor.focus();
    return;
  }
  const ta = $('.css-area');
  const v = ta.value;
  ta.value = v + (!v.trim() ? '' : v.endsWith('\n\n') ? '' : v.endsWith('\n') ? '\n' : '\n\n') + text + '\n';
  ta.selectionStart = ta.selectionEnd = ta.value.length;
  ta.scrollTop = ta.scrollHeight;
  ta.dispatchEvent(new Event('input', { bubbles: true }));
  ta.focus();
}
$('#classRef').innerHTML = CLASS_REF.map(([group, rows], i) => `<details${i < 4 ? ' open' : ''}><summary>${esc(group)}</summary><table>${
  rows.map(([sel, desc]) => `<tr><td><code data-sel="${esc(sel)}">${esc(sel)}</code></td><td>${esc(desc)}</td></tr>`).join('')}</table></details>`).join('');
$('#classRef').addEventListener('click', e => {
  const c = e.target.closest('[data-sel]'); if (!c) return;
  const sel = c.dataset.sel;
  // 変数はカーソル位置に、クラスはスニペットと同じく一番最後に足す
  if (sel.startsWith('--')) { insertCss(`var(${sel})`, true); return; }
  // .theme-xxx や .tab-on は用紙(.sheet)自身につくクラスなので、間をあけずにつなげる
  appendCss(sel === '.sheet' || /^\.(theme-|tab-on)/.test(sel) ? `.sheet${sel === '.sheet' ? '' : sel} {  }` : `.sheet ${sel} {  }`);
  // カーソルを { } の中へ
  if (cssEditor) {
    const p = cssEditor.getValue().lastIndexOf('{  }', cssEditor.indexFromPos(cssEditor.getCursor())) + 2;
    cssEditor.setCursor(cssEditor.posFromIndex(p));
    return;
  }
  const ta = $('.css-area'), p = ta.value.lastIndexOf('{  }', ta.selectionStart) + 2;
  ta.selectionStart = ta.selectionEnd = p;
});

$('#snippetSel').onchange = e => {
  const v = e.target.value; e.target.value = '';
  if (!v) return;
  const [group, k] = v.split('|');
  appendCss(`/* ${k} */\n` + SNIPPETS[group][k]);
};
$('#btnSkeleton').onclick = () => {
  if (state.css.includes('===== 用紙 =====') && !confirm('骨組みはすでに入っているようです。もう一度挿入しますか？')) return;
  appendCss(SKELETON);
};

/* ---------- テーマのCSSを書き出す ---------- */
function themeCssText(key) {
  // 本体のスタイルは css/style.css（ファイル分割前は <style> だった）
  const main = [...document.styleSheets].find(s => s.href && /\/css\/style\.css(\?|$)/.test(s.href))
    || [...document.styleSheets].find(s => s.ownerNode && s.ownerNode.tagName === 'STYLE' && !s.ownerNode.id);
  if (!main) return '';
  let list;
  try { list = main.cssRules; } catch (e) { return ''; }   // file:// で開くとブラウザが読ませてくれないことがある
  const rules = [...list].filter(r => r instanceof CSSStyleRule);
  // 「a: b; c: d;」を1行1指定に整形
  const pretty = (sel, style) => `${sel} {\n${style.cssText.split(/;\s*(?![^(]*\))/).map(s => s.trim()).filter(Boolean).map(s => '  ' + s + ';').join('\n')}\n}`;
  // 白紙テーマの :where(.theme-blank) は、書き出すときは .sheet に置き換える
  const rename = sel => sel.replace(/:where\(\.theme-blank\)/g, '.sheet');
  const common = COMMON_EXPORT.map(sel => rules.find(r => r.selectorText === sel)).filter(Boolean)
    // 元と同じセレクタ（強さ）で書き出す。.sheet を付けて強くすると、スタンプの形などの指定を上書きして崩れるため
    .map(r => pretty(r.selectorText, r.style));
  const own = rules.filter(r => r.selectorText.includes(`.theme-${key}`))
    .map(r => pretty(rename(r.selectorText), r.style));
  const name = THEMES[key]?.name || key;
  return `/* ===== 共通（よく編集するところ） ===== */\n${common.join('\n')}\n\n/* ===== テーマ「${name}」 ===== */\n${own.join('\n')}\n`;
}
$('#btnExportThemeCss').onclick = () => {
  const name = THEMES[state.theme]?.name || state.theme;
  const mark = `/* ===== テーマ「${name}」 ===== */`;
  if (state.css.includes(mark) && !confirm(`テーマ「${name}」のCSSはすでに書き出してあるようです。もう一度書き出しますか？`)) return;
  const text = themeCssText(state.theme);
  if (!text) { alert('このブラウザではテーマのCSSを読み出せませんでした。\nパソコンに保存した index.html を直接開いている場合は、公開ページ（https://〜）から開くと書き出せます。'); return; }
  appendCss(`/* テーマ「${name}」のCSSを書き出したもの。数字や色を書き換えると反映されます。\n   消せばテーマ本来の見た目に戻ります */\n` + text);
};

/* ---------- 上部ボタン ---------- */
$('#btnPrint').onclick = () => window.print();
$('#btnNew').onclick = () => {
  if (!confirm('今の内容を消して新規作成しますか？（先に「ファイルに保存」しておくと安心です）')) return;
  state = defaultState(); buildFontOptions(); syncFields(); $('#itemList').innerHTML = ''; buildItems(); render(); save();
};
// 保存するファイルの名前（日付_イベント名）
const fileBaseName = () => 'お品書き_' + ([state.info.date, state.info.event].filter(Boolean).join('_').replace(/[\\/:*?"<>|\s]+/g, '-') || 'oshinagaki');
$('#btnExport').onclick = () => {
  const blob = new Blob([JSON.stringify(state)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = `${fileBaseName()}.json`; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};

// 画像に埋め込むWebフォントを用意する。全部埋め込むと数十MBになるので、
// お品書きで使っているフォントの、使っている文字が入っている部分（unicode-range）だけを取り込む
async function buildFontEmbedCss(node) {
  const cps = new Set([...(node.textContent || '')].map(c => c.codePointAt(0)));
  const fams = new Set();
  for (const el of [node, ...node.querySelectorAll('*')]) {
    for (const f of getComputedStyle(el).fontFamily.split(',')) fams.add(f.trim().replace(/^["']|["']$/g, ''));
  }
  const hits = range => range.split(',').some(part => {
    const m = part.trim().match(/^U\+([0-9A-F?]+)(?:-([0-9A-F]+))?$/i); if (!m) return true;
    const lo = parseInt(m[1].replace(/\?/g, '0'), 16), hi = m[2] ? parseInt(m[2], 16) : parseInt(m[1].replace(/\?/g, 'F'), 16);
    for (const c of cps) if (c >= lo && c <= hi) return true;
    return false;
  });
  const rules = [];
  for (const sheet of document.styleSheets) {
    let rs; try { rs = sheet.cssRules; } catch { continue; }   // 読めないシートは飛ばす
    for (const r of rs) if (r instanceof CSSFontFaceRule) rules.push(r);
  }
  const parts = await Promise.all(rules.map(async r => {
    const fam = r.style.getPropertyValue('font-family').replace(/["']/g, '').trim();
    if (!fams.has(fam)) return '';
    const ur = r.style.getPropertyValue('unicode-range');
    if (ur && !hits(ur)) return '';
    const m = r.style.getPropertyValue('src').match(/url\(["']?([^"')]+)["']?\)/); if (!m) return '';
    try {
      const abs = new URL(m[1], r.parentStyleSheet.href || location.href).href;
      const data = await readFile(await (await fetch(abs)).blob());
      return r.cssText.replace(m[0], `url(${data})`);
    } catch (e) { console.warn('font', e); return ''; }
  }));
  return parts.filter(Boolean).join('\n');
}

// 画像で保存（PNG / JPG）。A3 を 300dpi（3508×4961px、横向きなら縦横が逆）で書き出す
async function exportImage(type) {
  if (!window.htmlToImage) { alert('画像を作る部品を読み込めませんでした。インターネットにつながっているか確認してください。'); return; }
  const sh = $('#sheet');
  const status = $('#status'), before = status.textContent;
  status.textContent = '画像を作成中…（少し時間がかかります）';
  try {
    await document.fonts.ready;
    // Webフォントは使っている分だけ埋め込む。ファイルから読み込んだフォントはこちらで足す
    let fontCss = '';
    try { fontCss = await buildFontEmbedCss(sh); } catch (e) { console.warn(e); }
    fontCss += state.fileFonts.map(f => `@font-face{font-family:'${f.family.replace(/'/g, "\\'")}';src:url(${f.data});font-weight:100 900}`).join('\n');
    const opts = {
      pixelRatio: 300 / 96, fontEmbedCSS: fontCss,
      width: sh.offsetWidth, height: sh.offsetHeight,
      // プレビュー用の縮小・影を外して、用紙そのままの大きさで描く。
      // position は relative のまま（static にすると、背景の模様・枠などの重ねたレイヤーの位置の基準がなくなって消える）
      style: { transform: 'none', position: 'relative', left: '0', top: '0', margin: '0', boxShadow: 'none' },
    };
    // JPG は部品の backgroundColor を使うと用紙の背景色まで白で上書きされるので、
    // PNG と同じように描いてから、白い下地に重ねて JPG にする
    let url;
    if (type === 'png') url = await htmlToImage.toPng(sh, opts);
    else {
      const src = await htmlToImage.toCanvas(sh, opts);
      const c = document.createElement('canvas');
      c.width = src.width; c.height = src.height;
      const g = c.getContext('2d');
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, c.width, c.height);
      g.drawImage(src, 0, 0);
      url = c.toDataURL('image/jpeg', 0.92);
    }
    const a = document.createElement('a');
    a.href = url; a.download = `${fileBaseName()}.${type === 'png' ? 'png' : 'jpg'}`; a.click();
    status.textContent = '画像を保存しました';
  } catch (e) {
    console.error(e);
    status.textContent = before;
    alert('画像を作れませんでした: ' + (e.message || e));
  }
}
$('#imgExport').onchange = e => { const t = e.target.value; e.target.value = ''; if (t) exportImage(t); };
$('#fileImport').onchange = async e => {
  const f = e.target.files[0]; if (!f) return;
  try {
    const data = JSON.parse(await f.text());
    state = withDefaults({ ...defaultState(), ...data, items: (data.items || []).map(x => newItem(x)) });
    await registerFileFonts();
    buildFontOptions(); syncFields(); $('#itemList').innerHTML = ''; buildItems(); render(); save();
  } catch (err) { alert('読み込めませんでした: ' + err.message); }
  e.target.value = '';
};

/* ---------- 使い方・よくある質問 ---------- */


let guideLastStep = 0;
function openHelp(tab = 'guide') {
  $$('[data-help-tab]').forEach(b => b.classList.toggle('on', b.dataset.helpTab === tab));
  $('#helpTitle').textContent = tab === 'guide' ? '使い方' : 'よくある質問';
  $('#helpBody').innerHTML = tab === 'guide'
    ? `<p style="margin-top:0">次の順番で入力していくと良い感じです。「画面で見る」を押すと、その場所が光ります。</p>` +
      GUIDE_STEPS.map((s, i) => `<div class="guide-step" id="guide-step-${i}">
        <div class="guide-num">${i + 1}</div>
        <div><h3>${s.title}</h3>${s.body}
          <img class="guide-shot" src="${s.shot}" alt="" onerror="this.remove()">
          <button data-guide-show="${i}">画面で見る</button></div>
      </div>`).join('')
    : `<div class="faq">${FAQ.map(([h, qs]) => `<h4>${h}</h4>` + qs.map(([q, a]) => `<details><summary>${q}</summary><div>${a}</div></details>`).join('')).join('')}</div>`;
  $('#helpModal').classList.add('on');
  $('#guideToast').classList.remove('on');
  // 前回「画面で見る」を押した手順の位置から表示する（最初は一番上）
  const body = $('#helpBody');
  body.scrollTop = 0;
  const step = tab === 'guide' && guideLastStep > 0 && $(`#guide-step-${guideLastStep}`);
  if (step) body.scrollTop = step.getBoundingClientRect().top - body.getBoundingClientRect().top - 8;
}
function closeHelp() {
  $('#helpModal').classList.remove('on');
  try { localStorage.setItem('oshinagaki-guide-seen', '1'); } catch {}
}
function showGuideStep(i) {
  const s = GUIDE_STEPS[i];
  guideLastStep = i;
  closeHelp();
  if (s.tab) showTab(s.tab);
  const el = $(s.hl);
  if (el) {
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    el.classList.remove('guide-hl'); void el.offsetWidth; el.classList.add('guide-hl');
    setTimeout(() => el.classList.remove('guide-hl'), 3200);
  }
  $('#guideToastText').textContent = `${i + 1}. ${s.title}`;
  $('#guideToast').classList.add('on');
}
$('#btnHelp').onclick = () => openHelp('guide');
$('#helpClose').onclick = closeHelp;
$('#helpModal').addEventListener('click', e => {
  if (e.target.id === 'helpModal') closeHelp();                 // 外側の暗いところをクリックで閉じる
  const t = e.target.closest('[data-help-tab]'); if (t) openHelp(t.dataset.helpTab);
  const g = e.target.closest('[data-guide-show]'); if (g) showGuideStep(+g.dataset.guideShow);
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('#helpModal').classList.contains('on')) closeHelp(); });
$('#guideBack').onclick = () => openHelp('guide');

/* ---------- 起動 ---------- */
(async () => {
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
})();
