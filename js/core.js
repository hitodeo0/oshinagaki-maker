// 海星式お品書きメーカー: 共通の小道具（DOM・文字列・画像・保存・設定欄の有効/無効）
// （読み込み順: data.js → core.js → state.js → render.js → layout.js → editor.js → items.js → themes.js → css-editor.js → io.js → help.js → main.js）

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ---------- utils ---------- */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
const getPath = (o, p) => p.split('.').reduce((a, k) => a?.[k], o);
const setPath = (o, p, v) => { const ks = p.split('.'); const last = ks.pop(); ks.reduce((a, k) => a[k], o)[last] = v; };
const fontStack = (...fs) => fs.map(f => `'${String(f).replace(/'/g, "\\'")}'`).join(',') + ',sans-serif';
const uid = () => Math.random().toString(36).slice(2, 10);
const clone = o => JSON.parse(JSON.stringify(o));
const MM = 96 / 25.4;   // 1mm あたりの px
const opts = (list, cur) => list.map(([v, l]) => `<option value="${v}"${cur === v ? ' selected' : ''}>${l}</option>`).join('');

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

// data-dep の条件: 「|」はまたは、「&」はかつ。
//   key（オンのとき） / !key（オフのとき） / key=a,b（どれかのとき） / key!=a（以外のとき） / key>0（数値が超えるとき）
function depOk(expr, get) {
  return expr.split('|').some(or => or.split('&').every(t => {
    let m;
    if ((m = t.match(/^(!?)([\w.]+)$/))) return !!get(m[2]) !== !!m[1];
    if ((m = t.match(/^([\w.]+)(!?=)(.*)$/))) { const hit = m[3].split(',').includes(String(get(m[1]) ?? '')); return m[2] === '=' ? hit : !hit; }
    if ((m = t.match(/^([\w.]+)>(.*)$/))) return +get(m[1]) > +m[2];
    return true;
  }));
}
const applyDeps = (root, get) => root && root.querySelectorAll('[data-dep]').forEach(el => el.classList.toggle('dep-off', !depOk(el.dataset.dep, get)));

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
