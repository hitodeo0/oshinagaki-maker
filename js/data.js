// 海星式お品書きメーカー: テーマ・配色・スニペット・使い方などのデータ（app.js より先に読み込む）
// 初期状態でCSS欄に入れておくもの
const DEFAULT_CSS = `/* 「新刊」区画の中を全部大きく（区画の見出しが「新刊」のもの。NEW にしているなら "NEW" に書き換え） */
.sheet .grp[data-label="新刊"] { font-size: 1.3em; }
`;
const THEMES = {
  blank:  { name: '白紙', desc: '飾りなし。ここから自由に作る',                 colors: { bg:'#ffffff', paper:'#f0f0f0', ink:'#111111', accent:'#d7262f', sub:'#bbbbbb' }, fonts: { head:'Noto Sans JP', body:'Noto Sans JP', num:'Noto Sans JP' } },
  grid:   { name: '方眼', desc: '方眼の背景＋上に濃い色の帯', colors: { bg:'#e6e1dc', paper:'#4a3236', ink:'#4a3236', accent:'#e8562a', sub:'#8e9179' }, fonts: { head:'Dela Gothic One', body:'M PLUS 1p', num:'Dela Gothic One' },
            look: { hs: 0.85 } },
  band:   { name: '格子', desc: 'ひし形格子の背景＋上に色の帯', colors: { bg:'#e3e0df', paper:'#6f6364', ink:'#5e5354', accent:'#d7262f', sub:'#c9c2c1' }, fonts: { head:'Zen Maru Gothic', body:'Zen Maru Gothic', num:'Zen Maru Gothic' },
            look: { hs: 0.9, pattern: { type:'diamonddot', color:'#c9c2c1', size:26, weight:0.5, opacity:1 } } },
  frame:  { name: '額縁', desc: '二重の枠＋大きなスペース番号',                 colors: { bg:'#7ea2b7', paper:'#ece6d8', ink:'#1f2440', accent:'#d23a3a', sub:'#9dbbcc' }, fonts: { head:'Zen Kaku Gothic New', body:'Zen Kaku Gothic New', num:'Noto Sans JP' },
            look: { scale: 1.15, hs: 0.7 } },
  pop:    { name: 'ストライプ', desc: '斜めストライプの背景＋角丸カード',  colors: { bg:'#f39321', paper:'#e8e9ea', ink:'#222222', accent:'#d7262f', sub:'#d9601f' }, fonts: { head:'Dela Gothic One', body:'M PLUS Rounded 1c', num:'Zen Kaku Gothic New' },
            look: { scale: 1.1, hs: 0.55, pattern: { type:'diag', color:'#d9601f', size:60, weight:7, opacity:1 } } },   // スペース番号がとても大きいテーマなので、ヘッダーは小さめから
  tag:    { name: '付箋', desc: '付箋ヘッダー＋ギザギザの値札', colors: { bg:'#bfe3f5', paper:'#1136e8', ink:'#14163a', accent:'#ea5230', sub:'#e3f4fc' }, fonts: { head:'Noto Sans JP', body:'Noto Sans JP', num:'Zen Kaku Gothic New' },
            look: { scale: 1.15, hs: 0.85, headAlign: 'max', circleFit: true, circleSX: 85,
                    pattern: { type:'grid', color:'#e3f4fc', size:24, weight:1.6, opacity:1 },
                    frame: { type:'solid', color:'#1136e8', width:1.4, radius:12, inset:9, fill:true, fillColor:'#ffffff', fillAlpha:0.7, shadow:0, pad:true, padding:8 },
                    tab: { on:true, bg:'#1136e8', fg:'#fff200', border:0, borderColor:'#1136e8', topLine:false, shape:'straight', size:3, toTop:true, toLeft:false, pad:5 } } },
  report: { name: '報告書', desc: '書類風。色の箱＋ラベル付きの値札',               colors: { bg:'#fbf7f1', paper:'#ffffff', ink:'#111111', accent:'#ea5230', sub:'#1136e8' }, fonts: { head:'Zen Old Mincho', body:'Zen Kaku Gothic New', num:'Oswald' },
            // テーマの初期状態で変えたい見た目（themeLook で既定値に上書きされる）。報告書は付箋ヘッダー（白地・黒枠）
            look: { scale: 1.1, hs: 0.8, headAlign: 'max', tab: { on:true, bg:'#ffffff',   /* 色の箱の余白がある分、文字は少し小さめ */ fg:'#111111', border:0.5, borderColor:'#111111', topLine:false, shape:'straight', toTop:true, toLeft:false, pad:5 } } },
};
// 配色（色の役割: bg 背景 / paper 面・帯 / ink 文字 / accent アクセント / sub 模様・線）
// 各テーマの色 + よくある組み合わせ
const PALETTES = [
  ...Object.entries(THEMES).map(([k, t]) => ({ name: t.name.replace(/（.*）/, ''), colors: t.colors })),
  { name: 'ラベンダー',         colors: { bg:'#8e8ae8', paper:'#a35cc0', ink:'#f4f2ff', accent:'#e0303a', sub:'#a7a4f0' } },
  { name: 'ネイビー×ゴールド', colors: { bg:'#1f2356', paper:'#c9973f', ink:'#f5ecd9', accent:'#e0303a', sub:'#c9973f' } },
  { name: 'ピンク×ホワイト',   colors: { bg:'#e85a9c', paper:'#ffffff', ink:'#222222', accent:'#d7262f', sub:'#f6a3c9' } },
  { name: 'クリーム×ブルー',   colors: { bg:'#f7f3ea', paper:'#1136e8', ink:'#14163a', accent:'#ea5230', sub:'#fff200' } },
  { name: 'ミント',             colors: { bg:'#dff3ea', paper:'#2f7d6d', ink:'#1f3d36', accent:'#e0503a', sub:'#a9dccb' } },
  { name: 'モノクロ',           colors: { bg:'#ffffff', paper:'#111111', ink:'#111111', accent:'#d7262f', sub:'#cccccc' } },
];
// 背景パターン: [表示名, おすすめの大きさmm, 太さmm]
const PATTERNS = {
  none:       ['なし', 10, 0.3],
  grid:       ['方眼', 10, 0.3],
  dots:       ['ドット', 8, 1],
  dots2:      ['千鳥ドット', 10, 1.2],
  diamond:    ['ひし形格子', 20, 0.5],
  diamonddot: ['ひし形格子＋交点ドット', 28, 0.4],
  diag:       ['斜めストライプ', 30, 6],
  hstripe:    ['横ボーダー', 10, 3],
  vstripe:    ['縦ストライプ', 10, 3],
  check:      ['市松', 20, 1],
  gingham:    ['ギンガムチェック', 16, 1],
  burst:      ['集中線（放射）', 20, 1],
};
const FONTS = ['Noto Sans JP','Zen Kaku Gothic New','M PLUS 1p','M PLUS Rounded 1c','Zen Maru Gothic','Dela Gothic One','Zen Old Mincho','Shippori Mincho B1','DotGothic16','Oswald','Bebas Neue'];
// 仮の画像の縦横比: キー → [表示名, aspect-ratio]
const PH_RATIOS = {
  a5:  ['A5 縦', '148 / 210'], b5:  ['B5 縦', '182 / 257'],
  a5l: ['A5 横', '210 / 148'], b5l: ['B5 横', '257 / 182'],
  sq:  ['正方形', '1 / 1'],
};
// 区画の見出しの形。以前の「見出しの形」(badgeStyle) で保存したデータは、同じ見た目になる組み合わせに読み替える
const LEGACY_SHAPE = { label: ['none', 'none', false], tag: ['rect', 'none', false], burst: ['rect', 'none', true], stamp: ['circle', 'single', false] };
const SKELETON = `/* ===== 用紙 ===== */
.sheet { padding: 15mm; }

/* ===== ヘッダー =====
   並びは grid-template-areas で自由に変えられます（名前: date / event / space / circle） */
.sheet .sh {
  grid-template-columns: 1fr auto;
  grid-template-areas:
    "date  circle"
    "event circle"
    "space circle";
}
.sheet .sh-date {}
.sheet .sh-event {}
.sheet .sh-space {}
.sheet .sh-circle {}
.sheet .headline {}

/* ===== 商品一覧（grid） ===== */
.sheet .items {}
.sheet .item {}
.sheet .item .img img {}
.sheet .badge.new {}
.sheet .badge.r18 {}
.sheet .title {}
.sheet .spec {}
.sheet .cp {}
.sheet .desc {}
.sheet .note {}
.sheet .price {}
.sheet .price .unit {}

/* ===== 区画（新刊・既刊ブロック） ===== */
.sheet .grp {}
.sheet .grp-badge {}
.sheet .grp-sub {}
.sheet .grp-items {}

/* ===== 見出し・テキスト・区切り線 ===== */
.sheet .blk-sec {}
.sheet .blk-txt {}
.sheet .blk-hr {}

/* ===== 個別指定 =====
   n番目のブロック: .sheet [data-n="1"]
   クラス名欄に big と書いたブロック: .sheet .big */

.sheet .notes {}
`;
// グループ名 → { 表示名: CSS }
const SNIPPETS = {
  '用紙・レイアウト': {
    '用紙の余白を変える': `.sheet { padding: 20mm; } /* 枠を使っているときは「中身を枠の内側に収める」をオフに */`,
    '横に並んだ頒布物を縦方向に中央揃え': `.sheet .items, .sheet .grp-items { align-items: center; }`,
    '横に並んだ頒布物の高さを揃えない（上詰め）': `.sheet .items, .sheet .grp-items { align-items: start; }`,
  },
  '区画': {
    '「新刊」区画の中を全部大きく': `/* 区画の見出しが「新刊」のもの。NEW にしているなら "NEW" に書き換え */
.sheet .grp[data-label="新刊"] { font-size: 1.3em; }`,
    '「既刊」区画の中を小さめに': `.sheet .grp[data-label="既刊"] { font-size: .85em; }`,
    '区画の見出しを大きく': `.sheet .grp-badge { font-size: 3em; }`,
    '区画のサブ文字（残部少！など）を大きく': `.sheet .grp-sub { font-size: 2.4em; }`,
  },
  'ヘッダー': {
    'サークル名だけ大きく': `.sheet .sh-circle { font-size: 4em; } /* ロゴ画像なら .sheet .sh-circle img { height: 30mm; } */`,
    'ヘッダーを帯にする': `.sheet .sh { background: var(--c-paper); margin: -15mm -15mm 10mm; padding: 8mm 15mm; border: 0; }`,
    'ヘッダー下の線を消す': `.sheet .sh { border-bottom: 0; }`,
    'スペース番号を白抜き文字に': `.sheet .sh-space { color: transparent; -webkit-text-stroke: .6mm var(--c-ink); }`,
  },
  '頒布物：大きさ（新刊・big など）': {
    'クラス名 big の頒布物を全体的に大きく': `/* 頒布物のクラス名欄に big と書く。数字を変えると倍率が変わる */
.sheet .big { font-size: 1.4em; }`,
    'クラス名 big の頒布物のタイトルだけ大きく': `.sheet .big .title { font-size: 3.5em; }`,
    'クラス名 big の頒布物の価格だけ大きく': `.sheet .big .price { font-size: 6em; }`,
    'big 以外を小さめに': `.sheet .item:not(.big) { font-size: .85em; }`,
    '「新刊」バッジの頒布物を大きく': `/* 頒布物のバッジ欄が「新刊」のもの */
.sheet .item[data-badge="新刊"] { font-size: 1.4em; }`,
    '「既刊」バッジの頒布物を小さめに': `.sheet .item[data-badge="既刊"] { font-size: .85em; }`,
    '1番目のブロックだけ大きく': `/* 編集欄の #番号 で指定 */
.sheet [data-n="1"] { font-size: 1.4em; }`,
  },
  '頒布物：タイトル・文字': {
    'タイトルを色の箱に（報告書風）': `.sheet .title { background: var(--c-accent); color: #fff; padding: .3em .5em; }`,
    'タイトルを「」で囲む': `.sheet .title::before { content: "「"; }
.sheet .title::after { content: "」"; }`,
    'タイトルに下線': `.sheet .title { border-bottom: .6mm solid currentColor; padding-bottom: .1em; }`,
    'タイトルを右寄せに（一番上に置いたとき）': `.sheet .item-head { text-align: right; align-items: flex-end; }`,
    '説明文を細字に': `.sheet .desc { font-weight: 400; }`,
  },
  '頒布物：価格': {
    '価格を詳細のすぐ下に（下揃えにしない）': `.sheet .price { margin-top: 0; }`,
    '価格をギザギザ枠に（黄色）': `.sheet .price {
  background: #fff200; padding: .25em .5em;
  --z: .15em; /* ギザギザの大きさ */
  mask:
    conic-gradient(from 135deg at top, #0000, #000 1deg 89deg, #0000 90deg) top / calc(2 * var(--z)) 51% repeat-x,
    conic-gradient(from -45deg at bottom, #0000, #000 1deg 89deg, #0000 90deg) bottom / calc(2 * var(--z)) 51% repeat-x;
}`,
    '価格に蛍光ペン線': `.sheet .price { background: linear-gradient(transparent 55%, #b8f0b0 55%); padding: 0 .15em; }`,
    '価格を枠で囲む': `.sheet .price { border: .5mm solid currentColor; padding: .05em .3em; }`,
    '価格を左寄せに': `.sheet .price { align-self: flex-start; }`,
  },
  '頒布物：バッジ': {
    'NEWバッジを星型に': `.sheet .badge.new { clip-path: var(--burst); border: 0; padding: 1em 1.2em; background: #1136e8; color: #fff200; font-size: 1.6em; }`,
    'NEWバッジを丸スタンプに': `.sheet .badge.new { border-radius: 999px; background: none; color: var(--c-ink); border: .25em double var(--c-ink); padding: .4em .9em; font-size: 1.2em; }`,
    'R-18を赤文字だけに': `.sheet .badge.r18 { background: none; border: 0; padding: 0; color: var(--c-accent); }`,
  },
  '頒布物：画像': {
    '画像にずらし影（透過画像は形に沿う）': `.sheet .img img { filter: drop-shadow(2mm 2mm 0 var(--c-ink)); }`,
    '透過画像のふちどり（白）': `/* 透過PNGのキャラの形に沿って白いふちをつける。太さは .6mm を変える */
.sheet .img img {
  filter:
    drop-shadow(.6mm 0 0 #fff) drop-shadow(-.6mm 0 0 #fff)
    drop-shadow(0 .6mm 0 #fff) drop-shadow(0 -.6mm 0 #fff);
}`,
    '画像に枠線（四角）': `.sheet .img img { outline: .5mm solid var(--c-ink); }`,
    '画像を少し傾ける': `.sheet .img img { rotate: -3deg; }`,
  },
  'その他（見出し・テキストブロック）': {
    '見出しブロックを縦書きに': `.sheet .blk-sec { writing-mode: vertical-rl; }`,
    '見出しブロックに下線': `.sheet .blk-sec { border-bottom: .5mm solid currentColor; padding-bottom: .1em; }`,
    'テキストブロックを斜体・色つきに（残部少！など）': `.sheet .blk-txt { font-style: italic; color: var(--c-accent); font-size: 1.6em; }`,
  },
};
// よく使うプロパティは、値の候補をそのプロパティ用に絞る（例: text-align: → left / center / right …）
const VALUE_HINTS = {
  'text-align': ['left', 'center', 'right', 'justify'],
  'text-align-last': ['left', 'center', 'right', 'justify'],
  'align-items': ['start', 'center', 'end', 'stretch', 'baseline'],
  'align-self': ['start', 'center', 'end', 'stretch', 'flex-start', 'flex-end'],
  'align-content': ['start', 'center', 'end', 'space-between', 'space-evenly', 'stretch'],
  'justify-content': ['start', 'center', 'end', 'space-between', 'space-evenly'],
  'justify-self': ['start', 'center', 'end', 'stretch'],
  'justify-items': ['start', 'center', 'end', 'stretch'],
  'display': ['none', 'block', 'inline-block', 'flex', 'grid', 'contents'],
  'flex-direction': ['row', 'column', 'row-reverse', 'column-reverse'],
  'position': ['relative', 'absolute', 'static'],
  'font-weight': ['400', '700', '900', 'normal', 'bold'],
  'font-style': ['normal', 'italic'],
  'font-family': ['var(--f-head)', 'var(--f-body)', 'var(--f-num)'],
  'writing-mode': ['vertical-rl', 'horizontal-tb'],
  'white-space': ['normal', 'nowrap', 'pre-wrap'],
  'text-decoration': ['none', 'underline', 'line-through'],
  'border-style': ['solid', 'dashed', 'dotted', 'double', 'none'],
  'object-fit': ['contain', 'cover'],
  'overflow': ['visible', 'hidden'],
  'visibility': ['visible', 'hidden'],
  'color': ['var(--c-ink)', 'var(--c-accent)', 'var(--c-bg)', 'var(--c-paper)', 'var(--c-sub)', '#ffffff', '#000000', 'transparent', 'currentColor'],
  'background': ['var(--c-paper)', 'var(--c-accent)', 'var(--c-ink)', 'var(--c-bg)', 'none', 'transparent'],
  'background-color': ['var(--c-paper)', 'var(--c-accent)', 'var(--c-ink)', 'var(--c-bg)', 'transparent'],
  'border-color': ['var(--c-ink)', 'var(--c-accent)', 'currentColor'],
};
// 「使えるクラス」一覧: [グループ名, [[セレクタ, 説明], ...]]
const CLASS_REF = [
  ['用紙・背景', [
    ['.sheet', '用紙全体（ここに書くと全体に反映）'],
    ['.theme-blank', 'テーマごとの指定（.theme-grid / .theme-pop / .theme-frame / .theme-report）'],
    ['.pattern', '背景パターン（模様ごとに .p-grid / .p-dots / .p-diamond など）'],
    ['.frame', '縁取り・枠'],
    ['.bgimg', '背景画像（変数 --bgimg で他の場所にも使える）'],
    ['.deco', 'テーマの装飾レイヤー'],
  ]],
  ['並び・区画', [
    ['.items', '一覧全体（grid）'],
    ['.grp', '区画（形 .grp-shape-rect / -round / -circle / -none、線 .grp-ring-single / -double、ギザギザ .grp-jag、位置 .grp-pos-overlay、線 .grp-line-top など）'],
    ['.grp[data-label="新刊"]', '見出しが「新刊」の区画だけ'],
    ['.grp-badge', '区画の見出し'],
    ['.grp-sub', '区画のサブ文字（残部少！など）'],
    ['.grp-items', '区画の中の並び（grid）'],
    ['.blk-sec', '見出しブロック'],
    ['.blk-txt', 'テキストブロック'],
    ['.blk-hr', '区切り線ブロック'],
  ]],
  ['ヘッダー', [
    ['.sh', 'ヘッダー全体'],
    ['.tab-on .sh', '付箋ヘッダーのときのヘッダー全体（下の余白 margin-bottom などを変えるときはこちら）'],
    ['.tab-on .sh-box', '付箋そのもの'],
    ['.sh-date', '日付'],
    ['.sh-event', 'イベント名'],
    ['.sh-space', 'スペース'],
    ['.sh-circle', 'サークル名'],
    ['.sh-circle img', 'サークルロゴ画像'],
    ['.sh-box', '日付・イベント名・スペースの入れ物'],
    ['.headline', 'キャッチ（全部新刊!! など）'],
  ]],
  ['頒布物', [
    ['.item', '頒布物ひとつ分（.pos-left / .pos-right / .pos-top / .noimg）'],
    ['.item[data-badge="新刊"]', 'バッジが「新刊」の頒布物だけ'],
    ['[data-n="1"]', '1番目のブロックだけ（編集欄の #番号）'],
    ['.big', 'クラス名欄に big と書いたブロックだけ（名前は自由）'],
    ['.img img', '画像'],
    ['.ph', '仮の画像（表紙まだ など）。文字の大きさは font-size: 11cqw（四角の幅の11%）'],
    ['.info', '文字の部分全体'],
    ['.title', 'タイトル'],
    ['.item-head', 'タイトルの位置を「ブロックの一番上」にしたときの、タイトルとバッジの入れ物'],
    ['.badges', 'バッジの並び'],
    ['.badge.new', 'バッジ'],
    ['.badge.free', '自由バッジ'],
    ['.badge.r18', 'R-18'],
    ['.spec', '詳細（判型・ページ数）'],
    ['.cp', 'カップリング・ジャンル'],
    ['.desc', '説明文'],
    ['.note', '注意書き'],
    ['.price', '価格（「無料配布」など文字のときは .price.text）'],
    ['.price .unit', '「円」'],
  ]],
  ['その他', [
    ['.notes', 'フッター'],
  ]],
  ['変数（色・フォント）', [
    ['--c-bg', '背景色'], ['--c-paper', '面・帯の色'], ['--c-ink', '文字色'], ['--c-accent', 'アクセント色'], ['--c-sub', 'サブ色'],
    ['--f-head', '見出しフォント'], ['--f-body', '本文フォント'], ['--f-num', '数字フォント'],
  ]],
];
// 全テーマ共通の指定のうち、よく編集するものだけ（セレクタが完全一致するルールを書き出す）
const COMMON_EXPORT = ['.title', '.spec', '.cp', '.desc', '.note', '.price', '.price .unit', '.badge', '.badge.new', '.badge.r18', '.grp-badge', '.grp-sub'];
// 使い方の流れ。tab: 開くエディターのタブ / hl: 「画面で見る」で光らせる場所 / shot: guide フォルダに置けば表示されるスクショ
const GUIDE_STEPS = [
  { title: '基本情報を入力する', tab: 'info', hl: '[data-pane="info"]', shot: 'guide/step1.png', body: `
    <p>「基本情報」タブで、イベント名・開催日・サークル名・スペース番号を入力します。</p>
    <ul>
      <li>サークルのロゴ画像があれば、サークル名の代わりに表示できます。</li>
      <li>「フッター」には、年齢確認のお願いなど用紙の一番下に出す文章を書けます。</li>
    </ul>` },
  { title: '頒布物を追加する', tab: 'items', hl: '#itemList', shot: 'guide/step2.png', body: `
    <p>「頒布物」タブで、本やグッズを1つずつ追加します。画像・タイトル・判型やページ数・カップリング・説明文・価格を入れられます。</p>
    <ul>
      <li>表紙がまだのときは「仮の画像にする」で「表紙まだ」などの仮画像を置けます。</li>
      <li>「区画」を使うと「新刊」「既刊」のようなまとまりを作れます。区画の下に並べた頒布物がその区画に入ります。</li>
      <li>右のプレビューで頒布物をクリックすると、その編集欄に移動します。</li>
    </ul>` },
  { title: 'デザインを選ぶ', tab: 'design', hl: '[data-pane="design"]', shot: 'guide/step3.png', body: `
    <p>「デザイン」タブで見た目を決めます。まず「ベーステーマ」を選び、色・フォント・背景の模様・枠・ヘッダーの形などを調整します。</p>
    <ul>
      <li>毎回違う雰囲気にしたいなら、飾りのない「白紙」から作るのがおすすめです。</li>
      <li>気に入ったデザインは「マイテーマ」に名前をつけて保存しておくと、次のイベントでも使えます。</li>
      <li>テーマを切り替えても、それまでのデザインは「作業中：テーマ名」として自動で残ります。</li>
    </ul>` },
  { title: '細かい調整はCSSで', tab: 'css', hl: '.CodeMirror, .css-area', shot: 'guide/step4.png', body: `
    <p>ボタンでは足りない細かい調整は「CSS」タブで行います。<b>CSSが分からなければ、このタブは使わなくても大丈夫です。</b>使ってみたい人は、次の3つから始めてください。</p>
    <ul>
      <li><b>スニペットを挿入</b>：「価格をギザギザ枠に」「新刊だけ大きく」などをそのまま入れられます。</li>
      <li><b>使えるクラス</b>：クラス名をクリックすると、その部分を変えるための書き出しが入ります。</li>
      <li><b>テーマのCSSを書き出す</b>：今のテーマの指定を書き出して、数字を書き換えて調整できます。</li>
    </ul>
    <p>困ったときは、この画面の「よくある質問」も見てください。</p>` },
  { title: '保存・印刷する', tab: null, hl: '.topbar', shot: 'guide/step5.png', body: `
    <p>作業内容は自動で保存されますが、<b>このブラウザの中だけ</b>に保存されます。別のパソコンやブラウザでは見られず、ブラウザのデータを消すと消えてしまいます。
    大事なお品書きは、上の「ファイルに保存」でファイルにしておいてください（「ファイルを開く」で元に戻せます）。</p>
    <p>できあがったら「印刷 / PDF」を押します。印刷画面では次のように設定してください。</p>
    <ul>
      <li>用紙サイズ：A3（自動で選ばれます）</li>
      <li>余白：なし</li>
      <li>「背景のグラフィック」：オン（オフだと背景の色や模様が出ません）</li>
      <li>入稿やコンビニ印刷に使うなら、送信先を「PDFに保存」にします。</li>
    </ul>
    <p>SNSに載せるときなどは、上の「画像で保存…」から PNG か JPG で保存できます（A3・300dpi の大きさ）。</p>` },
];
// よくある質問（実際につまずいたところ）。[見出し, [[質問, 答えのHTML], ...]]
const FAQ = [
  ['見た目の調整', [
    ['特定の頒布物だけ文字を大きくしたい', `
      <p>頒布物の編集欄の「クラス名（CSS用）」に <code>big</code> などと書き、CSSでそのクラスを指定します。</p>
      <pre>.sheet .big .title { font-size: 3.5em; }   /* タイトルだけ */
.sheet .big { font-size: 1.3em; }          /* 中身を全部 */</pre>
      <p><code>.big .title</code> の<b>順番が大事</b>です。<code>.title .big</code> と逆に書くと「タイトルの中にある big」という意味になり、反映されません。</p>
      <p>クラス名をつけずに「新刊」だけ大きくするスニペットもあります（スニペット →「頒布物：大きさ」「区画」）。</p>`],
    ['頒布物1つずつに「新刊」スタンプを付けたい', `
      <p>頒布物の「バッジ」に「新刊」などと書き、「バッジの出し方」を「画像に重ねる（スタンプ）」にします。
      位置（左上・右上・左下・右下）・形・内側の線・ギザギザを選べます。色はテーマの色、傾きはデザインタブの「重ねた見出し（スタンプ）の傾き」に合わせます。</p>`],
    ['区画の見出し（「新刊」などのスタンプ）だけ変えたい', `
      <p>区画の設定の「クラス名（CSS用）」に好きな名前（例: <code>kinkan</code>）を書き、<code>.grp-badge</code> を指定します。</p>
      <pre>.sheet .kinkan .grp-badge { font-size: 1.6em; padding: 1mm 3mm; }</pre>
      <p><code>.badges</code> は頒布物についているバッジの方なので、区画の見出しには反映されません。</p>`],
    ['サークル名だけ大きくしたい・日付〜スペースと高さを揃えたい', `
      <p>大きさだけ変えるなら <code>.sheet .sh-circle { font-size: 4em; }</code>（ロゴ画像なら <code>.sheet .sh-circle img { height: 30mm; }</code>）。</p>
      <p>高さをぴったり揃えたいときは、デザインタブの「サークル名の高さを『日付〜スペース』の高さに揃える」を使うと自動で合わせます。</p>`],
    ['サークル名を縦長の文字にしたら、右揃えが崩れた', `
      <p>CSSの <code>transform: scaleX(…)</code> は見た目だけを縮めるので、配置がずれます。
      デザインタブの「サークル名の横幅（長体）」を使ってください（縮めた後の幅で配置されます）。</p>`],
    ['ヘッダーを小さくしたい・用紙の上の余白を詰めたい', `
      <ul>
        <li>デザインタブ →「ヘッダーの大きさ」を下げる（一番かんたん）</li>
        <li>付箋ヘッダーなら「付箋の内側の余白」を下げる</li>
        <li>ヘッダーの下の余白：<code>.sheet.tab-on .sh { margin-bottom: 3mm; }</code>（付箋ヘッダーのとき）</li>
        <li>用紙の上の余白：<code>.sheet.fr-pad, .sheet { padding-top: 8mm; }</code></li>
        <li>スペース番号だけ小さく：<code>.sheet .sh-space { font-size: 5em; }</code></li>
      </ul>`],
    ['色の組み合わせだけ変えたい', `
      <p>デザインタブの「色」にある「配色だけ変える」から選ぶと、レイアウトやフォントはそのままで色だけ入れ替わります。
      背景の模様・枠・付箋・区画の見出し・CSSで同じ色を使っているところも一緒に変わります。</p>`],
    ['「新刊」スタンプの形を変えたい（正円のギザギザ・二重線なし など）', `
      <p>区画の設定の「見出しの形」（文字だけ・長方形・角丸・正円）、「内側の線」（なし・1本・2本）、「ギザギザ」を組み合わせて選べます。
      傾きはデザインタブの「重ねた見出し（スタンプ）の傾き」で変えられます。</p>`],
    ['「区画」の「新刊」スタンプを画像の角やタイトルの横に置きたい', `
      <p>区画の設定の「見出しの位置」で、区画の左上・右上、最初の画像の四隅を選べます。</p>`],
  ]],
  ['並び方・余白', [
    ['詳細と価格の間が大きく空いてしまう', `
      <p>横に並んだ頒布物は、一番高いものに高さが揃い、価格はその一番下に置かれます。空白を詰めるには次のどちらかを書きます。</p>
      <pre>.sheet .price { margin-top: 0; }                 /* 価格を詳細のすぐ下に */
.sheet .grp-items { align-items: start; }        /* 隣の高さに合わせない */</pre>`],
    ['同じ区画の値段の大きさが、思ったより小さい', `
      <p>値段は折り返さないので、同じ区画（または区画の外の並び）の中で一番狭い欄に収まる大きさに<b>そろえて</b>います。
      大きくしたいときは、その区画の列の比率を変えて欄を広げるか、画像の幅を少し狭くしてください。</p>`],
    ['列と列の間に縦線を引きたい', `
      <p>デザインタブの「列の間に区切り線を引く」をオンにします。列の境目（列の比率を変えても正しい位置）に線が引かれ、横いっぱいの見出しや区画のところでは途切れます。
      太さ・色・区画の中にも引くかどうかも選べます。</p>`],
    ['用紙の下に余白が余る', `
      <p>デザインタブの「縦に余った余白の使い方」で「均等に配置」「上下に振り分け」「ブロックを縦に引き伸ばす」を選べます。
      画像を大きくしたり「全体の文字サイズ」を上げて埋めるのもおすすめです。</p>`],
    ['「用紙からはみ出しています」と出る', `
      <p>「全体の文字サイズ」「商品どうしの間隔」「画像の幅」を下げるか、列数を増やしてください。「縦に余った余白の使い方」を「上に詰める」にすると余白が減ります。</p>`],
    ['タイトルを画像の上にまたがって置きたい', `
      <p>頒布物の「タイトルの位置」を「ブロックの一番上」にすると、タイトルが画像の上に横いっぱいに入ります。</p>`],
    ['「画像の縦幅を区画の縦幅に合わせる」にしても、画像が行の高さいっぱいにならない', `
      <p>その行の高さが<b>自分の説明文の長さ</b>で決まっているときは、画像を広げると文字が押し出されて行が伸びてしまいます。
      そうならない範囲で止まるので、いっぱいにはなりません。説明文を短くするか、文字サイズを少し下げると画像がその分大きくなります。</p>`],
  ]],
  ['画像・フォント', [
    ['透過PNGにずらし影をつけたら、影が四角くなった', `
      <p><code>box-shadow</code> ではなく <code>filter: drop-shadow(…)</code> を使うと、キャラの形に沿って影がつきます。</p>
      <pre>.sheet .img img { filter: drop-shadow(2mm 2mm 0 var(--c-ink)); }</pre>`],
    ['自分のフォントを使いたい', `
      <p>デザインタブの「フォント」で、フォントファイルを読み込むか、パソコンに入っているフォントを選べます。
      パソコンのフォントは別のパソコンで開くとそのパソコンにも必要です。ファイルで読み込んだフォントは保存ファイルに含まれます。
      同人誌の頒布物やお品書きに使ってよいかは、フォントの利用規約を確認してください。</p>`],
  ]],
  ['CSSが反映されないとき', [
    ['書いたのに見た目が変わらない', `
      <p>よくある原因です。</p>
      <ul>
        <li><b>順番が逆</b>：<code>.sheet .big .title</code>（大きい入れ物 → 中身の順）</li>
        <li><b>全角の記号やスペース</b>：<code>｛ ｝ ： ；</code> や全角スペースは使えません。</li>
        <li><b>付箋ヘッダーのとき</b>：ヘッダーは <code>.sheet.tab-on .sh</code> と書かないと反映されないことがあります（「使えるクラス」からクリックで入れると確実です）。</li>
        <li><b>「テーマのCSSを書き出す」をした後</b>：書き出したCSSが優先されるので、同じ場所を別の行で指定していないか確認してください。</li>
      </ul>`],
    ['一時的に1行だけ止めたい（コメントにしたい）', `
      <p>CSSでは <code>//</code> はコメントになりません。<code>/* ～ */</code> で囲むか、行を選んで <b>Ctrl + /</b> を押してください。</p>`],
    ['大きさの単位は何を使えばいい？', `
      <p><code>em</code>（まわりの文字の大きさが基準）か <code>mm</code>（実際の長さ）がおすすめです。
      <code>rem</code> や <code>px</code> は画面の大きさが基準なので、印刷すると思った大きさになりにくいです。</p>`],
  ]],
  ['保存・印刷', [
    ['作ったお品書きが消えた・別のパソコンで続きをしたい', `
      <p>自動保存は<b>このブラウザの中だけ</b>です。ブラウザのデータを消したり、別のパソコン・ブラウザで開くと見えません。
      上の「ファイルに保存」で保存したファイルを「ファイルを開く」で読み込めば続きから作業できます。</p>`],
    ['テーマを切り替えたら、作り込んだデザインが消えた', `
      <p>切り替える前のデザインは、デザインタブの「マイテーマ」に「作業中：テーマ名」として自動で残っています。「適用」で戻せます。</p>`],
    ['画像（PNG・JPG）で保存したい', `
      <p>上の「画像で保存…」から選びます。A3・300dpi（3508×4961ピクセル）の大きさで保存されます。PNGはきれいでファイルが大きめ、JPGは軽めです。
      パソコンに入っているフォント（ファイルで読み込んでいないもの）は、画像では別のフォントになることがあります。</p>`],
    ['印刷すると背景や色が出ない・余白ができる', `
      <p>印刷画面で「背景のグラフィック」をオン、「余白」を「なし」にしてください。用紙はA3が自動で選ばれます。</p>`],
  ]],
];
