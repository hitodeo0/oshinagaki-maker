// 海星式お品書きメーカー: CSSタブ（CodeMirror・スニペット・使えるクラス・テーマのCSSを書き出す）
// （読み込み順: data.js → core.js → state.js → render.js → layout.js → editor.js → items.js → themes.js → css-editor.js → io.js → help.js → main.js）

/* ---------- CSS: 骨組み・スニペット ---------- */
$('#snippetSel').innerHTML += Object.entries(SNIPPETS).map(([group, list]) =>
  `<optgroup label="${esc(group)}">${Object.keys(list).map(k => `<option value="${esc(group + '|' + k)}">${esc(k)}</option>`).join('')}</optgroup>`).join('');

/* ---------- CSSエディター（CodeMirror） ---------- */
function cssHintWithValues(cm, hintOpts) {
  const cur = cm.getCursor();
  const before = cm.getLine(cur.line).slice(0, cur.ch);
  const m = before.match(/([a-z-]+)\s*:\s*([^;{}:]*)$/i);
  if (m && VALUE_HINTS[m[1].toLowerCase()]) {
    const word = (m[2].match(/[\w#().,-]*$/) || [''])[0];
    const list = VALUE_HINTS[m[1].toLowerCase()].filter(v => v.toLowerCase().startsWith(word.toLowerCase()));
    if (list.length) return { list, from: CodeMirror.Pos(cur.line, cur.ch - word.length), to: cur };
  }
  return CodeMirror.hint.css(cm, hintOpts);
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
  // 隠れている間は描けないので、CSSタブを開いたときに描き直す（タブのクリックでも「使い方」の「画面で見る」でも）
  document.addEventListener('tabshown', e => { if (e.detail === 'css') setTimeout(() => { cssEditor.refresh(); refreshSwatches(); }, 0); });
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
  // 指定の上に「どこの見た目か」の1行コメントをつける（カンマ区切りは「・」でつなぐ）
  const note = sel => {
    const parts = sel.split(/,\s*(?![^(]*\))/).map(p => p.replace(/\.theme-\w+|\.sheet|:where\([^)]*\)/g, '').trim());
    const found = [...new Set(parts.map(p => EXPORT_NOTES[p]).filter(Boolean))];
    return found.length ? `/* ${found.join('・')} */\n` : '';
  };
  const pretty = (sel, style) => `${note(sel)}${sel} {\n${style.cssText.split(/;\s*(?![^(]*\))/).map(s => s.trim()).filter(Boolean).map(s => '  ' + s + ';').join('\n')}\n}`;
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
