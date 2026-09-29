// 海星式お品書きメーカー: ファイルの保存・読み込み・印刷・画像で保存
// （読み込み順: data.js → core.js → state.js → render.js → layout.js → editor.js → items.js → themes.js → css-editor.js → io.js → help.js → main.js）

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

// Safari（iPhone・iPad・Mac）かどうか。iPad は「Mac の Safari」を名乗るので、タッチの有無でも見分ける
const IS_SAFARI = /^((?!chrome|android|crios|fxios|edg).)*safari/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
// Safari の canvas は面積の上限がある（約1677万ピクセル）。超えると真っ白になるので、その手前まで縮める
const SAFARI_MAX_AREA = 16777216;

// 画像で保存（PNG / JPG）。選んだ用紙サイズを 300dpi で書き出す（A3 なら 3508×4961px、横向きなら縦横が逆）
// type: png / jpg / png-clear（用紙の背景色だけを透明にした PNG。あとでペイントソフトで背景を描き足せるように）
async function exportImage(type) {
  if (!window.htmlToImage) { alert('画像を作る部品を読み込めませんでした。インターネットにつながっているか確認してください。'); return; }
  const sh = $('#sheet');
  const status = $('#status'), before = status.textContent;
  status.textContent = '画像を作成中…（少し時間がかかります）';
  const clear = type === 'png-clear';
  if (clear) sh.classList.add('export-clear');
  try {
    await document.fonts.ready;
    // Webフォントは使っている分だけ埋め込む。ファイルから読み込んだフォントはこちらで足す
    let fontCss = '';
    try { fontCss = await buildFontEmbedCss(sh); } catch (e) { console.warn(e); }
    fontCss += state.fileFonts.map(f => `@font-face{font-family:'${f.family.replace(/'/g, "\\'")}';src:url(${f.data});font-weight:100 900}`).join('\n');
    let pixelRatio = 300 / 96 * paperScale(), shrunk = false;
    if (IS_SAFARI && sh.offsetWidth * sh.offsetHeight * pixelRatio ** 2 > SAFARI_MAX_AREA) {
      pixelRatio = Math.sqrt(SAFARI_MAX_AREA / (sh.offsetWidth * sh.offsetHeight)) * 0.98; shrunk = true;
    }
    const opts = {
      pixelRatio, fontEmbedCSS: fontCss,
      width: sh.offsetWidth, height: sh.offsetHeight,
      // プレビュー用の縮小・影を外して、用紙そのままの大きさで描く。
      // position は relative のまま（static にすると、背景の模様・枠などの重ねたレイヤーの位置の基準がなくなって消える）
      style: { transform: 'none', position: 'relative', left: '0', top: '0', margin: '0', boxShadow: 'none' },
    };
    // Safari は1回目の描画で画像（表紙など）の読み込みが間に合わず抜けることがある。
    // 小さい倍率で2回描いて画像を読み込ませておいてから、本番を描く
    if (IS_SAFARI) for (let n = 0; n < 2; n++) await htmlToImage.toCanvas(sh, { ...opts, pixelRatio: 0.2 });
    // JPG は部品の backgroundColor を使うと用紙の背景色まで白で上書きされるので、
    // PNG と同じように描いてから、白い下地に重ねて JPG にする
    let url;
    if (type !== 'jpg') url = await htmlToImage.toPng(sh, opts);
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
    a.href = url; a.download = `${fileBaseName()}${clear ? '_背景なし' : ''}.${type === 'jpg' ? 'jpg' : 'png'}`; a.click();
    status.textContent = shrunk ? '画像を保存しました（Safari の上限に合わせて少し小さめ）' : '画像を保存しました';
  } catch (e) {
    console.error(e);
    status.textContent = before;
    alert('画像を作れませんでした: ' + (e.message || e));
  } finally {
    sh.classList.remove('export-clear');
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
