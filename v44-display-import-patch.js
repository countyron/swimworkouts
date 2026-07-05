// Metric Swim Workout Library v4.4 display/import patch
// - Hides the import section by default with a small "Show import tools" button
// - Cleans interval/send-off fragments out of workout step names at display time
// - Patches parseSetLine for future imports so intervals are stored separately
(function () {
  function cleanSpaces(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }

  function splitDescriptionAndIntervals(rawDescription) {
    let desc = cleanSpaces(rawDescription || '');

    // Fix Word extraction where interval columns are glued onto useful text.
    // Examples:
    // "Drill/Swim by 501:451:501:552:00" -> "Drill/Swim by 50 1:45 1:50 1:55 2:00"
    // "Free - Subkick 60:551:001:051:10" -> "Free - Subkick 60 :55 1:00 1:05 1:10"
    // "Kick1:001:051:101:15" -> "Kick 1:00 1:05 1:10 1:15"
    desc = desc
      .replace(/(by\s+\d{2,4})(?=(?:\d{1,2}:|:)\d{2})/gi, '$1 ')
      .replace(/(subkick\s+\d+)(?=:\d{2})/gi, '$1 ')
      .replace(/(DPS)(?=(?:\d{1,2}:|:)\d{2})/gi, '$1 ')
      .replace(/(Kick|Free|Choice|Swim|Pull|Drill)(?=(?:\d{1,2}:|:)\d{2})/gi, '$1 ')
      .replace(/(\d{1,2}:\d{2}|:\d{2})(?=(?:\d{1,2}:|:)\d{2})/g, '$1 ');

    const intervals = [];
    desc = desc.replace(/(?:^|\s)(\d{1,2}:\d{2}|:\d{2})(?=\s|$)/g, function (_match, time) {
      intervals.push(time.startsWith(':') ? '0' + time : time);
      return ' ';
    });

    desc = desc
      .replace(/\b\d{1,2}\s*sec(?:ond)?s?\s*rest\b/ig, ' ')
      .replace(/\b:\d{2}\s*rest\b/ig, ' ')
      .replace(/\b\d{1,2}:\d{2}\s*rest\b/ig, ' ')
      .replace(/\bon\s+rest\b/ig, ' ')
      .replace(/\brest\b/ig, ' ')
      .replace(/\s+-\s+$/g, '')
      .replace(/^-+\s*/g, '')
      .replace(/\s+-\s+/g, ' - ');

    return { desc: cleanSpaces(desc), intervals };
  }

  window.splitDescriptionAndIntervals = splitDescriptionAndIntervals;

  // Patch future imports, if parseSetLine is available globally in this app build.
  if (typeof window.parseSetLine === 'function') {
    const originalParseSetLine = window.parseSetLine;
    window.parseSetLine = function patchedParseSetLine(line, section, multiplier, lead) {
      const parsed = originalParseSetLine(line, section, multiplier, lead);
      if (!parsed) return parsed;
      const split = splitDescriptionAndIntervals(parsed.desc || '');
      parsed.desc = split.desc || parsed.desc;
      parsed.intervals = Array.from(new Set([...(parsed.intervals || []), ...split.intervals]));
      return parsed;
    };
  }

  // Patch display-time cleaning. This fixes already-imported workouts after re-render.
  if (typeof window.cleanDisplayText === 'function') {
    const originalCleanDisplayText = window.cleanDisplayText;
    window.cleanDisplayText = function patchedCleanDisplayText(text, pool) {
      const split = splitDescriptionAndIntervals(text || '');
      return originalCleanDisplayText(split.desc || text, pool);
    };
  }

  function hideImportSection() {
    const dropZone = document.getElementById('dropZone');
    if (!dropZone) return;
    const section = dropZone.closest('section');
    if (!section) return;
    section.classList.add('import-hidden');

    if (!document.getElementById('toggleImportToolsBtn')) {
      const btn = document.createElement('button');
      btn.id = 'toggleImportToolsBtn';
      btn.type = 'button';
      btn.className = 'secondary compact-import-toggle';
      btn.textContent = 'Show import tools';
      btn.addEventListener('click', function () {
        const hidden = section.classList.toggle('import-hidden');
        btn.textContent = hidden ? 'Show import tools' : 'Hide import tools';
      });

      const cloudPanel = document.querySelector('.cloud-panel') || document.querySelector('#cloudStatus')?.closest('section');
      const targetRow = cloudPanel?.querySelector('.button-row') || document.querySelector('.button-row');
      if (targetRow) targetRow.appendChild(btn);
    }
  }

  function rerenderIfPossible() {
    if (typeof window.render === 'function') {
      try { window.render(); } catch (error) { console.warn('v4.4 patch render refresh failed', error); }
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    hideImportSection();
    setTimeout(rerenderIfPossible, 200);
  });

  // Also run immediately in case app.js loaded after DOMContentLoaded.
  hideImportSection();
  setTimeout(rerenderIfPossible, 300);
})();
