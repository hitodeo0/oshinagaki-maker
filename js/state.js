// 海星式お品書きメーカー: お品書きのデータ（初期値・古いデータの補完・テーマの初期状態・配色）
// （読み込み順: data.js → core.js → state.js → render.js → layout.js → editor.js → items.js → themes.js → css-editor.js → io.js → help.js → main.js）

// type: item=頒布物 / sec=見出し / txt=テキスト / hr=区切り線 / grp=区画 / end=区画おわり
const newItem = (o = {}) => ({ id: uid(), type:'item', cls:'', text:'', title:'',
  sub:'', badgeStyle:'tag', badgePos:'top', badgeBg:'#1f2440', badgeFg:'#ffffff', badgeAuto:false, line:'none', gcols:1, gratio:'',  // 区画用（badgeAuto: 見出しの色をテーマに合わせる。昔のデータは false のまま）
  badge1:'', r18:false, badge2:'', spec:'', cp:'', desc:'', note:'', price:'', unit:'円', img:'', span:1, imgPos:'left', imgAlign:'start', imgW:45, imgFill:false, titlePos:'info', pricePos:'bottom',
  badgeMode:'text', stampPos:'tl', stampShape:'circle', stampRing:'single', stampJag:false,   // バッジ1をスタンプにするとき
  badge2Mode:'text', stamp2Pos:'br', stamp2Shape:'circle', stamp2Ring:'single', stamp2Jag:false,   // バッジ2をスタンプにするとき
  phOn:false, phRatio:'a5', phText:'表紙まだ', phBg:'#dddddd', phFg:'#555555', phLine:false,   // 仮の画像
  ...o });

function defaultState() {
  return {
    v: 1, theme: 'blank', paper: 'A3', orient: 'portrait', cols: 2, colRatio: '', vfill: 'start', scale: 1.25, hs: 0.9, gap: 1,   /* A3に貼って離れて読むので、文字は大きめが初期値 */
    headAlign: 'none', circleFit: false, circleSX: 100,
    circlePos: 'box', circleTop: 5, circleRight: 12,
    headlinePos: 'theme', headlineX: 78, headlineY: 8, headlineK: 1,   // headlineK: キャッチの大きさ（倍）
    // キャッチの見た目（theme: テーマのまま / custom: 形・色・傾きを選ぶ。形・線・ギザギザは区画の見出しと同じクラスを使う）
    hlStyle: { mode:'theme', shape:'rect', ring:'none', jag:false, bgRole:'ink', fgRole:'bg', bg:'#111111', fg:'#ffffff', tilt:-4 },   // キャッチの位置（theme: テーマのまま / free: 用紙の左上から % で、キャッチの真ん中の位置）   // サークル名の位置（box: 日付〜スペースの塊とそろえる / corner: 用紙の右上。距離は用紙の端から mm）
    imgGap: 6, stampTilt: -8, stampSize: 1,   // 画像と文字の間(mm)・スタンプの傾き(度)・大きさ(倍)
    titleK: 1, priceK: 1, textK: 1, grpK: 1, circleK: 1,   // 文字ごとの大きさ（倍）: タイトル・値段・詳細〜説明文・区画の見出し・サークル名
    colLine: { on:false, width:0.4, role:'ink', inner:true },   // 列の間の区切り線（太さmm・色はデザインの色の役割・区画の中にも引くか）
    lineDeco: { mark:'none', role:'accent', size:6, over:0 },   // 列の区切り線・区切り線ブロックの両端の飾り（大きさ・はみ出しは mm）
    // 影（ずれ・ぼかしは mm、濃さは 0〜1）。画像の影 mode: theme=テーマのまま / none=なし / custom=自分で決める
    textShadow: { on:false, x:0.3, y:0.3, blur:0.8, color:'#000000', alpha:0.35 },
    imgShadow: { mode:'theme', x:1.5, y:1.5, blur:3, color:'#000000', alpha:0.4 },
    colors: { ...THEMES.blank.colors }, fonts: { ...THEMES.blank.fonts },
    bg: { img:'', fit:'cover', layer:'front', opacity:1, tile:60 },
    // 模様の色・付箋の色は role でデザインの色（sub / ink / paper / accent / bg）に合わせる。custom のときだけ color / bg / fg を使う
    pattern: { type:'none', role:'sub', color:'#c8c8c8', size:10, weight:0.3, opacity:1 },
    // 付箋ヘッダー（日付・イベント名・スペースを色つきの箱にして、用紙の端まで伸ばす）
    tab: { on:false, bgRole:'ink', fgRole:'bg', bg:'#1136e8', fg:'#fff200', border:0, borderColor:'#111111', topLine:false,shape:'straight', size:3, toTop:true, toLeft:false, pad:5 },
    // 角の丸さ: radiusEach がオンなら rTL / rTR / rBR / rBL（左上・右上・右下・左下）をそれぞれ使う
    frame: { type:'none', color:'#111111', width:1, radius:8, radiusEach:false, rTL:8, rTR:8, rBR:8, rBL:8, inset:10, top:0, fill:false, fillColor:'#ffffff', fillAlpha:1,shadow:0, pad:true, padding:10 },
    fileFonts: [],   // [{ family, file, data(dataURL) }]
    userFonts: [],   // PCにインストール済みのフォント名
    info: { event:'イベント名', eventLogo:'', date:'2026/10/01', circle:'サークル名', logo:'', space:'A01', headline:'', notes:'' },
    items: [
      newItem({ type:'grp', text:'新刊', span:99, gcols:1, badgeAuto:true }),
      newItem({ title:'サンプル新刊', phOn:true, badge1:'新刊', r18:true, spec:'A5 / 34P', cp:'○○ × △△', desc:'ここに本の説明を書きます。\n改行もそのまま反映されます。', note:'※年齢確認のため、身分証の提示をお願いします。', price:'500', span:2 }),
      newItem({ type:'grp', text:'既刊', span:99, gcols:2, line:'top', badgeAuto:true }),
      newItem({ title:'ステッカー', badge1:'既刊', spec:'45mm × 65mm / 2枚セット', price:'400', imgPos:'top', imgW:70 }),
      newItem({ title:'ポストカード', spec:'配布は無くなり次第終了', price:'無料配布', unit:'' }),
    ],
    css: DEFAULT_CSS,
  };
}
let state = defaultState();

// 影の設定 → 「横 縦 ぼかし 色」（text-shadow と drop-shadow の両方でそのまま使える形）
const shadowCss = sd => `${+sd.x || 0}mm ${+sd.y || 0}mm ${Math.max(0, +sd.blur || 0)}mm ${hexToRgba(sd.color || '#000000', sd.alpha ?? 0.4)}`;
// 影の「ぼかし影にする」「くっきり影にする」ボタンの値（昔の保存データの 'soft' / 'hard' の読み替えにも使う）
const SHADOW_PRESETS = {
  textShadow: { soft: { on:true, x:0, y:0.4, blur:1.5, alpha:0.35 }, hard: { on:true, x:0.5, y:0.5, blur:0, alpha:0.3 } },
  imgShadow:  { soft: { mode:'custom', x:0, y:1.5, blur:3, alpha:0.4 }, hard: { mode:'custom', x:2, y:2, blur:0, alpha:1 } },
};

// 古い保存データに無い項目を既定値で補う
const NESTED_KEYS = ['info', 'bg', 'pattern', 'frame', 'tab', 'textShadow', 'imgShadow', 'colLine', 'lineDeco', 'hlStyle'];   // 中身ごと補う項目
function withDefaults(s) {
  const d = defaultState();
  // 影は昔は 'soft' などの文字で保存していた
  const IS = { ...SHADOW_PRESETS.imgShadow, none: { mode:'none' }, theme: { mode:'theme' } };
  if (typeof s.textShadow === 'string') s.textShadow = SHADOW_PRESETS.textShadow[s.textShadow] || {};
  if (typeof s.imgShadow === 'string') s.imgShadow = IS[s.imgShadow] || {};
  // 模様・付箋の色は昔は色そのものだけ → 5色のどれかと同じならその役割、違えば「自分で決める」
  const roleOf = c => ['sub', 'ink', 'paper', 'accent', 'bg'].find(r => s.colors && (s.colors[r] || '').toLowerCase() === (c || '').toLowerCase()) || 'custom';
  if (s.pattern && !s.pattern.role) s.pattern.role = roleOf(s.pattern.color);
  if (s.tab && !s.tab.bgRole) { s.tab.bgRole = roleOf(s.tab.bg); s.tab.fgRole = roleOf(s.tab.fg); }
  for (const k of NESTED_KEYS) s[k] = { ...d[k], ...s[k] };
  return s;
}

// 色の役割 → CSSの色（「自分で決める」なら指定した色）
const roleColor = (role, color) => role && role !== 'custom' ? `var(--c-${role})` : color;

// 画面で作る用紙の大きさ(mm)。短い辺は A3 と同じ 297mm、長い辺は用紙の縦横比どおり
function paperSize() {
  const [, w, h] = PAPERS[state.paper] || PAPERS.A3;
  const long = Math.round(297 * h / w * 100) / 100;
  return state.orient === 'landscape' ? [long, 297] : [297, long];
}
// 実際の用紙に対する縮小率（A3 なら 1）。端数で2ページ目ができないよう、A3 以外はほんの少しだけ小さく
function paperScale() {
  const [, w] = PAPERS[state.paper] || PAPERS.A3;
  return w === 297 ? 1 : w / 297 * 0.999;
}

// テーマの初期状態の「見た目」。用紙の向き・列数・列の比率・余白の使い方は中身の並びに関わるので含めない
// （用紙サイズはテーマでもマイテーマでも変えない）
const LOOK_KEYS = ['colors', 'fonts', 'scale', 'hs', 'gap', 'headAlign', 'circleFit', 'circleSX', 'circlePos', 'circleTop', 'circleRight', 'headlinePos', 'headlineX', 'headlineY', 'headlineK', 'hlStyle', 'imgGap', 'stampTilt', 'stampSize', 'titleK', 'priceK', 'textK', 'grpK', 'circleK', 'textShadow', 'imgShadow', 'colLine', 'lineDeco', 'bg', 'pattern', 'frame', 'tab', 'css'];
// マイテーマに保存・適用する項目 = 見た目 ＋ テーマ・並び方（お品書きの中身には触らない）
const DESIGN_KEYS = ['theme', 'orient', 'cols', 'colRatio', 'vfill', ...LOOK_KEYS];
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
