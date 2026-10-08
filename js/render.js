// 海星式お品書きメーカー: プレビューの用紙を描く（state → HTML）
// （読み込み順: data.js → core.js → state.js → render.js → layout.js → editor.js → items.js → themes.js → css-editor.js → io.js → help.js → templates.js → main.js）

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
  // バッジ1・バッジ2は、それぞれ画像に重ねるスタンプにできる（形・線・ギザギザは区画の見出しと同じクラス）
  const stampDiv = (n, text, pos, shape, ring, jag) =>
    `<div class="item-stamp item-stamp-${n} st-${pos} grp-auto grp-shape-${shape || 'circle'} grp-ring-${ring || 'single'}${jag ? ' grp-jag' : ''}"><span class="grp-badge">${esc(text)}</span></div>`;
  const stamp = it.badge1 && it.badgeMode === 'stamp' && hasImg;
  const stamp2 = it.badge2 && it.badge2Mode === 'stamp' && hasImg;
  if (stamp) imgExtra += stampDiv(1, it.badge1, it.stampPos || 'tl', it.stampShape, it.stampRing, it.stampJag);
  if (stamp2) imgExtra += stampDiv(2, it.badge2, it.stamp2Pos || 'br', it.stamp2Shape, it.stamp2Ring, it.stamp2Jag);
  const imgHTML = it.phOn
    ? `<div class="img"><div class="ph${it.phLine ? ' ph-line' : ''}" style="--ph-ar:${PH_RATIOS[it.phRatio]?.[1] || '148 / 210'};--ph-bg:${it.phBg};--ph-fg:${it.phFg}">${esc(it.phText)}</div>${imgExtra}</div>`
    : it.img ? `<div class="img"><img src="${urlFor(it.img)}" alt="">${imgExtra}</div>` : '';
  const isNum = /^[\d,.\s]+$/.test(it.price);
  const badges = [
    // badge-1 / badge-2 がいまの名前。new / free は昔の名前（前に書いたCSSも反映されるように残している）
    !stamp && it.badge1 && `<span class="badge badge-1 new">${esc(it.badge1)}</span>`,
    !stamp2 && it.badge2 && `<span class="badge badge-2 free">${esc(it.badge2)}</span>`,
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
  return `<article class="item pos-${pos}${hasImg ? '' : ' noimg'}${titleTop ? ' title-top' : ''}${fill ? ' img-fill' : ''}${it.pricePos === 'side' || it.pricePos === 'over' ? ' price-' + it.pricePos : ''}${cls}" data-id="${it.id}" data-n="${n}" data-badge="${esc(it.badge1)}" style="--span:${span};--imgw:${+it.imgW || 45}%;--img-al:${it.imgAlign || 'start'}">
    ${titleTop && headHTML ? `<div class="item-head">${headHTML}</div>` : ''}
    ${imgHTML}
    <div class="info">
      ${mainHTML ? `<div class="info-main">${mainHTML}</div>` : ''}
      ${it.price ?`<div class="price${isNum ? '' : ' text'}"><span class="num">${esc(it.price)}</span>${it.unit ? `<span class="unit">${esc(it.unit)}</span>` : ''}</div>` : ''}
    </div>
  </article>`;
}

// 「東7 B63b」のように空白で区切ったスペースは、最初の部分を .sh-space-pre で包む（CSSでそこだけ小さくできる）
function spaceHTML(v) {
  const m = v.match(/^(\S+)([ 　]+)([\s\S]+)$/);
  return m ? `<span class="sh-space-pre">${esc(m[1])}</span>${esc(m[2])}${esc(m[3])}` : esc(v);
}

// キャッチ。「形と色を選ぶ」のときは区画の見出しと同じ形のクラス（grp-shape-* など）を使う
function headlineHTML(s, text) {
  const h = s.hlStyle, free = s.headlinePos === 'free' ? ' hl-free' : '';
  if (h.mode !== 'custom') return `<div class="headline${free}">${esc(text)}</div>`;
  return `<div class="headline hl-custom grp-shape-${h.shape} grp-ring-${h.ring}${h.jag && h.shape !== 'none' ? ' grp-jag' : ''}${free}"><span class="grp-badge">${esc(text)}</span></div>`;
}

function render() {
  const s = state, i = s.info, sh = $('#sheet');
  ensureUsedFonts(s);
  const p = s.pattern, fr = s.frame, hasFrame = fr.type !== 'none' || fr.fill;
  sh.className = `sheet theme-${s.theme} ${s.orient}${hasFrame && fr.pad ? ' fr-pad' : ''}${s.tab.on ? ' tab-on' : ''}${s.tab.on && s.tab.topLine === false ? ' tab-notop' : ''}${s.textShadow.on ? ' ts-on' : ''}${s.lineDeco.mark !== 'none' ? ' ld-on' + (s.lineDeco.role === 'line' ? ' ld-line' : '') : ''}${s.circleAlign && s.circleAlign !== 'theme' ? ' ca-' + s.circleAlign : ''}${s.imgShadow.mode !== 'theme' ? ' is-' + s.imgShadow.mode : ''}`;
  const vars = {
    '--c-bg': s.colors.bg, '--c-paper': s.colors.paper, '--c-ink': s.colors.ink, '--c-accent': s.colors.accent, '--c-sub': s.colors.sub,
    '--f-head': fontStack(s.fonts.head, s.fonts.body), '--f-body': fontStack(s.fonts.body), '--f-num': fontStack(s.fonts.num, s.fonts.head, s.fonts.body),
    '--f-circle': s.fonts.circle ? fontStack(s.fonts.circle, s.fonts.head, s.fonts.body) : 'var(--f-head)',
    '--scale': s.scale, '--hs': s.hs, '--gap': s.gap, '--cols': s.cols, '--cols-tpl': colsTpl(s.colRatio, s.cols),
    '--bgimg': s.bg.img ? `url("${urlFor(s.bg.img)}")` : 'none', '--bg-op': s.bg.opacity, '--bg-tile': s.bg.tile,
    '--p-c': roleColor(p.role, p.color), '--p-s': p.size, '--p-w': p.weight, '--p-op': p.opacity,
    '--fr-c': fr.color, '--fr-w': fr.type === 'none' ? 0 : fr.width, '--fr-r': fr.radius,
    // 四隅それぞれのときは「左上 右上 右下 左下」。大きすぎる値はブラウザが辺の長さに収まるよう縮めるので、左上・右上を最大にすると半円（アーチ）になる
    '--fr-radius': fr.radiusEach ? [fr.rTL, fr.rTR, fr.rBR, fr.rBL].map(v => (+v || 0) + 'mm').join(' ') : (+fr.radius || 0) + 'mm', '--fr-inset': fr.inset,
    // 「内側にもう1本」の線の角の丸さ: 外の角の丸さから、外の線の外側→内側の線の外側までの距離を引く（中心をそろえて、線の間が角でも同じ幅になるように）
    '--fr-radius-in': (fr.radiusEach ? [fr.rTL, fr.rTR, fr.rBR, fr.rBL] : [fr.radius]).map(v => Math.max(0, (+v || 0) - (2.5 * (+fr.width || 0) + 1.5)) + 'mm').join(' '),
    '--fr-style': ['double', 'dashed', 'dotted'].includes(fr.type) ? fr.type : 'solid',
    '--fr-fill': fr.fill ? hexToRgba(fr.fillColor, fr.fillAlpha ?? 1) : 'transparent', '--fr-sh': fr.shadow, '--fr-top': fr.top || 0, '--fr-pad': fr.padding,
    '--title-k': s.titleK ?? 1, '--price-k': s.priceK ?? 1, '--text-k': s.textK ?? 1, '--grp-k': s.grpK ?? 1, '--circle-k': s.circleK ?? 1,
    '--hl-x': s.headlineX ?? 78, '--hl-y': s.headlineY ?? 8, '--hl-k': s.headlineK ?? 1,
    '--hl-bg': roleColor(s.hlStyle.bgRole, s.hlStyle.bg), '--hl-fg': roleColor(s.hlStyle.fgRole, s.hlStyle.fg), '--hl-tilt': s.hlStyle.tilt ?? 0,
    '--img-gap': s.imgGap ?? 6, '--stamp-tilt': s.stampTilt ?? -8, '--stamp-size': s.stampSize ?? 1,
    '--ts': shadowCss(s.textShadow), '--is': shadowCss(s.imgShadow),
    '--ld-mask': (LINE_MARKS[s.lineDeco.mark] || LINE_MARKS.none)[1] ? `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'>${LINE_MARKS[s.lineDeco.mark][1]}</svg>")` : 'none', '--ld-c': s.lineDeco.role === 'line' ? 'var(--line-c)' : `var(--c-${s.lineDeco.role || 'accent'})`, '--line-c': `var(--c-${s.lineRole || 'sub'})`,
    '--ld-size': s.lineDeco.size, '--ld-over': s.lineDeco.over,
    '--col-line-c': `var(--c-${s.colLine.role || 'ink'})`, '--col-line-w': s.colLine.width,
    '--tab-bg': roleColor(s.tab.bgRole, s.tab.bg), '--tab-fg': roleColor(s.tab.fgRole, s.tab.fg), '--tab-bw': s.tab.border, '--tab-bc': s.tab.borderColor, '--tab-pad': s.tab.pad,
  };
  const [sw, shh] = paperSize();
  vars['--sheet-w'] = sw; vars['--sheet-h'] = shh;
  for (const [k, v] of Object.entries(vars)) sh.style.setProperty(k, v);
  const f = (cls, v) => v ? `<div class="${cls}">${esc(v)}</div>` : '';
  const bgLayer = s.bg.img ? `<div class="bgimg fit-${s.bg.fit}"></div>` : '';
  const deco = '<div class="deco"></div>';
  // 重なり順: パターン → (背景画像:下) → テーマ装飾 → 枠 → (背景画像:上) → 飾り（スニペットで使う空のレイヤー） → 中身
  const pattern = p.type !== 'none' ? `<div class="pattern p-${p.type}"></div>` : '';
  const frame = hasFrame ? `<div class="frame f-${fr.type}"></div>` : '';
  const orn = ORNAMENT_LAYERS.map(n => `<div class="orn orn-${n}"></div>`).join('');
  sh.innerHTML = `${pattern}${s.bg.layer === 'back' ? bgLayer + deco + frame : deco + frame + bgLayer}${orn}
    <header class="sh"><div class="sh-box">${f('sh-date', i.date)}${i.eventLogo ? `<div class="sh-event sh-logo"><img src="${urlFor(i.eventLogo)}" alt="${esc(i.event)}"></div>` : f('sh-event', i.event)}${i.space ? `<div class="sh-space">${spaceHTML(i.space)}</div>` : ''}</div>${i.logo ? `<div class="sh-circle"><img src="${urlFor(i.logo)}" alt="${esc(i.circle)}"></div>` : i.circle ? `<div class="sh-circle"><span class="sh-circle-t">${esc(i.circle)}</span></div>` : ''}</header>
    ${i.headline ? headlineHTML(s, i.headline) : ''}
    <main class="items vfill-${s.vfill || 'start'}">${blocksHTML()}</main>
    ${i.notes ? `<footer class="notes">${esc(i.notes)}</footer>` : ''}`;
  // 印刷: 用紙の大きさを mm で指定し、A3 で作った用紙をその大きさに縮める
  const [, pw, ph] = PAPERS[s.paper] || PAPERS.A3, land = s.orient === 'landscape', k = paperScale();
  $('#pageCss').textContent = `@page{size:${land ? ph : pw}mm ${land ? pw : ph}mm;margin:0}` + (k < 1 ? `@media print{.scaler>.sheet{zoom:${k}}}` : '');
  $('#userCss').textContent = s.css;
  $$('[data-show]').forEach(el => { const v = +getPath(s, el.dataset.show); el.textContent = Math.abs(v) >= 10 || Number.isInteger(v) && el.dataset.show === 'stampTilt' ? Math.round(v) : v.toFixed(2).replace(/0$/, ''); });
  // チェックを入れていないなど、今は反映されない設定を薄く表示
  applyDeps($('[data-pane="design"]'), k => getPath(s, k));
  const th = $('#bgThumb');
  th.style.backgroundImage = s.bg.img ? `url("${urlFor(s.bg.img)}")` : '';
  th.textContent = s.bg.img ? '' : '画像なし';
  for (const [id, v] of [['#logoThumb', i.logo], ['#eventLogoThumb', i.eventLogo]]) {
    const t = $(id);
    t.style.backgroundImage = v ? `url("${urlFor(v)}")` : '';
    t.textContent = v ? '' : 'ロゴなし';
  }
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
