// Metric Swim Workout Library v5.0 combined app patch
// Adds tabs, workout planner/random selection, intensity map, clickable step details,
// profile times by stroke, better "Choice" pace handling, collapsible sections, Supabase defaults.
(function () {
  const SUPABASE_URL = 'https://qrjmucaneoplywllrcjh.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_8EFScHJJvGXKr2rhhx_W0A_5C-ku-Re';
  const SUPABASE_CFG_KEY = 'metricSwimSupabase.v1';
  const STROKE_PROFILE_KEY = 'metricSwimStrokeProfile.v50';

  function cleanSpaces(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
  function parseTimeToSeconds(value, fallbackSeconds) {
    const s = String(value || '').trim();
    const m = s.match(/^(\d+):([0-5]?\d)$/);
    if (m) return Number(m[1]) * 60 + Number(m[2]);
    const n = Number(s);
    return Number.isFinite(n) && n > 0 ? n : fallbackSeconds;
  }
  function formatTime(seconds) {
    seconds = Math.max(0, Math.round(seconds));
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  }
  function roundTo5(seconds) { return Math.round(seconds / 5) * 5; }

  function saveSupabaseDefaults() {
    try {
      const existing = JSON.parse(localStorage.getItem(SUPABASE_CFG_KEY) || '{}');
      localStorage.setItem(SUPABASE_CFG_KEY, JSON.stringify({
        url: SUPABASE_URL,
        key: SUPABASE_KEY,
        email: existing.email || ''
      }));
      const urlInput = document.getElementById('supabaseUrl');
      const keyInput = document.getElementById('supabaseKey');
      if (urlInput) urlInput.value = SUPABASE_URL;
      if (keyInput) keyInput.value = SUPABASE_KEY;
    } catch (error) {
      console.warn('Unable to save Supabase defaults', error);
    }
  }

  function loadStrokeProfile() {
    const baseFree = document.getElementById('max100Input')?.value || '1:20';
    const saved = JSON.parse(localStorage.getItem(STROKE_PROFILE_KEY) || '{}');
    return {
      free: saved.free || baseFree || '1:20',
      back: saved.back || '1:35',
      breast: saved.breast || '1:45',
      kick: saved.kick || '2:00'
    };
  }
  function saveStrokeProfile(profile) { localStorage.setItem(STROKE_PROFILE_KEY, JSON.stringify(profile)); }

  function cleanIntervalFragments(text) {
    let s = cleanSpaces(text);
    s = s.replace(/([A-Za-z\)])(?=(?:\d{1,2}:|:)\d{2})/g, '$1 ');
    s = s.replace(/(by\s+\d{2,4})(?=(?:\d{1,2}:|:)\d{2})/gi, '$1 ');
    s = s.replace(/(subkick\s+\d+)(?=:\d{2})/gi, '$1 ');
    s = s.replace(/(DPS)(?=(?:\d{1,2}:|:)\d{2})/gi, '$1 ');
    s = s.replace(/(\d{1,2}:\d{2}|:\d{2})(?=(?:\d{1,2}:|:)\d{2})/g, '$1 ');
    s = s.replace(/\[(?:\d{1,2}:\d{2}|:\d{2})?\]/g, ' ');
    s = s.replace(/(?:^|\s)(?:\d{1,2}:\d{2}|:\d{2})(?=\s|$)/g, ' ');
    s = s.replace(/\b(?:\d{1,2}:\d{2}|:\d{2})\b/g, ' ');
    s = s.replace(/\[\]/g, ' ')
      .replace(/\s+-\s*$/g, '')
      .replace(/^\s*[-–—]\s*/g, '')
      .replace(/\s+-\s+/g, ' - ')
      .replace(/\s{2,}/g, ' ')
      .trim();
    return s;
  }
  function cleanWorkoutTitle(text) {
    let s = cleanIntervalFragments(text);
    s = s.replace(/\b(SCY|SCM|LCM)\b/gi, '').replace(/^\s*[-–—]\s*/, '').replace(/\s*[-–—]\s*$/, '').trim();
    return cleanSpaces(s);
  }
  function isGenericTitle(text) {
    const s = cleanSpaces(text).toLowerCase();
    if (!s || s === 'workout') return true;
    if (/^[-–—]?\s*(lcm|scm|scy)$/i.test(s)) return true;
    if (/^\d{3,5}\s*-\s*(lcm|scm|scy)?$/i.test(s)) return true;
    return false;
  }
  function cleanStepName(text) {
    let s = cleanIntervalFragments(text);
    s = s.replace(/\b(Easy|Build|Kick|Free|Choice|Sprint|Faster|Fast|Moderate)(?=[A-Z])/g, '$1 ');
    s = s.replace(/\b(SCY|SCM|LCM)\b/gi, '').trim();
    return s || 'Swim';
  }

  function strokeForText(text) {
    const s = String(text || '').toLowerCase();
    if (s.includes('kick')) return 'kick';
    if (s.includes('breast') || /\bbr\b/.test(s)) return 'breast';
    if (s.includes('back')) return 'back';
    if (s.includes('choice')) return 'choice';
    if (s.includes('im') || s.includes('imo')) return 'choice';
    return 'free';
  }
  function profileTimeForStroke(stroke, profile) {
    if (stroke === 'choice') {
      // Choice is treated as either backstroke or breaststroke. Use slower option for conservative send-off.
      const back = parseTimeToSeconds(profile.back, 95);
      const breast = parseTimeToSeconds(profile.breast, 105);
      return Math.max(back, breast);
    }
    return parseTimeToSeconds(profile[stroke] || profile.free, parseTimeToSeconds(profile.free, 80));
  }
  function zoneParams(text) {
    const s = String(text || '').toLowerCase();
    if (s.includes('sprint') || s.includes('blocks') || s.includes('dive')) return { factor: 1.00, rest: 35, zone: 'Sprint', level: 5, color: '#ef4444' };
    if (s.includes('fast') || s.includes('faster') || s.includes('for time')) return { factor: 1.08, rest: 25, zone: 'Fast', level: 4, color: '#f97316' };
    if (s.includes('build') || s.includes('descend') || s.includes('threshold')) return { factor: 1.18, rest: 18, zone: 'Threshold', level: 3, color: '#eab308' };
    if (s.includes('strong') || s.includes('hold')) return { factor: 1.25, rest: 18, zone: 'Strong', level: 3, color: '#eab308' };
    if (s.includes('easy') || s.includes('smooth')) return { factor: 1.48, rest: 15, zone: 'Recovery', level: 1, color: '#22c55e' };
    if (s.includes('drill') || s.includes('scull') || s.includes('balance')) return { factor: 1.55, rest: 15, zone: 'Technique', level: 1, color: '#60a5fa' };
    if (s.includes('kick')) return { factor: 1.25, rest: 20, zone: 'Kick', level: 2, color: '#a855f7' };
    return { factor: 1.32, rest: 15, zone: 'Aerobic', level: 2, color: '#3b82f6' };
  }
  function parseDistanceFromSetLine(setLine) {
    const qty = setLine.querySelector('.set-qty')?.textContent || '';
    const m = qty.match(/×\s*(\d+)m/i) || qty.match(/(\d+)m/i);
    return m ? Number(m[1]) : 100;
  }
  function setMetrics(setLine) {
    const desc = cleanStepName(setLine.querySelector('.set-desc strong')?.textContent || 'Swim');
    const stroke = strokeForText(desc);
    const profile = loadStrokeProfile();
    const base = profileTimeForStroke(stroke, profile);
    const zone = zoneParams(desc);
    const distance = parseDistanceFromSetLine(setLine);
    const paceSeconds = roundTo5(base * zone.factor);
    const sendoffSeconds = roundTo5((paceSeconds * distance / 100) + zone.rest);
    const swimSeconds = Math.round(paceSeconds * distance / 100);
    const restSeconds = Math.max(0, sendoffSeconds - swimSeconds);
    return { desc, stroke, zone, distance, paceSeconds, sendoffSeconds, swimSeconds, restSeconds };
  }

  function updateVisiblePaces() {
    document.querySelectorAll('.set-line').forEach(function (setLine) {
      const m = setMetrics(setLine);
      const paceNode = setLine.querySelector('.pace');
      const sendoffNode = setLine.querySelector('.sendoff');
      const zoneNode = setLine.querySelector('.zone');
      if (paceNode) paceNode.textContent = `Pace ${formatTime(m.paceSeconds)}/100m`;
      if (sendoffNode) sendoffNode.textContent = `@ ${formatTime(m.sendoffSeconds)}`;
      if (zoneNode) zoneNode.textContent = m.zone.zone;
    });
  }

  function renameWorkoutCards() {
    const cards = Array.from(document.querySelectorAll('.workout-card'));
    cards.forEach(function (card, index) {
      const titleNode = card.querySelector('.card-title');
      const distanceNode = card.querySelector('.card-distance');
      if (!titleNode) return;
      const original = titleNode.textContent || '';
      const cleaned = cleanWorkoutTitle(original);
      const distance = cleanSpaces(distanceNode ? distanceNode.textContent : '');
      const number = String(index + 1).padStart(3, '0');
      if (isGenericTitle(original) || isGenericTitle(cleaned)) {
        titleNode.textContent = distance ? `Workout ${number} - ${distance}` : `Workout ${number}`;
      } else {
        titleNode.textContent = cleaned;
      }
    });
  }
  function cleanDetailTitle() {
    const detailTitle = document.querySelector('.detail-title h2');
    if (!detailTitle) return;
    const cleaned = cleanWorkoutTitle(detailTitle.textContent || '');
    if (!isGenericTitle(cleaned)) { detailTitle.textContent = cleaned; return; }
    const activeTitle = document.querySelector('.workout-card.active .card-title')?.textContent;
    if (activeTitle && !isGenericTitle(activeTitle)) detailTitle.textContent = activeTitle;
  }
  function cleanStepNames() {
    document.querySelectorAll('.set-desc strong').forEach(function (node) { node.textContent = cleanStepName(node.textContent); });
  }

  function setupTabs() {
    const shell = document.querySelector('.shell');
    if (!shell || document.getElementById('appTabs')) return;
    const profilePanel = document.getElementById('max100Input')?.closest('section');
    const cloudPanel = document.querySelector('.cloud-panel') || document.getElementById('cloudStatus')?.closest('section');
    const importPanel = document.getElementById('dropZone')?.closest('section');
    const toolbar = document.querySelector('.toolbar');
    const libraryPanel = document.querySelector('.library-panel');
    const detailPanel = document.querySelector('.detail-panel');
    const layout = document.querySelector('.layout');

    const tabs = document.createElement('section');
    tabs.id = 'appTabs';
    tabs.className = 'app-tabs';
    tabs.innerHTML = `
      <button type="button" class="tab-button active" data-tab="tab-workout">Workout</button>
      <button type="button" class="tab-button" data-tab="tab-library">Library</button>
      <button type="button" class="tab-button" data-tab="tab-profile">Profile / Settings</button>
    `;
    const tabWorkout = document.createElement('section'); tabWorkout.id = 'tab-workout'; tabWorkout.className = 'tab-panel active';
    const tabLibrary = document.createElement('section'); tabLibrary.id = 'tab-library'; tabLibrary.className = 'tab-panel';
    const tabProfile = document.createElement('section'); tabProfile.id = 'tab-profile'; tabProfile.className = 'tab-panel';

    shell.prepend(tabProfile); shell.prepend(tabLibrary); shell.prepend(tabWorkout); shell.prepend(tabs);
    if (toolbar) tabWorkout.appendChild(toolbar);
    if (detailPanel) tabWorkout.appendChild(detailPanel);
    if (libraryPanel) tabLibrary.appendChild(libraryPanel);
    if (profilePanel) tabProfile.appendChild(profilePanel);
    if (cloudPanel) tabProfile.appendChild(cloudPanel);
    if (importPanel) tabProfile.appendChild(importPanel);
    if (layout) layout.remove();

    tabs.querySelectorAll('.tab-button').forEach(function (button) {
      button.addEventListener('click', function () {
        tabs.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        button.classList.add('active');
        document.getElementById(button.dataset.tab)?.classList.add('active');
      });
    });
  }

  function workoutCardsMatchingFilters() {
    return Array.from(document.querySelectorAll('.workout-card')).filter(card => card.offsetParent !== null);
  }
  function setupRandomSelection() {
    const toolbar = document.querySelector('.toolbar');
    if (!toolbar || document.getElementById('randomWorkoutBtn')) return;
    const btn = document.createElement('button');
    btn.id = 'randomWorkoutBtn';
    btn.type = 'button';
    btn.textContent = 'Random matching workout';
    btn.addEventListener('click', function () {
      const cards = workoutCardsMatchingFilters();
      if (!cards.length) { alert('No workouts match the current filters.'); return; }
      const selected = cards[Math.floor(Math.random() * cards.length)];
      selected.click();
      document.querySelector('[data-tab="tab-workout"]')?.click();
      setTimeout(() => document.querySelector('.detail-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    });
    toolbar.appendChild(btn);
  }

  function setupCloudCollapse() {
    const panel = document.querySelector('.cloud-panel') || document.getElementById('cloudStatus')?.closest('section');
    if (!panel || panel.dataset.v50CloudReady) return;
    panel.dataset.v50CloudReady = 'true';
    panel.classList.add('cloud-collapsed');
    ['supabaseUrl', 'supabaseKey'].forEach(function (id) {
      const input = document.getElementById(id);
      const label = input?.closest('label');
      if (label) label.classList.add('technical-supabase-field');
    });
    const heading = panel.querySelector('.panel-heading');
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'secondary compact-toggle'; btn.textContent = 'Show cloud sync';
    btn.addEventListener('click', function () {
      const collapsed = panel.classList.toggle('cloud-collapsed');
      btn.textContent = collapsed ? 'Show cloud sync' : 'Hide cloud sync';
    });
    if (heading) heading.appendChild(btn);
  }
  function setupImportToggle() {
    const dropZone = document.getElementById('dropZone');
    const importPanel = dropZone && dropZone.closest('section');
    if (!importPanel || document.getElementById('toggleImportToolsBtn')) return;
    importPanel.classList.add('import-hidden');
    const btn = document.createElement('button');
    btn.id = 'toggleImportToolsBtn'; btn.type = 'button'; btn.className = 'secondary compact-toggle'; btn.textContent = 'Show import tools';
    btn.addEventListener('click', function () {
      const hidden = importPanel.classList.toggle('import-hidden');
      btn.textContent = hidden ? 'Show import tools' : 'Hide import tools';
    });
    const cloudPanel = document.querySelector('.cloud-panel') || document.querySelector('#cloudStatus')?.closest('section');
    const row = cloudPanel?.querySelector('.button-row') || document.querySelector('.button-row');
    if (row) row.appendChild(btn);
  }
  function collapseCoachNotes() {
    document.querySelectorAll('.notes-section').forEach(function (section) {
      if (section.dataset.v50NotesReady) return;
      section.dataset.v50NotesReady = 'true';
      section.classList.add('coach-notes-collapsed');
      const heading = section.querySelector('h3');
      if (!heading) return;
      const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'secondary compact-toggle notes-toggle'; btn.textContent = 'Show notes';
      btn.addEventListener('click', function () {
        const collapsed = section.classList.toggle('coach-notes-collapsed');
        btn.textContent = collapsed ? 'Show notes' : 'Hide notes';
      });
      heading.appendChild(btn);
    });
  }
  function collapseCoachInstructions() {
    const coachGrid = document.querySelector('.coach-grid');
    const detailPanel = document.querySelector('.detail-panel');
    if (!coachGrid || !detailPanel || coachGrid.dataset.v50Ready) return;
    coachGrid.dataset.v50Ready = 'true'; coachGrid.classList.add('coach-instructions-collapsed');
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'secondary compact-toggle coach-instructions-toggle'; btn.textContent = 'Show session guidance';
    btn.addEventListener('click', function () {
      const collapsed = coachGrid.classList.toggle('coach-instructions-collapsed');
      btn.textContent = collapsed ? 'Show session guidance' : 'Hide session guidance';
    });
    const titleBlock = detailPanel.querySelector('.detail-title');
    if (titleBlock) titleBlock.insertAdjacentElement('afterend', btn);
  }
  function setupStrokeProfileInputs() {
    const maxInput = document.getElementById('max100Input');
    if (!maxInput || document.getElementById('strokeProfileGrid')) return;
    const profile = loadStrokeProfile(); maxInput.value = profile.free;
    const container = document.createElement('div'); container.id = 'strokeProfileGrid'; container.className = 'stroke-profile-grid';
    container.innerHTML = `
      <label>Freestyle 100m<input id="free100Input" value="${profile.free}" inputmode="numeric" placeholder="1:20"></label>
      <label>Backstroke 100m<input id="back100Input" value="${profile.back}" inputmode="numeric" placeholder="1:35"></label>
      <label>Breaststroke 100m<input id="breast100Input" value="${profile.breast}" inputmode="numeric" placeholder="1:45"></label>
      <label>Kick 100m<input id="kick100Input" value="${profile.kick}" inputmode="numeric" placeholder="2:00"></label>`;
    const profileSection = maxInput.closest('section');
    const grid = profileSection?.querySelector('.settings-grid');
    if (grid) grid.insertAdjacentElement('afterend', container);
    function syncProfile() {
      const updated = {
        free: document.getElementById('free100Input')?.value || profile.free,
        back: document.getElementById('back100Input')?.value || profile.back,
        breast: document.getElementById('breast100Input')?.value || profile.breast,
        kick: document.getElementById('kick100Input')?.value || profile.kick
      };
      saveStrokeProfile(updated); maxInput.value = updated.free; updateVisiblePaces(); updateIntensityMap();
    }
    container.querySelectorAll('input').forEach(input => { input.addEventListener('input', syncProfile); input.addEventListener('change', syncProfile); });
  }

  function intensityColor(level) {
    if (level >= 5) return '#ef4444';
    if (level === 4) return '#f97316';
    if (level === 3) return '#eab308';
    if (level === 2) return '#3b82f6';
    return '#22c55e';
  }
  function updateIntensityMap() {
    const detail = document.querySelector('.detail-panel');
    if (!detail) return;
    let map = document.getElementById('selectedIntensityMap');
    const setLines = Array.from(document.querySelectorAll('.detail-panel .set-line'));
    if (!setLines.length) return;
    if (!map) {
      map = document.createElement('section'); map.id = 'selectedIntensityMap'; map.className = 'intensity-map';
      const title = document.querySelector('.detail-title');
      if (title) title.insertAdjacentElement('afterend', map); else detail.prepend(map);
    }
    const metrics = setLines.map(setMetrics);
    const total = metrics.reduce((sum, m) => sum + m.distance, 0) || 1;
    const bars = metrics.map((m, i) => `<button type="button" class="intensity-segment" data-step-index="${i}" title="${m.desc} - ${m.zone.zone}" style="width:${Math.max(4, m.distance / total * 100)}%;background:${intensityColor(m.zone.level)}"></button>`).join('');
    map.innerHTML = `<div class="intensity-title"><strong>Selected workout intensity</strong><span>${metrics.length} steps</span></div><div class="intensity-bar">${bars}</div><div class="intensity-legend"><span class="easy">Easy/Technique</span><span class="aerobic">Aerobic</span><span class="threshold">Threshold</span><span class="fast">Fast/Sprint</span></div>`;
    map.querySelectorAll('.intensity-segment').forEach(btn => btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.stepIndex); setLines[idx]?.click();
    }));
  }

  function setupStepDetails() {
    document.querySelectorAll('.set-line').forEach(function (line, index) {
      if (line.dataset.v50StepReady) return;
      line.dataset.v50StepReady = 'true'; line.tabIndex = 0; line.classList.add('clickable-step');
      const open = function () { showStepDetail(line, index); };
      line.addEventListener('click', open);
      line.addEventListener('keypress', function (e) { if (e.key === 'Enter' || e.key === ' ') open(); });
    });
  }
  function showStepDetail(line, index) {
    const m = setMetrics(line);
    let panel = document.getElementById('stepDetailPanel');
    if (!panel) {
      panel = document.createElement('section'); panel.id = 'stepDetailPanel'; panel.className = 'step-detail-panel';
      document.querySelector('.detail-panel')?.appendChild(panel);
    }
    panel.innerHTML = `<div class="step-detail-head"><strong>Step ${index + 1}: ${m.desc}</strong><button type="button" id="closeStepDetail">Close</button></div>
      <div class="step-detail-grid">
        <div><span>Distance</span><strong>${m.distance}m</strong></div>
        <div><span>Stroke basis</span><strong>${m.stroke === 'choice' ? 'Back/Breast Choice' : m.stroke}</strong></div>
        <div><span>Zone</span><strong>${m.zone.zone}</strong></div>
        <div><span>Target pace</span><strong>${formatTime(m.paceSeconds)}/100m</strong></div>
        <div><span>Estimated swim</span><strong>${formatTime(m.swimSeconds)}</strong></div>
        <div><span>Send-off</span><strong>${formatTime(m.sendoffSeconds)}</strong></div>
        <div><span>Approx rest</span><strong>${formatTime(m.restSeconds)}</strong></div>
      </div>
      <div class="rest-visual"><div style="width:${Math.min(100, Math.max(5, m.swimSeconds / Math.max(1, m.sendoffSeconds) * 100))}%">Swim</div><span>Rest ${formatTime(m.restSeconds)}</span></div>`;
    panel.querySelector('#closeStepDetail')?.addEventListener('click', () => panel.remove());
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function runPatch() {
    try { saveSupabaseDefaults(); } catch (_) {}
    setupTabs(); setupRandomSelection(); setupCloudCollapse(); setupImportToggle(); setupStrokeProfileInputs();
    renameWorkoutCards(); cleanDetailTitle(); cleanStepNames(); collapseCoachNotes(); collapseCoachInstructions();
    updateVisiblePaces(); updateIntensityMap(); setupStepDetails();
  }

  document.addEventListener('DOMContentLoaded', runPatch);
  setTimeout(runPatch, 300); setTimeout(runPatch, 1200); setTimeout(runPatch, 2500);
  const observer = new MutationObserver(() => window.requestAnimationFrame(runPatch));
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
})();
