// 海星式お品書きメーカー: 使い方・よくある質問
// （読み込み順: data.js → core.js → state.js → render.js → layout.js → editor.js → items.js → themes.js → css-editor.js → io.js → help.js → main.js）

/* ---------- 使い方・よくある質問 ---------- */
let guideLastStep = 0;
function openHelp(tab = 'guide') {
  $$('[data-help-tab]').forEach(b => b.classList.toggle('on', b.dataset.helpTab === tab));
  $('#helpTitle').textContent = tab === 'guide' ? '使い方' : 'よくある質問';
  $('#helpBody').innerHTML = tab === 'guide'
    ? `<p style="margin-top:0">次の順番で進めるとスムーズです。「画面で見る」を押すと、その場所が光ります。</p>` +
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
