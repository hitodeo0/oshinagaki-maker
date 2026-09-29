// 海星式お品書きメーカー: 描いた後の自動調整（区切り線・値段・画像・ヘッダー・はみ出し・表示倍率）
// （読み込み順: data.js → core.js → state.js → render.js → layout.js → editor.js → items.js → themes.js → css-editor.js → io.js → help.js → main.js）

// 列の間の区切り線。列の境目（列と列のすき間の真ん中）に縦線を置く。
// 境目をまたぐブロック（横いっぱいの見出し・区画など）があるところは線を途切れさせる
function drawColLines() {
  const sh = $('#sheet');
  $$('.col-line, .line-mark', sh).forEach(e => e.remove());
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
      const over = (+state.lineDeco.over || 0) * MM, mark = (LINE_MARKS[state.lineDeco.mark] || LINE_MARKS.none)[1];
      // 境目の左右どちらにもブロックがある高さの範囲だけ線を引く
      // （横いっぱいのブロックの間のすき間だけに、ぽつんと短い線が出ないように）
      const side = kids.filter(c => c.offsetLeft + c.offsetWidth <= bx + 1 || c.offsetLeft >= bx - 1);
      for (const seg of segs) {
        const near = side.filter(c => c.offsetTop < seg[1] && c.offsetTop + c.offsetHeight > seg[0]);
        const hasL = near.some(c => c.offsetLeft < bx), hasR = near.some(c => c.offsetLeft > bx);
        if (!hasL || !hasR) { seg[1] = seg[0]; continue; }
        seg[0] = Math.max(seg[0], Math.min(...near.map(c => c.offsetTop)));
        seg[1] = Math.min(seg[1], Math.max(...near.map(c => c.offsetTop + c.offsetHeight)));
      }
      for (const [t0, b0] of segs) {
        if (b0 - t0 < 4) continue;
        const t = t0 - over, b = b0 + over;   // はみ出し: 両端を少し伸ばす
        const d = document.createElement('div');
        d.className = 'col-line';
        d.style.left = bx + 'px'; d.style.top = t + 'px'; d.style.height = (b - t) + 'px';
        l.appendChild(d);
        // 両端の飾り
        if (mark) for (const y of [t, b]) {
          const m = document.createElement('span');
          m.className = 'line-mark'; m.textContent = mark;
          m.style.left = bx + 'px'; m.style.top = y + 'px';
          l.appendChild(m);
        }
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
  const els = ['.sh-date', '.sh-event', '.sh-space'].map(s => $(s, sh)).filter(el => el && !el.querySelector('img'));
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
  Object.assign(circle.style, { fontSize: '', lineHeight: '', whiteSpace: '', height: '', position: '', top: '', right: '', left: '', display: '', width: '', textAlign: '', justifySelf: '', marginLeft: '', marginRight: '', flex: '' });
  if (img) img.style.height = '';
  if (t) Object.assign(t.style, { display: '', transform: '', transformOrigin: '', whiteSpace: '' });
  const target = state.circleFit ? fitCircleHeight(sh, circle, img) : null;
  squeezeCircle(circle, t);
  if (state.circlePos !== 'corner' && state.circleAlign && state.circleAlign !== 'theme') fitCircleToBlock(sh, circle);
  if (state.circlePos === 'corner') placeCircleCorner(sh, circle, img, t);
  else if (target != null) alignCircleBottom(sh, circle, img, t, target);
}

// サークル名の揃え（左・中央・右）を選んだとき: サークル名が日付〜スペースの塊の上か下に積まれているなら（額縁テーマなど）、
// サークル名の欄を塊と同じ幅・同じ左端にする → 左右の揃えが「塊から見て」になる。塊の横に並ぶテーマでは何もしない
function fitCircleToBlock(sh, circle) {
  const k = sh.getBoundingClientRect().width / sh.offsetWidth || 1;
  // 要素の箱ではなく、実際に文字（画像）がある範囲で測る（額縁のスペース番号の欄は横いっぱいに広がっているため）
  // 字間を広げた行は、最後の文字の後ろにも字間の分の空きがつくので、その分を除く
  const extent = el => {
    const r = document.createRange(); r.selectNodeContents(el); const b = r.getBoundingClientRect();
    const ls = parseFloat(getComputedStyle(el).letterSpacing) || 0;
    return { left: b.left, right: b.right - Math.max(0, ls) * k };
  };
  const rs = ['.sh-date', '.sh-event', '.sh-space'].map(s => $(s, sh)).filter(Boolean).map(extent);
  if (!rs.length) return;
  const left = Math.min(...rs.map(r => r.left)), right = Math.max(...rs.map(r => r.right));
  const cr = circle.getBoundingClientRect();
  if (!(cr.left <= left + 2 && cr.right >= right - 2)) return;   // 塊の横に並んでいる
  // 幅は「元の幅 − 左右の余白」にして、元どおり1行を占める（前の行に入り込まない）ようにする
  const ml = (left - cr.left) / k, mr = (cr.right - right) / k;
  Object.assign(circle.style, { width: `calc(${cr.width / k}px - ${ml + mr}px)`, marginLeft: ml + 'px', marginRight: mr + 'px', flex: 'none' });
}

// 用紙の右上に置く: ヘッダーの並びから外し（absolute）、文字のインクの上端・右端を用紙の端から決めた距離に合わせる
function placeCircleCorner(sh, circle, img, t) {
  const head = $('.sh', sh);
  const k = sh.getBoundingClientRect().height / sh.offsetHeight || 1;
  Object.assign(circle.style, { position: 'absolute', top: '0px', right: '0px', left: 'auto', marginLeft: '0', marginRight: '0', flex: 'none', whiteSpace: 'nowrap', textAlign: 'right' });
  const textEl = t && t.style.display === 'inline-block' ? t : circle;
  const sr = sh.getBoundingClientRect(), cr = circle.getBoundingClientRect();
  const inkTop = img ? img.getBoundingClientRect().top / k : textEl.getBoundingClientRect().top / k + inkBox(textEl).top;
  circle.style.top = (sr.top / k + (+state.circleTop || 0) * MM - inkTop) + 'px';
  // 右端: 今の右端から、用紙の右端 − 距離 まで動かす
  circle.style.right = (cr.right - sr.right) / k + (+state.circleRight || 0) * MM + 'px';
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
  const k = z === 'fit' ? Math.min(aw / w, ah / h) : z === 'width' ? aw / w : +z * paperScale();   // 100% = 実際の用紙の大きさ
  sh.style.transform = `scale(${k})`;
  sc.style.width = w * k + 'px';
  sc.style.height = h * k + 'px';
}
new ResizeObserver(() => { fit(); checkOverflow(); }).observe($('#stage'));
$('#zoomSel').addEventListener('change', () => { fit(); checkOverflow(); });
