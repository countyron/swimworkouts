// Metric Swim Workout Library v4.6 UI + cleanup patch
// Updates:
// - Collapsible Cloud Sync section
// - Hard-coded Supabase URL/key and hides technical fields
// - Mobile layout: selected workout detail appears above library; clicking a card scrolls to detail
// - Coach notes collapsed by default
// - Adds 100m profile inputs for freestyle, backstroke, breaststroke, and kick
// - Cleans strange workout titles and workout step names already stored in the database
(function () {
  const SUPABASE_URL = 'https://qrjmucaneoplywllrcjh.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_8EFScHJJvGXKr2rhhx_W0A_5C-ku-Re';
  const SUPABASE_CFG_KEY = 'metricSwimSupabase.v1';
  const STROKE_PROFILE_KEY = 'metricSwimStrokeProfile.v46';

  function cleanSpaces(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

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

  function parseTimeToSeconds(value, fallbackSeconds) {
    const s = String(value || '').trim();
    const m = s.match(/^(\d+):([0-5]?\d)$/);
    if (m) return Number(m[1]) * 60 + Number(m[2]);
    const n = Number(s);
    return Number.isFinite(n) && n > 0 ? n : fallbackSeconds;
  }

  function formatTime(seconds) {
    seconds = Math.max(5, Math.round(seconds));
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function roundTo5(seconds) {
    return Math.round(seconds / 5) * 5;
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

  function saveStrokeProfile(profile) {
    localStorage.setItem(STROKE_PROFILE_KEY, JSON.stringify(profile));
  }

  function cleanIntervalFragments(text) {
    let s = cleanSpaces(text);

    // Separate glued intervals from words/numbers.
    s = s.replace(/([A-Za-z\)])(?=(?:\d{1,2}:|:)\d{2})/g, '$1 ');
    s = s.replace(/(by\s+\d{2,4})(?=(?:\d{1,2}:|:)\d{2})/gi, '$1 ');
    s = s.replace(/(subkick\s+\d+)(?=:\d{2})/gi, '$1 ');
    s = s.replace(/(DPS)(?=(?:\d{1,2}:|:)\d{2})/gi, '$1 ');
    s = s.replace(/(\d{1,2}:\d{2}|:\d{2})(?=(?:\d{1,2}:|:)\d{2})/g, '$1 ');

    // Remove bracketed send-offs like [0:40], [2:00], []
    s = s.replace(/\[(?:\d{1,2}:\d{2}|:\d{2})?\]/g, ' ');

    // Remove standalone times like 0:30, 1:45, :55
    s = s.replace(/(?:^|\s)(?:\d{1,2}:\d{2}|:\d{2})(?=\s|$)/g, ' ');
    s = s.replace(/\b(?:\d{1,2}:\d{2}|:\d{2})\b/g, ' ');

    // Clean remaining punctuation/noise.
    s = s.replace(/\[\]/g, ' ')
      .replace(/\s+-\s*$/g, '')
      .replace(/^\s*-\s*/g, '')
      .replace(/\s+-\s+/g, ' - ')
      .replace(/\s{2,}/g, ' ')
      .trim();

    return s;
  }

  function cleanWorkoutTitle(text) {
    let s = cleanIntervalFragments(text);
    s = s.replace(/\b(SCY|SCM|LCM)\b/gi, '').replace(/\s+-\s*$/g, '').replace(/^\s*-\s*/g, '').trim();
    if (!s || /^\d{3,5}$/.test(s)) return 'Workout';
    const m = s.match(/^(\d{3,5})\s*-?\s*$/);
    if (m) return `${m[1]}m Workout`;
    return s;
  }

  function cleanStepName(text) {
    let s = cleanIntervalFragments(text);
    s = s.replace(/\b(Easy|Build|Kick|Free|Choice|Sprint|Faster|Fast|Moderate)(?=[A-Z])/g, '$1 ');
    s = s.replace(/\b(SCY|SCM|LCM)\b/gi, '').trim();
    return s || 'Swim';
  }

  function inferStrokeFromText(text) {
    const s = String(text || '').toLowerCase();
    if (s.includes('kick')) return 'kick';
    if (s.includes('breast') || /\bbr\b/.test(s)) return 'breast';
    if (s.includes('back')) return 'back';
    return 'free';
  }

  function inferZoneFactor(text) {
    const s = String(text || '').toLowerCase();
    if (s.includes('sprint') || s.includes('blocks') || s.includes('dive')) return { factor: 1.00, rest: 35 };
    if (s.includes('fast') || s.includes('faster') || s.includes('for time')) return { factor: 1.08, rest: 25 };
    if (s.includes('build') || s.includes('descend') || s.includes('threshold')) return { factor: 1.18, rest: 18 };
    if (s.includes('strong') || s.includes('hold')) return { factor: 1.25, rest: 18 };
    if (s.includes('easy') || s.includes('smooth')) return { factor: 1.48, rest: 15 };
    if (s.includes('drill') || s.includes('scull') || s.includes('balance')) return { factor: 1.55, rest: 15 };
    if (s.includes('kick')) return { factor: 1.25, rest: 20 }; // applied to kick 100m max, not freestyle max
    return { factor: 1.32, rest: 15 };
  }

  function parseDistanceFromSetLine(setLine) {
    const qty = setLine.querySelector('.set-qty')?.textContent || '';
    const m = qty.match(/×\s*(\d+)m/i) || qty.match(/(\d+)m/i);
    return m ? Number(m[1]) : 100;
  }

  function updateVisiblePaces() {
    const profile = loadStrokeProfile();
    document.querySelectorAll('.set-line').forEach(function (setLine) {
      const desc = setLine.querySelector('.set-desc strong')?.textContent || '';
      const stroke = inferStrokeFromText(desc);
      const base = parseTimeToSeconds(profile[stroke], parseTimeToSeconds(profile.free, 80));
      const zone = inferZoneFactor(desc);
      const distance = parseDistanceFromSetLine(setLine);
      const paceSeconds = roundTo5(base * zone.factor);
      const sendoffSeconds = roundTo5((paceSeconds * distance / 100) + zone.rest);
      const paceNode = setLine.querySelector('.pace');
      const sendoffNode = setLine.querySelector('.sendoff');
      if (paceNode) paceNode.textContent = `Pace ${formatTime(paceSeconds)}/100m`;
      if (sendoffNode) sendoffNode.textContent = `@ ${formatTime(sendoffSeconds)}`;
    });
  }

  function applyTextCleanup() {
    document.querySelectorAll('.card-title').forEach(function (node) {
      const cleaned = cleanWorkoutTitle(node.textContent);
      if (cleaned && node.textContent !== cleaned) node.textContent = cleaned;
    });

    document.querySelectorAll('.set-desc strong').forEach(function (node) {
      const cleaned = cleanStepName(node.textContent);
      if (cleaned && node.textContent !== cleaned) node.textContent = cleaned;
    });
  }

  function setupCloudCollapse() {
    const panel = document.querySelector('.cloud-panel') || document.getElementById('cloudStatus')?.closest('section');
    if (!panel || panel.dataset.v46CloudReady) return;
    panel.dataset.v46CloudReady = 'true';
    panel.classList.add('cloud-collapsed');

    const heading = panel.querySelector('.panel-heading');
    if (!heading) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'secondary compact-toggle';
    btn.textContent = 'Show cloud sync';
    btn.addEventListener('click', function () {
      const collapsed = panel.classList.toggle('cloud-collapsed');
      btn.textContent = collapsed ? 'Show cloud sync' : 'Hide cloud sync';
    });
    heading.appendChild(btn);

    // Hide URL/key technical fields while still hardcoding their values.
    ['supabaseUrl', 'supabaseKey'].forEach(function (id) {
      const input = document.getElementById(id);
      const label = input?.closest('label');
      if (label) label.classList.add('technical-supabase-field');
    });
  }

  function setupImportToggle() {
    const dropZone = document.getElementById('dropZone');
    const importPanel = dropZone && dropZone.closest('section');
    if (!importPanel || document.getElementById('toggleImportToolsBtn')) return;
    importPanel.classList.add('import-hidden');

    const btn = document.createElement('button');
    btn.id = 'toggleImportToolsBtn';
    btn.type = 'button';
    btn.className = 'secondary compact-toggle';
    btn.textContent = 'Show import tools';
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
      if (section.dataset.v46NotesReady) return;
      section.dataset.v46NotesReady = 'true';
      section.classList.add('coach-notes-collapsed');
      const heading = section.querySelector('h3');
      if (!heading) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'secondary compact-toggle notes-toggle';
      btn.textContent = 'Show notes';
      btn.addEventListener('click', function () {
        const collapsed = section.classList.toggle('coach-notes-collapsed');
        btn.textContent = collapsed ? 'Show notes' : 'Hide notes';
      });
      heading.appendChild(btn);
    });
  }

  function setupStrokeProfileInputs() {
    const maxInput = document.getElementById('max100Input');
    if (!maxInput || document.getElementById('strokeProfileGrid')) return;
    const profile = loadStrokeProfile();
    maxInput.value = profile.free;

    const container = document.createElement('div');
    container.id = 'strokeProfileGrid';
    container.className = 'stroke-profile-grid';
    container.innerHTML = `
      <label>Freestyle 100m<input id="free100Input" value="${profile.free}" inputmode="numeric" placeholder="1:20"></label>
      <label>Backstroke 100m<input id="back100Input" value="${profile.back}" inputmode="numeric" placeholder="1:35"></label>
      <label>Breaststroke 100m<input id="breast100Input" value="${profile.breast}" inputmode="numeric" placeholder="1:45"></label>
      <label>Kick 100m<input id="kick100Input" value="${profile.kick}" inputmode="numeric" placeholder="2:00"></label>
    `;

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
      saveStrokeProfile(updated);
      maxInput.value = updated.free;
      try { maxInput.dispatchEvent(new Event('input', { bubbles: true })); } catch (_) {}
      updateVisiblePaces();
    }

    container.querySelectorAll('input').forEach(function (input) {
      input.addEventListener('input', syncProfile);
      input.addEventListener('change', syncProfile);
    });
  }

  function setupMobileDetailScroll() {
    const list = document.getElementById('workoutList');
    if (!list || list.dataset.v46ScrollReady) return;
    list.dataset.v46ScrollReady = 'true';
    list.addEventListener('click', function () {
      setTimeout(function () {
        document.querySelector('.detail-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    });
  }

  function runPatch() {
    saveSupabaseDefaults();
    setupCloudCollapse();
    setupImportToggle();
    setupStrokeProfileInputs();
    setupMobileDetailScroll();
    applyTextCleanup();
    collapseCoachNotes();
    updateVisiblePaces();
  }

  document.addEventListener('DOMContentLoaded', runPatch);
  setTimeout(runPatch, 300);
  setTimeout(runPatch, 1200);

  const observer = new MutationObserver(function () {
    window.requestAnimationFrame(runPatch);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
})();
