/* ============================================================
   SAR-SLR Risk-of-Bias Assessment — single-page app
   - State persists in localStorage under STATE_KEY.
   - No backend; PDFs are bundled in /pdfs.
   - Excel export uses SheetJS (xlsx.full.min.js).
   ============================================================ */

const STATE_KEY = 'sar_slr_rob:state:v2';
const LOCK_KEY = 'sar_slr_rob:unlocked';
const ACCESS_CODE = '123456';

const QUESTIONS = [
  { id: 'Q1', short: 'Objective',          text: 'Is the study objective or research question clearly stated?' },
  { id: 'Q2', short: 'Method detail',      text: 'Is the UAV, SAR, deconfliction, ADS-B, or mixed-airspace method described with enough detail to support interpretation or replication?' },
  { id: 'Q3', short: 'Method fit',         text: 'Is the selected method appropriate for the stated SAR optimization or deconfliction problem?' },
  { id: 'Q4', short: 'Comparators',        text: 'Are comparators, baselines, benchmarks, or reference cases clearly described and appropriate?' },
  { id: 'Q5', short: 'Metrics',            text: 'Are performance metrics clearly defined and aligned with SAR mission effectiveness, deconfliction safety, or operational feasibility?' },
  { id: 'Q6', short: 'Scenario realism',   text: 'Are the scenarios operationally realistic enough for SAR, helicopter interaction, low-altitude airspace, UTM, U-space, or mixed manned-unmanned operations?' },
  { id: 'Q7', short: 'Constraints',        text: 'Does the study address uncertainty, latency, packet loss, degraded communications, platform failure, sensing limitations, or other operational constraints?' },
  { id: 'Q8', short: 'Validation/repro',   text: 'Is validation maturity adequate, and is enough information provided to judge reproducibility?' },
];

const RESPONSES = [
  { key: 'Yes',         label: 'Yes',         klass: 'yes',    score: 1,    countNo: false },
  { key: 'Partly',      label: 'Partly',      klass: 'partly', score: 0.5,  countNo: false },
  { key: 'No',          label: 'No',          klass: 'no',     score: 0,    countNo: true  },
  { key: 'Cannot tell', label: 'Cannot tell', klass: 'ct',     score: 0,    countNo: false },
  { key: 'N/A',         label: 'N/A',         klass: 'na',     score: null, countNo: false }, // null = excluded
];

const TRACK_NAMES = {
  A: 'Track A — SAR optimization',
  B: 'Track B — Deconfliction / UTM / ADS-B',
  C: 'Track C — Joint manned-unmanned operations',
};

/* ===== State ===== */
let state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return { ...defaultState(), ...parsed, studies: parsed.studies || {} };
  } catch (e) {
    console.error('Bad state, resetting', e);
    return defaultState();
  }
}
function defaultState() {
  return { name: '', onboarded: false, studies: {} };
}
function saveState() {
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

/* ===== Helpers: scoring ===== */
function getResponseDef(key) {
  return RESPONSES.find(r => r.key === key);
}
function computeScore(studyData) {
  let sum = 0, applicable = 0, noCount = 0, answered = 0;
  for (const q of QUESTIONS) {
    const r = studyData?.[q.id];
    if (!r) continue;
    answered++;
    const def = getResponseDef(r);
    if (!def) continue;
    if (def.score === null) continue;          // N/A excluded
    applicable++;
    sum += def.score;
    if (def.countNo) noCount++;
  }
  const pct = applicable > 0 ? Math.round((sum / applicable) * 100) : null;
  return { sum, applicable, noCount, answered, pct };
}
function autoJudgement({ pct, noCount, applicable }) {
  if (applicable === 0) return null;
  if (noCount >= 4) return 'High concern';
  if (noCount >= 2) return 'Some concern';
  // 0 or 1 No
  if (pct >= 75) return 'Low concern';
  if (pct >= 50) return 'Some concern';
  return 'High concern';
}
function studyJudgement(studyData) {
  if (!studyData) return null;
  if (studyData.judgementOverride) return studyData.judgementOverride;
  const sc = computeScore(studyData);
  return autoJudgement(sc);
}
function studyIsComplete(studyData) {
  if (!studyData) return false;
  return QUESTIONS.every(q => studyData[q.id]);
}
function studyAnsweredCount(studyData) {
  if (!studyData) return 0;
  return QUESTIONS.reduce((acc, q) => acc + (studyData[q.id] ? 1 : 0), 0);
}

/* ===== Router ===== */
function route() {
  hideAllScreens();

  // Gate: shared access code first
  if (localStorage.getItem(LOCK_KEY) !== '1') {
    showScreen('screen-lock');
    document.getElementById('appbar').hidden = true;
    setTimeout(() => document.getElementById('lockInput')?.focus(), 0);
    return;
  }

  const h = location.hash.replace(/^#/, '') || (state.onboarded ? 'dashboard' : 'onboarding');
  const [name, param] = h.split('/');

  if (name === 'onboarding' || !state.onboarded) {
    showScreen('screen-onboarding');
    document.getElementById('appbar').hidden = true;
    initOnboarding();
    return;
  }

  document.getElementById('appbar').hidden = false;
  renderAppbar();

  if (name === 'study' && param) {
    showScreen('screen-study');
    renderStudy(param);
  } else if (name === 'help') {
    showScreen('screen-help');
    renderHelp();
  } else {
    showScreen('screen-dashboard');
    renderDashboard();
  }
  window.scrollTo(0, 0);
}
function hideAllScreens() {
  document.querySelectorAll('.screen').forEach(s => s.hidden = true);
}
function showScreen(id) {
  document.getElementById(id).hidden = false;
}
function navigate(hash) {
  location.hash = hash;
}
window.addEventListener('hashchange', route);

/* ===== App bar ===== */
function renderAppbar() {
  const chip = document.getElementById('reviewerChip');
  chip.textContent = state.name || 'Reviewer';
}

/* ===== Lock screen ===== */
document.getElementById('lockForm').addEventListener('submit', e => {
  e.preventDefault();
  const input = document.getElementById('lockInput');
  const err = document.getElementById('lockError');
  if (input.value === ACCESS_CODE) {
    localStorage.setItem(LOCK_KEY, '1');
    err.hidden = true;
    route();
  } else {
    err.hidden = false;
    input.value = '';
    input.focus();
  }
});
document.getElementById('goHome').addEventListener('click', () => navigate('dashboard'));
document.getElementById('helpBtn').addEventListener('click', () => navigate('help'));

/* ===== Onboarding ===== */
function initOnboarding() {
  // Populate question list
  const ol = document.getElementById('onbQuestionList');
  if (ol && ol.children.length === 0) {
    ol.innerHTML = QUESTIONS.map(q => `<li>${escapeHtml(q.text)}</li>`).join('');
  }
  // Restore name if user came back to edit
  document.getElementById('onbName').value = state.name || '';
  updateOnbStep2NextEnabled();

  // Show step 1 by default
  showOnbStep(1);
}
function showOnbStep(n) {
  for (let i = 1; i <= 3; i++) {
    document.getElementById(`onb-step-${i}`).hidden = (i !== n);
  }
}
document.querySelectorAll('[data-onb-next]').forEach(btn => {
  btn.addEventListener('click', e => {
    const next = parseInt(e.target.dataset.onbNext, 10);
    showOnbStep(next);
  });
});
document.querySelectorAll('[data-onb-prev]').forEach(btn => {
  btn.addEventListener('click', e => {
    const prev = parseInt(e.target.dataset.onbPrev, 10);
    showOnbStep(prev);
  });
});
document.getElementById('onbName').addEventListener('input', updateOnbStep2NextEnabled);
function updateOnbStep2NextEnabled() {
  const name = document.getElementById('onbName').value.trim();
  document.getElementById('onbStep2Next').disabled = !name;
}
document.getElementById('onbFinish').addEventListener('click', () => {
  const name = document.getElementById('onbName').value.trim();
  if (!name) { showOnbStep(2); return; }
  state.name = name;
  state.onboarded = true;
  saveState();
  navigate('dashboard');
});

/* ===== Dashboard ===== */
function renderDashboard() {
  // Greeting
  const greet = document.getElementById('dashGreeting');
  greet.textContent = state.name ? `Hello, ${state.name}` : 'Your dashboard';
  const dashSub = document.getElementById('dashSub');
  dashSub.innerHTML = `Your responses save automatically on this device. Click <strong>Download my Excel</strong> when you're done.`;

  // Stats
  const total = STUDIES.length;
  let complete = 0, partial = 0;
  for (const s of STUDIES) {
    const ans = studyAnsweredCount(state.studies[s.id]);
    if (ans === QUESTIONS.length) complete++;
    else if (ans > 0) partial++;
  }
  const remaining = total - complete - partial;

  const statRow = document.getElementById('statRow');
  statRow.innerHTML = `
    <div class="stat-card"><div class="stat-num">${total}</div><div class="stat-label">Total studies</div></div>
    <div class="stat-card"><div class="stat-num">${complete}</div><div class="stat-label">Complete</div></div>
    <div class="stat-card"><div class="stat-num">${partial}</div><div class="stat-label">In progress</div></div>
    <div class="stat-card"><div class="stat-num">${remaining}</div><div class="stat-label">Not started</div></div>
  `;

  // Overall progress (count answered items)
  const totalItems = total * QUESTIONS.length;
  const answeredItems = STUDIES.reduce((acc, s) => acc + studyAnsweredCount(state.studies[s.id]), 0);
  const pct = totalItems > 0 ? (answeredItems / totalItems) * 100 : 0;
  document.getElementById('overallProgress').style.width = pct + '%';

  // Track sections
  const trackList = document.getElementById('trackList');
  trackList.innerHTML = '';
  for (const track of ['A', 'B', 'C']) {
    const tracked = STUDIES.filter(s => s.track === track);
    if (!tracked.length) continue;
    const tComplete = tracked.filter(s => studyAnsweredCount(state.studies[s.id]) === QUESTIONS.length).length;
    const section = document.createElement('div');
    section.className = 'track-section track-' + track;
    section.innerHTML = `
      <div class="track-section-head">
        <h2>${escapeHtml(TRACK_NAMES[track])}</h2>
        <span class="track-count">${tComplete} / ${tracked.length} complete</span>
      </div>
      <div class="study-grid"></div>
    `;
    const grid = section.querySelector('.study-grid');
    for (const s of tracked) {
      grid.appendChild(buildStudyCard(s));
    }
    trackList.appendChild(section);
  }
}

function buildStudyCard(s) {
  const data = state.studies[s.id];
  const ans = studyAnsweredCount(data);
  const isComplete = ans === QUESTIONS.length;
  const isPartial = ans > 0 && !isComplete;
  const pct = (ans / QUESTIONS.length) * 100;
  const j = studyJudgement(data);

  const btn = document.createElement('button');
  btn.className = 'study-card';
  let statusClass = 'status-empty', statusText = 'Not started';
  if (isComplete) { statusClass = 'status-complete'; statusText = 'Complete'; }
  else if (isPartial) { statusClass = 'status-partial'; statusText = `${ans} / ${QUESTIONS.length} answered`; }

  btn.innerHTML = `
    <div class="study-card-top">
      <span class="study-card-id">${s.id}</span>
      ${j ? `<span class="judgement-pill ${judgementClass(j)}">${escapeHtml(j)}</span>` : ''}
    </div>
    <div class="study-card-cite">${escapeHtml(s.citation)}</div>
    <div class="study-card-foot">
      <div class="study-card-progress"><div style="width:${pct}%"></div></div>
      <span class="study-card-status ${statusClass}">${statusText}</span>
    </div>
  `;
  btn.addEventListener('click', () => navigate('study/' + s.id));
  return btn;
}

function judgementClass(j) {
  if (j === 'Low concern')  return 'j-low';
  if (j === 'Some concern') return 'j-some';
  if (j === 'High concern') return 'j-high';
  if (j === 'Unclear')      return 'j-unclear';
  return 'j-none';
}

document.getElementById('exportBtn').addEventListener('click', exportExcel);
document.getElementById('resetBtn').addEventListener('click', () => {
  if (!confirm('Reset all of your responses on this device? Your saved Excel files are not affected. This cannot be undone.')) return;
  state = defaultState();
  saveState();
  navigate('onboarding');
});

/* ===== Per-study form ===== */
let currentStudyId = null;
let saveTimer = null;

function renderStudy(id) {
  const s = STUDIES.find(x => x.id === id);
  if (!s) { navigate('dashboard'); return; }
  currentStudyId = id;
  state.studies[id] = state.studies[id] || {};
  const data = state.studies[id];

  document.getElementById('screen-study').className = 'screen track-' + s.track;
  document.getElementById('studyTrack').textContent = 'Track ' + s.track;
  document.getElementById('studyId').textContent = s.id;
  document.getElementById('studyYear').textContent = s.year;
  document.getElementById('studyCitation').textContent = s.citation;
  const pdfHref = 'pdfs/' + encodeURIComponent(s.pdf);
  document.getElementById('studyPdf').href = pdfHref;
  // Hide the iframe on narrow viewports so we don't fetch the PDF unnecessarily.
  const pdfFrame = document.getElementById('studyPdfFrame');
  if (window.matchMedia('(min-width: 1100px)').matches) {
    if (pdfFrame.src !== window.location.origin + window.location.pathname.replace(/[^/]*$/, '') + pdfHref) {
      pdfFrame.src = pdfHref + '#view=FitH';
    }
  } else {
    pdfFrame.removeAttribute('src');
  }

  // Build questions
  const form = document.getElementById('questionsForm');
  form.innerHTML = '';
  for (const q of QUESTIONS) {
    const card = document.createElement('div');
    card.className = 'qcard';
    const current = data[q.id] || '';
    const justification = data[q.id + '_justification'] || '';
    const justifyOpen = (current === 'No' || current === 'Cannot tell');

    card.innerHTML = `
      <h3>
        <span class="qcard-num">${q.id}</span>
        <span class="qcard-q">${escapeHtml(q.text)}</span>
      </h3>
      <div class="response-row" role="radiogroup" aria-label="${q.id} response">
        ${RESPONSES.map(r => `
          <label class="resp-card ${current === r.key ? 'checked-' + r.klass : ''}" data-q="${q.id}" data-key="${r.key}" data-klass="${r.klass}">
            <input type="radio" name="${q.id}" value="${r.key}" ${current === r.key ? 'checked' : ''} />
            ${escapeHtml(r.label)}
          </label>
        `).join('')}
      </div>
      <div class="justification ${justifyOpen ? 'show' : ''}" data-for="${q.id}">
        <div class="justification-hint">Brief justification (a phrase or short quotation):</div>
        <textarea data-q="${q.id}" placeholder="e.g., 'No baseline comparator described in §4'">${escapeHtml(justification)}</textarea>
      </div>
    `;
    form.appendChild(card);
  }

  // Wire response clicks
  form.querySelectorAll('.resp-card').forEach(el => {
    el.addEventListener('click', e => {
      const q = el.dataset.q;
      const key = el.dataset.key;
      const klass = el.dataset.klass;
      // Update visuals
      el.parentElement.querySelectorAll('.resp-card').forEach(sib => {
        sib.className = sib.className.replace(/checked-\w+/g, '').trim();
      });
      el.classList.add('checked-' + klass);
      // Tick the radio
      const input = el.querySelector('input');
      if (input) input.checked = true;
      // Save
      state.studies[currentStudyId][q] = key;
      const justBlock = form.querySelector(`.justification[data-for="${q}"]`);
      if (key === 'No' || key === 'Cannot tell') justBlock.classList.add('show');
      else justBlock.classList.remove('show');
      onStudyChange();
    });
  });

  // Wire textareas
  form.querySelectorAll('textarea[data-q]').forEach(el => {
    el.addEventListener('input', e => {
      const q = el.dataset.q;
      state.studies[currentStudyId][q + '_justification'] = el.value;
      onStudyChange();
    });
  });

  // Override + note
  const overrideEl = document.getElementById('judgementOverride');
  overrideEl.value = data.judgementOverride || '';
  overrideEl.onchange = () => {
    state.studies[currentStudyId].judgementOverride = overrideEl.value;
    onStudyChange();
  };
  const noteEl = document.getElementById('studyNote');
  noteEl.value = data.note || '';
  noteEl.oninput = () => {
    state.studies[currentStudyId].note = noteEl.value;
    onStudyChange();
  };

  // Prev/Next
  const idx = STUDIES.findIndex(x => x.id === id);
  const prev = STUDIES[idx - 1];
  const next = STUDIES[idx + 1];
  const prevBtn = document.getElementById('prevStudyBtn');
  const nextBtn = document.getElementById('nextStudyBtn');
  prevBtn.disabled = !prev;
  prevBtn.onclick = () => prev && navigate('study/' + prev.id);
  if (next) {
    nextBtn.textContent = 'Save & next study →';
    nextBtn.onclick = () => navigate('study/' + next.id);
  } else {
    nextBtn.textContent = 'Back to dashboard →';
    nextBtn.onclick = () => navigate('dashboard');
  }

  updateLiveScore();
}

function onStudyChange() {
  // Mark a saved timestamp + persist
  state.studies[currentStudyId]._updatedAt = new Date().toISOString();
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveState();
    const indicator = document.getElementById('saveIndicator');
    indicator.textContent = '✓ Saved';
    indicator.classList.add('show');
    setTimeout(() => indicator.classList.remove('show'), 1500);
  }, 250);
  updateLiveScore();
}

function updateLiveScore() {
  const data = state.studies[currentStudyId];
  const sc = computeScore(data);
  const liveScore = document.getElementById('liveScore');
  const liveApplicable = document.getElementById('liveApplicable');
  const liveJ = document.getElementById('liveJudgement');

  liveScore.textContent = sc.applicable > 0 ? sc.pct + '%' : '—';
  liveApplicable.textContent = sc.applicable;
  const j = studyJudgement(data);
  if (j) {
    liveJ.textContent = j;
    liveJ.className = 'judgement-pill ' + judgementClass(j);
  } else {
    liveJ.textContent = 'Not started';
    liveJ.className = 'judgement-pill j-none';
  }
}

document.getElementById('backToDash').addEventListener('click', () => navigate('dashboard'));

/* ===== Help screen ===== */
function renderHelp() {
  const ol = document.getElementById('helpQuestionList');
  ol.innerHTML = QUESTIONS.map(q => `<li>${escapeHtml(q.text)}</li>`).join('');
}
document.getElementById('helpBack').addEventListener('click', () => navigate('dashboard'));
document.getElementById('changeRoleBtn').addEventListener('click', () => {
  navigate('onboarding');
});

/* ===== Excel export ===== */
function exportExcel() {
  const wb = XLSX.utils.book_new();

  // --- Summary sheet ---
  const header = [
    'Study ID', 'Track', 'Year', 'Citation',
    ...QUESTIONS.map(q => `${q.id} ${q.short}`),
    'Applicable items', 'Score (%)', 'No count',
    'Overall judgement', 'Auto vs override', 'Reviewer note',
  ];
  const summaryRows = [header];
  for (const s of STUDIES) {
    const d = state.studies[s.id];
    const sc = computeScore(d);
    const auto = autoJudgement(sc);
    const final = (d && d.judgementOverride) ? d.judgementOverride : auto;
    const overrideTag = (d && d.judgementOverride) ? 'override' : (auto ? 'auto' : '');
    summaryRows.push([
      s.id, 'Track ' + s.track, s.year, s.citation,
      ...QUESTIONS.map(q => d?.[q.id] || ''),
      sc.applicable,
      sc.pct !== null ? sc.pct : '',
      sc.noCount,
      final || '',
      overrideTag,
      d?.note || '',
    ]);
  }
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary['!cols'] = [
    { wch: 8 }, { wch: 9 }, { wch: 6 }, { wch: 70 },
    ...QUESTIONS.map(() => ({ wch: 13 })),
    { wch: 8 }, { wch: 8 }, { wch: 5 },
    { wch: 22 }, { wch: 14 }, { wch: 40 },
  ];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

  // --- Justifications sheet (only filled in cells) ---
  const justHeader = ['Study ID', 'Track', 'Citation', 'Question', 'Question text', 'Response', 'Justification'];
  const justRows = [justHeader];
  for (const s of STUDIES) {
    const d = state.studies[s.id];
    if (!d) continue;
    for (const q of QUESTIONS) {
      const r = d[q.id];
      const j = d[q.id + '_justification'];
      if (j && j.trim()) {
        justRows.push([s.id, 'Track ' + s.track, s.citation, q.id, q.text, r || '', j.trim()]);
      }
    }
  }
  const wsJust = XLSX.utils.aoa_to_sheet(justRows);
  wsJust['!cols'] = [
    { wch: 8 }, { wch: 9 }, { wch: 60 }, { wch: 5 }, { wch: 60 }, { wch: 12 }, { wch: 60 },
  ];
  XLSX.utils.book_append_sheet(wb, wsJust, 'Justifications');

  // --- Per-study (doc-format) sheet: matches Section 12 of the procedure docx ---
  // One sheet per study, but 54 tabs would be unwieldy.
  // Instead make one "Per-study (long form)" sheet with stacked tables.
  const reviewerCol = state.name || 'Reviewer';
  const longRows = [];
  for (const s of STUDIES) {
    const d = state.studies[s.id];
    const sc = computeScore(d);
    const auto = autoJudgement(sc);
    const final = (d && d.judgementOverride) ? d.judgementOverride : auto;
    longRows.push([`${s.id}  |  Track ${s.track}`, '', '', '']);
    longRows.push([s.citation, '', '', '']);
    longRows.push(['Appraisal item', reviewerCol, '(other reviewers)', 'Consensus (TBD)']);
    for (const q of QUESTIONS) {
      longRows.push([`${q.id} ${q.short}`, d?.[q.id] || '', '', '']);
    }
    longRows.push(['Score (%)', sc.pct !== null ? sc.pct + '%' : '', '', '']);
    longRows.push(['Overall judgement', final || '', '', '']);
    longRows.push(['Reviewer note', d?.note || '', '', '']);
    longRows.push(['', '', '', '']); // spacer
  }
  const wsLong = XLSX.utils.aoa_to_sheet(longRows);
  wsLong['!cols'] = [{ wch: 30 }, { wch: 18 }, { wch: 18 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsLong, 'Per-study');

  // --- Meta sheet ---
  const meta = [
    ['SAR-SLR Risk-of-Bias appraisal — exported by ' + (state.name || 'reviewer')],
    ['Reviewer name', state.name || ''],
    ['Export timestamp', new Date().toISOString()],
    ['App version', 'v2'],
    [],
    ['Studies total', STUDIES.length],
    ['Studies complete', STUDIES.filter(s => studyAnsweredCount(state.studies[s.id]) === QUESTIONS.length).length],
    [],
    ['Scoring rubric:'],
    ['  Yes = 1, Partly = 0.5, No = 0, Cannot tell = 0, N/A = excluded from denominator'],
    ['  Score (%) = sum / applicable items × 100'],
    ['  Low concern: ≥ 75% and ≤ 1 No'],
    ['  Some concern: 50–74%, or 2–3 No'],
    ['  High concern: < 50%, or ≥ 4 No'],
    ['  Unclear: manual override only'],
  ];
  const wsMeta = XLSX.utils.aoa_to_sheet(meta);
  wsMeta['!cols'] = [{ wch: 28 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(wb, wsMeta, 'Meta');

  // Filename
  const stamp = new Date().toISOString().slice(0, 10);
  const safeName = (state.name || 'reviewer').replace(/[^a-z0-9_-]+/gi, '_');
  const filename = `SAR_SLR_RoB_${safeName}_${stamp}.xlsx`;
  XLSX.writeFile(wb, filename);
  toast(`Excel exported: ${filename}`);
}

/* ===== Toast ===== */
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.hidden = false;
  setTimeout(() => { el.hidden = true; }, 2400);
}

/* ===== Utils ===== */
function escapeHtml(s) {
  if (s == null) return '';
  return String(s).replace(/[&<>"']/g, c => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  }[c]));
}

/* ===== Boot ===== */
route();
