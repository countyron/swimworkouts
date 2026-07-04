/* Swim Workout Library - v3 Supabase cloud sync MVP
   Pure browser processing. .docx import uses a minimal ZIP reader and DecompressionStream. */

const STORAGE_KEY = 'metricSwimLibrary.v1';
const PROFILE_KEY = 'metricSwimProfile.v1';
const SUPABASE_CFG_KEY = 'metricSwimSupabase.v1';
let workouts = [];
let selectedId = null;
let deferredPrompt = null;

const $ = (id) => document.getElementById(id);
const refs = {
  pool: $('poolSelect'), max100: $('max100Input'), mode: $('modeSelect'), round: $('roundSelect'),
  fileInput: $('fileInput'), drop: $('dropZone'), log: $('importLog'), list: $('workoutList'), count: $('countBadge'),
  search: $('searchInput'), focus: $('focusFilter'), distance: $('distanceFilter'),
  detail: $('workoutDetail'), empty: $('emptyState'), save: $('saveStatus'), install: $('installBtn'),
  supabaseUrl: $('supabaseUrl'), supabaseKey: $('supabaseKey'), supabaseEmail: $('supabaseEmail'), cloudStatus: $('cloudStatus'),
  saveSupabaseBtn: $('saveSupabaseBtn'), magicLinkBtn: $('magicLinkBtn'), syncUpBtn: $('syncUpBtn'), syncDownBtn: $('syncDownBtn'), signOutBtn: $('signOutBtn')
};

function uid() { return crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()); }
function cleanSpaces(s) { return (s || '').replace(/\s+/g, ' ').trim(); }
function parseTimeToSec(value) {
  const s = String(value || '').trim();
  if (!s) return 80;
  const m = s.match(/^(\d+):([0-5]?\d)$/);
  if (m) return Number(m[1]) * 60 + Number(m[2]);
  const n = Number(s);
  return Number.isFinite(n) ? n : 80;
}
function formatTime(sec) {
  sec = Math.max(5, Math.round(sec));
  const m = Math.floor(sec / 60); const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
function roundSec(sec) { const r = Number(refs.round.value || 5); return Math.round(sec / r) * r; }
function profile() { return { pool: refs.pool.value, max100: refs.max100.value || '1:20', mode: refs.mode.value, round: refs.round.value }; }
function saveProfile() { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile())); refs.save.textContent = 'Saved locally'; render(); }
function loadProfile() {
  const p = JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}');
  refs.pool.value = p.pool || '25'; refs.max100.value = p.max100 || '1:20'; refs.mode.value = p.mode || 'normal'; refs.round.value = p.round || '5';
}
function saveLibrary() { localStorage.setItem(STORAGE_KEY, JSON.stringify(workouts)); refs.count.textContent = `${workouts.length} workout${workouts.length === 1 ? '' : 's'}`; }
function loadLibrary() { workouts = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }

const intervalRe = /(?:^|\s)(\d{1,2}:\d{2}|0?:\d{2})(?:\s|$)/g;
const setRe = /^-?\s*(\d+)\s*x\s*(\d+)\b\s*(.*)$/i;
const singleRe = /^-?\s*(\d{2,4})\s+(swim|free|choice|kick|pull|drill|easy|moderate|fast)\b\s*(.*)$/i;

function parseWorkoutFromText(fileName, text) {
  const rawLines = String(text || '').split(/\r?\n/).map(l => cleanSpaces(l.replace(/\t/g, ' '))).filter(Boolean);
  const totalMatch = text.match(/Total\s+Distance\s*[-:=]?\s*([0-9,]{3,5})/i) || fileName.match(/[-_\s]([0-9]{3,5})[-_\s]/);
  const sourceDistance = totalMatch ? Number(totalMatch[1].replace(/,/g, '')) : null;
  const dateMatch = fileName.match(/(\d{4})[.\-_](\d{1,2})[.\-_](\d{1,2})/);
  const date = dateMatch ? `${dateMatch[1]}-${dateMatch[2].padStart(2,'0')}-${dateMatch[3].padStart(2,'0')}` : '';
  const title = fileName.replace(/\.docx$|\.txt$/i, '').replace(/\s*-\s*SCY/i, '').replace(/\s*-\s*\d{3,5}\s*$/,'');

  let sets = [], notes = [], section = 'warm up', repeatMultiplier = 1, pendingComment = '';
  let inNotes = false;
  for (let rawLine of rawLines) {
    let line = rawLine.replace(/^\*|\*$/g, '').trim();
    if (/^cool\s*down/i.test(line)) { section = 'cool down'; continue; }
    if (/^note for this set/i.test(line)) { inNotes = true; section = 'notes'; continue; }
    if (/^total\s+distance/i.test(line)) continue;
    const repeat = line.match(/^Repeat\s+(\d+)x/i);
    if (repeat) { repeatMultiplier = Number(repeat[1]); section = 'main set'; continue; }
    if (inNotes || /^-\s*(Variable|Under|Fast|Smooth|Strong|Balance|Off Blocks|On the|If your|4x50|None)/i.test(line)) {
      notes.push(line.replace(/^[-\s]+/, ''));
      continue;
    }
    if (/^\d+:\d{2}\s+Rest$/i.test(line) || /^-?\s*:\d{2}\s+Rest$/i.test(line)) continue;

    const parsed = parseSetLine(line, section, repeatMultiplier, pendingComment);
    if (parsed) {
      sets.push(parsed);
      pendingComment = '';
      if (!line.startsWith('-')) repeatMultiplier = 1;
    } else if (sets.length && /fast|easy|moderate|build|descend|sprint|under|over/i.test(line)) {
      sets[sets.length - 1].subNotes.push(line);
    } else {
      pendingComment = line;
    }
    if (sets.length > 3) section = 'main set';
  }

  const rawText = rawLines.join('\n');
  const focus = detectTags(rawText);
  const metricEstimate25 = metricTotal(sets, 25);
  const metricEstimate50 = metricTotal(sets, 50);
  const explanation = buildExplanation(focus, rawText, notes);
  return { id: uid(), fileName, date, title, sourceDistance, sets, notes, focus, explanation, metricEstimate25, metricEstimate50, importedAt: new Date().toISOString() };
}

function parseSetLine(line, section, multiplier, lead) {
  let m = line.match(setRe);
  let reps, distance, desc;
  if (m) { reps = Number(m[1]); distance = Number(m[2]); desc = cleanSpaces(m[3]); }
  else {
    m = line.match(singleRe);
    if (!m) return null;
    reps = 1; distance = Number(m[1]); desc = cleanSpaces(`${m[2]} ${m[3] || ''}`);
  }
  const intervals = [...line.matchAll(intervalRe)].map(x => x[1].replace(/^0:/, '0:'));
  desc = desc
    .replace(intervalRe, ' ')
    .replace(/(?:^|\s)\d+(?=\s|$)/g, ' ')
    .replace(/:?\d{1,2}\s*Rest/ig, '')
    .replace(/\bon\s+Rest/ig, '')
    .replace(/\brest\b/ig, '')
    .trim(' -');
  let finalDesc = cleanSpaces((lead ? lead + ' ' : '') + desc);
  if (!finalDesc || /^[:\d\s]+$/.test(finalDesc)) finalDesc = inferBareSetLabel(distance, section, line);
  return { reps, distance, desc: finalDesc, section, multiplier: multiplier || 1, intervals, subNotes: [], originalLine: line };
}

function inferBareSetLabel(distance, section, line) {
  const l = `${section || ''} ${line || ''}`.toLowerCase();
  if (l.includes('kick')) return 'Kick';
  if (l.includes('sprint')) return 'Sprint';
  if (l.includes('fast')) return 'Fast swim';
  if (l.includes('easy')) return 'Easy swim';
  if (l.includes('moderate')) return 'Moderate swim';
  if (l.includes('build')) return 'Build swim';
  if (l.includes('descend')) return 'Descend swim';
  if (distance <= 50) return 'Swim';
  return 'Swim';
}

function detectTags(text) {
  const s = text.toLowerCase();
  const tags = [];
  const add = (name, words) => { if (words.some(w => s.includes(w))) tags.push(name); };
  add('speed', ['fast', 'sprint', 'faster', 'for time', 'blocks', 'dive']);
  add('technique', ['drill', 'scull', 'balance', 'underwater', 'under/over']);
  add('kick', ['kick']);
  add('endurance', ['smooth', 'strong', 'moderate', 'hold']);
  add('threshold', ['descend', 'pace', 'build']);
  add('freestyle', ['free']);
  add('choice/IM', ['choice', 'imo', 'fly', 'back', 'breast']);
  return [...new Set(tags)];
}

function convertDistance(distance, poolLength) {
  if (poolLength === 25) return distance; // practical metric mapping
  if (distance < 50) return 50;
  return Math.ceil(distance / 50) * 50;
}
function metricTotal(sets, poolLength) { return sets.reduce((sum, s) => sum + s.reps * s.multiplier * convertDistance(s.distance, poolLength), 0); }
function workoutDistance(w) { return refs.pool.value === '50' ? w.metricEstimate50 : w.metricEstimate25; }

function analyseSet(set) {
  const max = parseTimeToSec(refs.max100.value);
  const text = `${set.desc} ${(set.subNotes || []).join(' ')}`.toLowerCase();
  let zone = 'Aerobic', emoji = '🔵', factor = 1.32, rest = 15, purpose = 'Controlled repeatable swimming';

  if (text.includes('kick')) { zone = 'Kick'; emoji = '🟣'; factor = 1.65; rest = 20; purpose = 'Leg conditioning and body position'; }
  if (text.includes('drill') || text.includes('scull') || text.includes('balance')) { zone = 'Technique'; emoji = '🟢'; factor = 1.55; rest = 15; purpose = 'Stroke control and feel for the water'; }
  if (text.includes('easy') || text.includes('smooth')) { zone = 'Recovery'; emoji = '🟢'; factor = 1.48; rest = 15; purpose = 'Controlled recovery without losing form'; }
  if (text.includes('moderate')) { zone = 'Aerobic'; emoji = '🔵'; factor = 1.35; rest = 15; purpose = 'Sustainable aerobic rhythm'; }
  if (text.includes('strong') || text.includes('hold')) { zone = 'Strong'; emoji = '🟡'; factor = 1.25; rest = 18; purpose = 'Firm sustainable pace under control'; }
  if (text.includes('build') || text.includes('descend') || text.includes('threshold')) { zone = 'Threshold'; emoji = '🟡'; factor = 1.18; rest = 18; purpose = 'Progressive pacing and controlled speed'; }
  if (text.includes('fast') || text.includes('faster') || text.includes('for time')) { zone = 'Fast'; emoji = '🟠'; factor = 1.08; rest = 25; purpose = 'High-quality speed while holding form'; }
  if (text.includes('sprint') || text.includes('blocks') || text.includes('dive')) { zone = 'Sprint'; emoji = '🔴'; factor = 1.00; rest = 35; purpose = 'Maximum speed with full technical focus'; }

  if (refs.mode.value === 'recovery') { factor += 0.08; rest += 12; }
  if (refs.mode.value === 'hard') { factor = Math.max(0.96, factor - 0.04); rest = Math.max(5, rest - 8); }

  const pace = Math.max(20, roundSec(max * factor));
  const d = convertDistance(set.distance, Number(refs.pool.value));
  const sendoff = roundSec((pace * d / 100) + rest);
  return { zone, emoji, factor, rest, pace, paceText: formatTime(pace), sendoff, sendoffText: formatTime(sendoff), purpose };
}
function sendOff(set) { return analyseSet(set).sendoffText; }
function paceForSet(set) { return analyseSet(set).paceText; }
function zoneForSet(set) { return analyseSet(set); }
function paceDisplay(set) {
  const a = analyseSet(set);
  const text = `${set.desc} ${(set.subNotes || []).join(' ')}`.toLowerCase();
  if (text.includes('descend')) {
    return `${formatTime(roundSec(a.pace + 8))} → ${formatTime(roundSec(Math.max(20, a.pace - 6)))}/100m`;
  }
  if (text.includes('build')) {
    return `${formatTime(roundSec(a.pace + 10))} → ${a.paceText}/100m`;
  }
  if (text.includes('variable')) {
    return `${a.paceText}/100m on fast sections`;
  }
  return `${a.paceText}/100m`;
}
function workoutPaceSummary(w) {
  let weighted = 0, metres = 0, fastest = Infinity;
  for (const s of w.sets || []) {
    const d = convertDistance(s.distance, Number(refs.pool.value)) * s.reps * s.multiplier;
    const a = analyseSet(s);
    weighted += a.pace * d;
    metres += d;
    fastest = Math.min(fastest, a.pace);
  }
  if (!metres) return { average: '-', fastest: '-' };
  return { average: `${formatTime(roundSec(weighted / metres))}/100m`, fastest: `${formatTime(roundSec(fastest))}/100m` };
}

function buildExplanation(tags, rawText, notes) {
  const hasSpeed = tags.includes('speed'), hasKick = tags.includes('kick'), hasTechnique = tags.includes('technique'), hasThreshold = tags.includes('threshold');
  let goal = 'Build a balanced swim session with controlled effort, good technique and repeatable pacing.';
  if (hasSpeed && hasThreshold) goal = 'Develop pace control and speed changes while maintaining efficient technique under fatigue.';
  else if (hasSpeed) goal = 'Practise high-quality fast swimming with enough recovery to hold form.';
  else if (hasTechnique) goal = 'Improve body position, feel for the water and stroke control before progressing into the main work.';
  else if (hasKick) goal = 'Build leg fitness and body position while maintaining controlled swimming rhythm.';
  const approach = [
    hasTechnique ? 'Treat drill and scull work as skill rehearsal, not filler. Keep the movement deliberate.' : 'Use the early work to settle breathing and stroke length.',
    hasThreshold ? 'On build or descend sets, increase speed gradually rather than sprinting the first repeat.' : 'Keep moderate work sustainable and repeatable.',
    hasSpeed ? 'Fast sections should be sharp, but stop short of losing body position or stroke timing.' : 'Use the send-offs as a guide, but prioritise consistent form.'
  ].join(' ');
  const mistakes = [
    hasSpeed ? 'Going all-out too early and losing form on later fast repeats.' : 'Turning moderate swimming into recovery swimming.',
    hasKick ? 'Letting kick sets become passive rather than purposeful.' : 'Ignoring body position during easier parts.',
    'Forgetting that the goal is controlled execution, not just completing the distance.'
  ];
  return { goal, approach, mistakes };
}

function render() {
  saveLibrary();
  const filters = getFilters();
  const visible = workouts.filter(w => matches(w, filters));
  refs.list.innerHTML = '';
  refs.count.textContent = `${visible.length}/${workouts.length} workout${workouts.length === 1 ? '' : 's'}`;
  const tpl = $('cardTemplate');
  for (const w of visible) {
    const node = tpl.content.firstElementChild.cloneNode(true);
    node.dataset.id = w.id;
    node.classList.toggle('active', selectedId === w.id);
    node.querySelector('.card-title').textContent = displayTitle(w);
    node.querySelector('.card-distance').textContent = `${workoutDistance(w)}m`;
    node.querySelector('.card-summary').textContent = w.explanation?.goal || 'Metric workout session.';
    const row = node.querySelector('.tag-row');
    (w.focus || []).slice(0, 5).forEach(t => row.append(tag(t)));
    node.onclick = () => { selectedId = w.id; render(); };
    refs.list.append(node);
  }
  const selected = workouts.find(w => w.id === selectedId) || visible[0];
  if (selected) { selectedId = selected.id; renderDetail(selected); } else { refs.detail.classList.add('hidden'); refs.empty.classList.remove('hidden'); }
}
function tag(text) { const span = document.createElement('span'); span.className = 'tag'; span.textContent = text; return span; }
function displayTitle(w) { return cleanSpaces(w.title || w.fileName || 'Workout').replace(/^\d{4}[.\-_]\d{1,2}[.\-_]\d{1,2}\s*-?\s*/, '') || 'Workout'; }
function getFilters() { return { q: refs.search.value.trim().toLowerCase(), focus: refs.focus.value, dist: refs.distance.value }; }
function matches(w, f) {
  const d = workoutDistance(w);
  const hay = [displayTitle(w), w.fileName, ...(w.focus || []), ...(w.notes || []), ...w.sets.map(s => s.desc)].join(' ').toLowerCase();
  if (f.q && !hay.includes(f.q)) return false;
  if (f.focus && !(w.focus || []).includes(f.focus)) return false;
  if (f.dist) { const [lo, hi] = f.dist.split('-').map(Number); if (d < lo || d > hi) return false; }
  return true;
}
function renderDetail(w) {
  refs.empty.classList.add('hidden'); refs.detail.classList.remove('hidden');
  const pool = Number(refs.pool.value);
  const total = workoutDistance(w);
  const max100 = refs.max100.value || '1:20';
  const paceSummary = workoutPaceSummary(w);
  refs.detail.innerHTML = `
    <div class="detail-title">
      <div><p class="eyebrow">${pool}m pool • pace-first workout engine</p><h2>${escapeHtml(displayTitle(w))}</h2></div>
      <span class="status-pill">Metric</span>
    </div>
    <div class="kpi-grid v2-kpis">
      <div class="kpi"><span>Session distance</span><strong>${total}m</strong></div>
      <div class="kpi"><span>Pool length</span><strong>${pool}m</strong></div>
      <div class="kpi"><span>Max 100m</span><strong>${escapeHtml(max100)}</strong></div>
      <div class="kpi"><span>Estimated time</span><strong>${estimateMinutes(total)} min</strong></div>
      <div class="kpi"><span>Average target pace</span><strong>${paceSummary.average}</strong></div>
      <div class="kpi"><span>Fastest target pace</span><strong>${paceSummary.fastest}</strong></div>
    </div>
    <div class="tag-row">${(w.focus || []).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>
    <div class="coach-grid">
      <div class="coach-card"><h3>Session Goal</h3><p>${escapeHtml(w.explanation?.goal || '')}</p></div>
      <div class="coach-card"><h3>How to Swim It</h3><p>${escapeHtml(w.explanation?.approach || '')}</p></div>
      <div class="coach-card"><h3>Common Mistakes</h3><p>${(w.explanation?.mistakes || []).map(escapeHtml).join('<br>')}</p></div>
      <div class="coach-card"><h3>Personal Advice</h3><p>Each line now shows target pace per 100m first, then the calculated send-off. Change your ${escapeHtml(max100)} max 100m time or session mode to tune the entire workout instantly.</p></div>
    </div>
    <section class="sets-section">
      <h3>Workout Steps</h3>
      <p class="small muted">Each step includes zone, target pace per 100m, calculated send-off and purpose.</p>
      ${w.sets.map(s => renderSet(s, pool)).join('')}
    </section>
    ${renderGlossary(w)}
    ${w.notes?.length ? `<section class="notes-section"><h3>Coach Notes</h3><ul>${w.notes.filter(n=>!/^none$/i.test(n)).map(n => `<li>${escapeHtml(n)}</li>`).join('')}</ul></section>` : ''}
  `;
}
function renderSet(s, pool) {
  const d = convertDistance(s.distance, pool);
  const reps = s.multiplier > 1 ? `${s.multiplier} × (${s.reps} × ${d}m)` : `${s.reps} × ${d}m`;
  const desc = cleanDisplayText(s.desc || 'Swim', pool);
  const sub = (s.subNotes || []).map(x => cleanDisplayText(x, pool)).join(' • ');
  const a = analyseSet(s);
  return `<div class="set-line v2-set">
    <div class="set-qty">${reps}</div>
    <div class="set-desc">
      <strong>${escapeHtml(desc)}</strong>${sub ? `<small>${escapeHtml(sub)}</small>` : ''}
      <small class="purpose">${escapeHtml(a.purpose)}</small>
    </div>
    <div class="set-metrics">
      <span class="zone zone-${a.zone.toLowerCase().replace(/[^a-z]/g,'')}">${a.emoji} ${escapeHtml(a.zone)}</span>
      <span class="pace">Pace ${paceDisplay(s)}</span>
      <span class="sendoff">@ ${a.sendoffText}</span>
    </div>
  </div>`;
}
function renderGlossary(w) {
  const text = [w.fileName, ...(w.notes || []), ...(w.sets || []).map(s => `${s.desc} ${(s.subNotes || []).join(' ')}`)].join(' ').toLowerCase();
  const items = [
    ['Variable Sprint', 'Alternates fast and easy portions within each repeat; focus on changing gears cleanly.'],
    ['Fast in the Black', 'Swim fast in the final marked section near the wall, then return to controlled pace.'],
    ['Under/Over/Easy', 'Underwater kick, fast swim over the water, then easy recovery swim.'],
    ['Descend', 'Each repeat gets faster while keeping technique controlled.'],
    ['Build', 'Start controlled and gradually increase effort through the repeat.'],
    ['Smooth', 'Faster than easy, slower than moderate; relaxed but purposeful.'],
    ['Strong', 'Faster than moderate, but not all-out fast.'],
    ['For Time', 'A benchmark swim. Prioritise best sustainable speed and accurate timing.'],
    ['Off Blocks', 'Start practice; if blocks are unavailable, treat as a normal sprint from the wall.'],
    ['Balance Drill', 'Body-position drill; prioritise alignment and control rather than speed.']
  ].filter(([term]) => text.includes(term.toLowerCase()));
  if (!items.length) return '';
  return `<section class="glossary-section"><h3>Coach Glossary</h3><div class="glossary-grid">${items.map(([term, def]) => `<details><summary>${escapeHtml(term)}</summary><p>${escapeHtml(def)}</p></details>`).join('')}</div></section>`;
}

function cleanDisplayText(text, pool) {
  return cleanSpaces(text)
    .replace(/\byards?\b|\byds?\b|\bSCY\b/ig, 'm')
    .replace(/\b25\b(?=\s*(fast|moderate|easy|sprint|kick|swim|free|choice|drill|faster|build|$))/ig, pool === 50 ? '50' : '25')
    .replace(/\bby\s+25\b/ig, `by ${pool === 50 ? 50 : 25}m`)
    .replace(/\b25m?\b/ig, pool === 50 ? '50m' : '25m');
}
function estimateMinutes(distance) { const max = parseTimeToSec(refs.max100.value); return Math.max(20, Math.round(distance / 100 * (max * 1.45 / 60 + .25))); }
function escapeHtml(s) { return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

async function importFiles(files) {
  refs.log.textContent = 'Importing...';
  let added = 0, failed = 0;
  for (const file of files) {
    try {
      const text = file.name.toLowerCase().endsWith('.docx') ? await docxToText(file) : await file.text();
      workouts.push(parseWorkoutFromText(file.name, text)); added++;
    } catch (err) { console.error(err); failed++; }
  }
  saveLibrary();
  refs.log.textContent = `Imported ${added} workout${added === 1 ? '' : 's'}${failed ? `; ${failed} failed` : ''}.`;
  render();
}

async function docxToText(file) {
  const ab = await file.arrayBuffer();
  const xmlText = await extractZipText(ab, 'word/document.xml');
  const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
  const paragraphs = [...doc.getElementsByTagNameNS('*', 'p')];
  const lines = paragraphs.map(p => {
    let out = '';
    for (const node of p.getElementsByTagNameNS('*', 't')) out += node.textContent;
    const tabs = p.getElementsByTagNameNS('*', 'tab').length;
    if (tabs) out = out.replace(/\s+/g, ' ') + ' '.repeat(tabs);
    return cleanSpaces(out);
  }).filter(Boolean);
  return lines.join('\n');
}
async function extractZipText(arrayBuffer, wantedName) {
  const view = new DataView(arrayBuffer);
  const u8 = new Uint8Array(arrayBuffer);
  let eocd = -1;
  for (let i = u8.length - 22; i >= Math.max(0, u8.length - 66000); i--) {
    if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('Invalid DOCX/ZIP');
  const entries = view.getUint16(eocd + 10, true);
  let cdOffset = view.getUint32(eocd + 16, true);
  const dec = new TextDecoder();
  for (let e = 0; e < entries; e++) {
    if (view.getUint32(cdOffset, true) !== 0x02014b50) throw new Error('Bad ZIP central directory');
    const method = view.getUint16(cdOffset + 10, true);
    const compSize = view.getUint32(cdOffset + 20, true);
    const nameLen = view.getUint16(cdOffset + 28, true);
    const extraLen = view.getUint16(cdOffset + 30, true);
    const commentLen = view.getUint16(cdOffset + 32, true);
    const localOffset = view.getUint32(cdOffset + 42, true);
    const name = dec.decode(u8.slice(cdOffset + 46, cdOffset + 46 + nameLen));
    if (name === wantedName) {
      const localNameLen = view.getUint16(localOffset + 26, true);
      const localExtraLen = view.getUint16(localOffset + 28, true);
      const start = localOffset + 30 + localNameLen + localExtraLen;
      const compData = u8.slice(start, start + compSize);
      if (method === 0) return dec.decode(compData);
      if (method === 8) {
        if (!('DecompressionStream' in window)) throw new Error('This browser cannot decompress DOCX files. Try current Edge/Chrome/Safari, or import JSON.');
        const stream = new Blob([compData]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
        return dec.decode(await new Response(stream).arrayBuffer());
      }
      throw new Error('Unsupported ZIP compression method: ' + method);
    }
    cdOffset += 46 + nameLen + extraLen + commentLen;
  }
  throw new Error('DOCX document.xml not found');
}

let supabaseClient = null;
let currentUser = null;

function loadSupabaseConfig() {
  const cfg = JSON.parse(localStorage.getItem(SUPABASE_CFG_KEY) || '{}');
  if (refs.supabaseUrl) refs.supabaseUrl.value = cfg.url || '';
  if (refs.supabaseKey) refs.supabaseKey.value = cfg.key || '';
  if (refs.supabaseEmail) refs.supabaseEmail.value = cfg.email || '';
  initSupabaseClient(false);
}

function saveSupabaseConfig() {
  const cfg = {
    url: (refs.supabaseUrl?.value || '').trim().replace(/\/$/, ''),
    key: (refs.supabaseKey?.value || '').trim(),
    email: (refs.supabaseEmail?.value || '').trim()
  };
  localStorage.setItem(SUPABASE_CFG_KEY, JSON.stringify(cfg));
  initSupabaseClient(true);
}

function setCloudStatus(text, ok = false) {
  if (!refs.cloudStatus) return;
  refs.cloudStatus.textContent = text;
  refs.cloudStatus.classList.toggle('cloud-ok', ok);
}

async function initSupabaseClient(showStatus = true) {
  const cfg = JSON.parse(localStorage.getItem(SUPABASE_CFG_KEY) || '{}');
  if (!cfg.url || !cfg.key || !window.supabase?.createClient) {
    supabaseClient = null;
    currentUser = null;
    if (showStatus) setCloudStatus('Not connected');
    return;
  }
  try {
    supabaseClient = window.supabase.createClient(cfg.url, cfg.key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    const { data } = await supabaseClient.auth.getSession();
    currentUser = data?.session?.user || null;
    setCloudStatus(currentUser ? `Signed in: ${currentUser.email}` : 'Connected - sign in required', Boolean(currentUser));
    supabaseClient.auth.onAuthStateChange((_event, session) => {
      currentUser = session?.user || null;
      setCloudStatus(currentUser ? `Signed in: ${currentUser.email}` : 'Connected - sign in required', Boolean(currentUser));
    });
  } catch (err) {
    console.error(err);
    setCloudStatus('Connection error');
  }
}

async function sendMagicLink() {
  saveSupabaseConfig();
  if (!supabaseClient) return alert('Enter and save your Supabase URL and publishable/anon key first.');
  const email = (refs.supabaseEmail?.value || '').trim();
  if (!email) return alert('Enter your email address first.');
  const { error } = await supabaseClient.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.href.split('#')[0] }
  });
  if (error) return alert(`Magic link error: ${error.message}`);
  setCloudStatus('Magic link sent - check email');
}

async function requireCloudUser() {
  if (!supabaseClient) {
    saveSupabaseConfig();
    if (!supabaseClient) throw new Error('Supabase is not configured.');
  }
  const { data, error } = await supabaseClient.auth.getUser();
  if (error) throw error;
  currentUser = data?.user || null;
  if (!currentUser) throw new Error('Please sign in with magic link first.');
  return currentUser;
}

async function syncToCloud() {
  try {
    const user = await requireCloudUser();
    const payload = {
      user_id: user.id,
      library: workouts,
      profile: profile(),
      updated_at: new Date().toISOString()
    };
    const { error } = await supabaseClient.from('user_workout_libraries').upsert(payload, { onConflict: 'user_id' });
    if (error) throw error;
    setCloudStatus(`Synced ${workouts.length} workouts`, true);
  } catch (err) {
    console.error(err);
    alert(`Sync to cloud failed: ${err.message}`);
    setCloudStatus('Sync failed');
  }
}

async function loadFromCloud() {
  try {
    const user = await requireCloudUser();
    const { data, error } = await supabaseClient
      .from('user_workout_libraries')
      .select('library, profile, updated_at')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return alert('No cloud library found yet. Use Sync to cloud first.');
    workouts = Array.isArray(data.library) ? data.library : [];
    if (data.profile) {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(data.profile));
      loadProfile();
    }
    selectedId = workouts[0]?.id || null;
    saveLibrary();
    render();
    setCloudStatus(`Loaded cloud library (${workouts.length} workouts)`, true);
  } catch (err) {
    console.error(err);
    alert(`Load from cloud failed: ${err.message}`);
    setCloudStatus('Load failed');
  }
}

async function signOutCloud() {
  if (!supabaseClient) return;
  await supabaseClient.auth.signOut();
  currentUser = null;
  setCloudStatus('Signed out');
}

function wireEvents() {
  ['change', 'input'].forEach(ev => [refs.pool, refs.max100, refs.mode, refs.round].forEach(el => el.addEventListener(ev, saveProfile)));
  [refs.search, refs.focus, refs.distance].forEach(el => el.addEventListener('input', render));
  refs.fileInput.addEventListener('change', e => importFiles(e.target.files));
  refs.drop.addEventListener('dragover', e => { e.preventDefault(); refs.drop.classList.add('dragover'); });
  refs.drop.addEventListener('dragleave', () => refs.drop.classList.remove('dragover'));
  refs.drop.addEventListener('drop', e => { e.preventDefault(); refs.drop.classList.remove('dragover'); importFiles(e.dataTransfer.files); });
  $('loadDemoBtn').onclick = () => { workouts = (window.SWIM_SAMPLE_RAW || []).map(x => parseWorkoutFromText(x.fileName, x.text)); selectedId = workouts[0]?.id || null; saveLibrary(); refs.log.textContent = `Loaded ${workouts.length} uploaded examples.`; render(); };
  $('exportBtn').onclick = () => downloadJson({ profile: profile(), workouts }, 'swim-workout-library.json');
  $('jsonImport').onchange = async e => { const f = e.target.files[0]; if (!f) return; const data = JSON.parse(await f.text()); workouts = data.workouts || data || []; if (data.profile) { localStorage.setItem(PROFILE_KEY, JSON.stringify(data.profile)); loadProfile(); } selectedId = workouts[0]?.id || null; saveLibrary(); render(); };
  $('clearBtn').onclick = () => { if (!confirm('Clear local workout library?')) return; workouts = []; selectedId = null; saveLibrary(); render(); };
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; refs.install.classList.remove('hidden'); });
  refs.install.onclick = async () => { if (deferredPrompt) { deferredPrompt.prompt(); deferredPrompt = null; refs.install.classList.add('hidden'); } };
  refs.saveSupabaseBtn?.addEventListener('click', saveSupabaseConfig);
  refs.magicLinkBtn?.addEventListener('click', sendMagicLink);
  refs.syncUpBtn?.addEventListener('click', syncToCloud);
  refs.syncDownBtn?.addEventListener('click', loadFromCloud);
  refs.signOutBtn?.addEventListener('click', signOutCloud);
}
function downloadJson(obj, fileName) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = fileName; a.click(); URL.revokeObjectURL(a.href);
}

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
loadProfile(); loadLibrary(); loadSupabaseConfig(); wireEvents(); render();
