// Metric Swim Workout Library v4.5 DOM cleanup patch
// Fixes already-rendered strange workout names and step names without requiring re-import.
(function () {
  function cleanSpaces(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function cleanIntervalFragments(text) {
    let s = cleanSpaces(text);

    // Add a separator before glued time values, e.g. Build0:30, Easy1:50, Sprint0:40.
    s = s.replace(/([A-Za-z\)])(?=(?:\d{1,2}:|:)\d{2})/g, '$1 ');

    // Add a separator between back-to-back intervals.
    s = s.replace(/(\d{1,2}:\d{2}|:\d{2})(?=(?:\d{1,2}:|:)\d{2})/g, '$1 ');

    // Remove bracketed send-offs and empty brackets: [0:40], [2:00], []
    s = s.replace(/\[(?:\d{1,2}:\d{2}|:\d{2})?\]/g, ' ');

    // Remove standalone send-offs: 0:30, 1:45, :55
    s = s.replace(/(?:^|\s)(?:\d{1,2}:\d{2}|:\d{2})(?=\s|$)/g, ' ');

    // Remove send-offs that may still be glued after a word after spacing.
    s = s.replace(/\b(?:\d{1,2}:\d{2}|:\d{2})\b/g, ' ');

    // Remove obvious empty leftover brackets / punctuation.
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

    // Remove source course suffixes when the card already displays metric distance separately.
    s = s.replace(/\b(SCY|SCM|LCM)\b/gi, '').replace(/\s+-\s*$/g, '').replace(/^\s*-\s*/g, '').trim();

    // If the title is only a distance or blank, use a simple neutral title.
    if (!s || /^\d{3,5}$/.test(s)) return 'Workout';
    if (/^\d{3,5}\s*-?\s*$/.test(s)) return 'Workout';

    // If title is something like "1800 -" after removing LCM, show it as a distance workout.
    const m = s.match(/^(\d{3,5})\s*-?\s*$/);
    if (m) return `${m[1]}m Workout`;

    return s;
  }

  function cleanStepName(text) {
    let s = cleanIntervalFragments(text);

    // Clean common no-space cases from imported descriptions.
    s = s.replace(/\b(Easy|Build|Kick|Free|Choice|Sprint|Faster|Fast|Moderate)(?=[A-Z])/g, '$1 ');

    // Remove course labels from step names.
    s = s.replace(/\b(SCY|SCM|LCM)\b/gi, '').trim();

    return s || 'Swim';
  }

  function cleanupRenderedText() {
    document.querySelectorAll('.card-title').forEach(function (node) {
      const cleaned = cleanWorkoutTitle(node.textContent);
      if (cleaned && node.textContent !== cleaned) node.textContent = cleaned;
    });

    document.querySelectorAll('.set-desc strong').forEach(function (node) {
      const cleaned = cleanStepName(node.textContent);
      if (cleaned && node.textContent !== cleaned) node.textContent = cleaned;
    });

    // Hide import panel by default; keep the toggle button if the prior patch has added it.
    const dropZone = document.getElementById('dropZone');
    const importPanel = dropZone && dropZone.closest('section');
    if (importPanel && !importPanel.classList.contains('import-hidden')) {
      importPanel.classList.add('import-hidden');
    }
  }

  function addImportToggleIfMissing() {
    if (document.getElementById('toggleImportToolsBtn')) return;
    const dropZone = document.getElementById('dropZone');
    const importPanel = dropZone && dropZone.closest('section');
    if (!importPanel) return;

    const btn = document.createElement('button');
    btn.id = 'toggleImportToolsBtn';
    btn.type = 'button';
    btn.className = 'secondary compact-import-toggle';
    btn.textContent = 'Show import tools';
    btn.addEventListener('click', function () {
      const hidden = importPanel.classList.toggle('import-hidden');
      btn.textContent = hidden ? 'Show import tools' : 'Hide import tools';
    });

    const cloudPanel = document.querySelector('.cloud-panel') || document.querySelector('#cloudStatus')?.closest('section');
    const row = cloudPanel?.querySelector('.button-row') || document.querySelector('.button-row');
    if (row) row.appendChild(btn);
  }

  function runCleanup() {
    addImportToggleIfMissing();
    cleanupRenderedText();
  }

  document.addEventListener('DOMContentLoaded', runCleanup);
  setTimeout(runCleanup, 300);
  setTimeout(runCleanup, 1200);

  const observer = new MutationObserver(function () {
    window.requestAnimationFrame(runCleanup);
  });

  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
})();
