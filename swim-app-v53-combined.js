// Metric Swim Workout Library v5.1 combined patch
// Adds tabs, filtered/random workout selection, circular intensity summary, inline clickable step details,
// dedicated library scroll window, stroke-specific profile pacing, hard-coded Supabase defaults.
(function(){
  const SUPABASE_URL='https://qrjmucaneoplywllrcjh.supabase.co';
  const SUPABASE_KEY='sb_publishable_8EFScHJJvGXKr2rhhx_W0A_5C-ku-Re';
  const SUPABASE_CFG_KEY='metricSwimSupabase.v1';
  const STROKE_PROFILE_KEY='metricSwimStrokeProfile.v51';
  const $=id=>document.getElementById(id);
  const qs=(sel,root=document)=>root.querySelector(sel);
  const qsa=(sel,root=document)=>Array.from(root.querySelectorAll(sel));
  function cleanSpaces(v){return String(v||'').replace(/\s+/g,' ').trim();}
  function parseTimeToSeconds(v,fallback){const s=String(v||'').trim();const m=s.match(/^(\d+):([0-5]?\d)$/);if(m)return Number(m[1])*60+Number(m[2]);const n=Number(s);return Number.isFinite(n)&&n>0?n:fallback;}
  function formatTime(sec){sec=Math.max(0,Math.round(sec));return `${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`;}
  function roundTo5(sec){return Math.round(sec/5)*5;}
  function saveSupabaseDefaults(){try{const existing=JSON.parse(localStorage.getItem(SUPABASE_CFG_KEY)||'{}');localStorage.setItem(SUPABASE_CFG_KEY,JSON.stringify({url:SUPABASE_URL,key:SUPABASE_KEY,email:existing.email||''}));if($('supabaseUrl'))$('supabaseUrl').value=SUPABASE_URL;if($('supabaseKey'))$('supabaseKey').value=SUPABASE_KEY;}catch(e){console.warn('Supabase defaults failed',e);}}
  function loadStrokeProfile(){const base=$('max100Input')?.value||'1:20';const saved=JSON.parse(localStorage.getItem(STROKE_PROFILE_KEY)||'{}');return{free:saved.free||base||'1:20',back:saved.back||'1:35',breast:saved.breast||'1:45',kick:saved.kick||'2:00'};}
  function saveStrokeProfile(p){localStorage.setItem(STROKE_PROFILE_KEY,JSON.stringify(p));}
  function cleanIntervalFragments(text){let s=cleanSpaces(text);s=s.replace(/([A-Za-z\)])(?=(?:\d{1,2}:|:)\d{2})/g,'$1 ');s=s.replace(/(by\s+\d{2,4})(?=(?:\d{1,2}:|:)\d{2})/gi,'$1 ');s=s.replace(/(subkick\s+\d+)(?=:\d{2})/gi,'$1 ');s=s.replace(/(DPS)(?=(?:\d{1,2}:|:)\d{2})/gi,'$1 ');s=s.replace(/(\d{1,2}:\d{2}|:\d{2})(?=(?:\d{1,2}:|:)\d{2})/g,'$1 ');s=s.replace(/\[(?:\d{1,2}:\d{2}|:\d{2})?\]/g,' ');s=s.replace(/(?:^|\s)(?:\d{1,2}:\d{2}|:\d{2})(?=\s|$)/g,' ');s=s.replace(/\b(?:\d{1,2}:\d{2}|:\d{2})\b/g,' ');s=s.replace(/\[\]/g,' ').replace(/\s+-\s*$/g,'').replace(/^\s*[-–—]\s*/g,'').replace(/\s+-\s+/g,' - ').replace(/\s{2,}/g,' ').trim();return s;}
  function cleanWorkoutTitle(text){let s=cleanIntervalFragments(text);s=s.replace(/\b(SCY|SCM|LCM)\b/gi,'').replace(/^\s*[-–—]\s*/,'').replace(/\s*[-–—]\s*$/,'').trim();return cleanSpaces(s);}
  function isGenericTitle(text){const s=cleanSpaces(text).toLowerCase();return !s||s==='workout'||/^[-–—]?\s*(lcm|scm|scy)$/i.test(s)||/^\d{3,5}\s*-\s*(lcm|scm|scy)?$/i.test(s);}
  function cleanStepName(text){let s=cleanIntervalFragments(text);s=s.replace(/\b(Easy|Build|Kick|Free|Choice|Sprint|Faster|Fast|Moderate)(?=[A-Z])/g,'$1 ');s=s.replace(/\b(SCY|SCM|LCM)\b/gi,'').trim();return s||'Swim';}
  function strokeForText(text){const s=String(text||'').toLowerCase();if(s.includes('kick'))return'kick';if(s.includes('breast')||/\bbr\b/.test(s))return'breast';if(s.includes('back'))return'back';if(s.includes('choice')||s.includes(' im')||s.includes('imo'))return'choice';return'free';}
  function profileTimeForStroke(stroke,p){if(stroke==='choice'){return Math.max(parseTimeToSeconds(p.back,95),parseTimeToSeconds(p.breast,105));}return parseTimeToSeconds(p[stroke]||p.free,parseTimeToSeconds(p.free,80));}
  function zoneParams(text){const s=String(text||'').toLowerCase();if(s.includes('sprint')||s.includes('blocks')||s.includes('dive'))return{factor:1.00,rest:35,zone:'Sprint',level:5,color:'#ef4444'};if(s.includes('fast')||s.includes('faster')||s.includes('for time'))return{factor:1.08,rest:25,zone:'Fast',level:4,color:'#f97316'};if(s.includes('build')||s.includes('descend')||s.includes('threshold'))return{factor:1.18,rest:18,zone:'Threshold',level:3,color:'#eab308'};if(s.includes('strong')||s.includes('hold'))return{factor:1.25,rest:18,zone:'Strong',level:3,color:'#facc15'};if(s.includes('easy')||s.includes('smooth'))return{factor:1.48,rest:15,zone:'Recovery',level:1,color:'#22c55e'};if(s.includes('drill')||s.includes('scull')||s.includes('balance'))return{factor:1.55,rest:15,zone:'Technique',level:1,color:'#60a5fa'};if(s.includes('kick'))return{factor:1.25,rest:20,zone:'Kick',level:2,color:'#a855f7'};return{factor:1.32,rest:15,zone:'Aerobic',level:2,color:'#3b82f6'};}
  function parseDistanceFromSetLine(line){const qty=qs('.set-qty',line)?.textContent||'';const m=qty.match(/×\s*(\d+)m/i)||qty.match(/(\d+)m/i);return m?Number(m[1]):100;}
  function parseRepeatsFromSetLine(line){const qty=qs('.set-qty',line)?.textContent||'';const m=qty.match(/^(\d+)\s*×/);return m?Number(m[1]):1;}
  function setMetrics(line){const desc=cleanStepName(qs('.set-desc strong',line)?.textContent||'Swim');const stroke=strokeForText(desc);const profile=loadStrokeProfile();const base=profileTimeForStroke(stroke,profile);const zone=zoneParams(desc);const distance=parseDistanceFromSetLine(line);const repeats=parseRepeatsFromSetLine(line);const paceSeconds=roundTo5(base*zone.factor);const sendoffSeconds=roundTo5((paceSeconds*distance/100)+zone.rest);const swimSeconds=Math.round(paceSeconds*distance/100);const restSeconds=Math.max(0,sendoffSeconds-swimSeconds);return{desc,stroke,zone,distance,repeats,paceSeconds,sendoffSeconds,swimSeconds,restSeconds,totalDistance:distance*repeats};}
  function updateVisiblePaces(){qsa('.set-line').forEach(line=>{const m=setMetrics(line);const pace=qs('.pace',line);const send=qs('.sendoff',line);const zone=qs('.zone',line);if(pace)pace.textContent=`Pace ${formatTime(m.paceSeconds)}/100m`;if(send)send.textContent=`@ ${formatTime(m.sendoffSeconds)}`;if(zone)zone.textContent=m.zone.zone;});}
  function renameWorkoutCards(){qsa('.workout-card').forEach((card,index)=>{const title=qs('.card-title',card);const dist=qs('.card-distance',card);if(!title)return;const original=title.textContent||'';const cleaned=cleanWorkoutTitle(original);const distance=cleanSpaces(dist?dist.textContent:'');const num=String(index+1).padStart(3,'0');title.textContent=(isGenericTitle(original)||isGenericTitle(cleaned))?(distance?`Workout ${num} - ${distance}`:`Workout ${num}`):cleaned;});}
  function cleanDetailTitle(){const h=qs('.detail-title h2');if(!h)return;const cleaned=cleanWorkoutTitle(h.textContent||'');if(!isGenericTitle(cleaned)){h.textContent=cleaned;return;}const active=qs('.workout-card.active .card-title')?.textContent;if(active&&!isGenericTitle(active))h.textContent=active;}
  function cleanStepNames(){qsa('.set-desc strong').forEach(n=>n.textContent=cleanStepName(n.textContent));}
  function setupTabs(){const shell=qs('.shell');if(!shell||$('appTabs'))return;const profilePanel=$('max100Input')?.closest('section');const cloudPanel=qs('.cloud-panel')||$('cloudStatus')?.closest('section');const importPanel=$('dropZone')?.closest('section');const toolbar=qs('.toolbar');const library=qs('.library-panel');const detail=qs('.detail-panel');const layout=qs('.layout');const tabs=document.createElement('section');tabs.id='appTabs';tabs.className='app-tabs';tabs.innerHTML='<button type="button" class="tab-button active" data-tab="tab-workout">Workout</button><button type="button" class="tab-button" data-tab="tab-library">Library</button><button type="button" class="tab-button" data-tab="tab-profile">Profile / Settings</button>';const tabWorkout=document.createElement('section');tabWorkout.id='tab-workout';tabWorkout.className='tab-panel active';const tabLibrary=document.createElement('section');tabLibrary.id='tab-library';tabLibrary.className='tab-panel';const tabProfile=document.createElement('section');tabProfile.id='tab-profile';tabProfile.className='tab-panel';shell.prepend(tabProfile);shell.prepend(tabLibrary);shell.prepend(tabWorkout);shell.prepend(tabs);if(toolbar)tabWorkout.appendChild(toolbar);if(detail)tabWorkout.appendChild(detail);if(library)tabLibrary.appendChild(library);if(profilePanel)tabProfile.appendChild(profilePanel);if(cloudPanel)tabProfile.appendChild(cloudPanel);if(importPanel)tabProfile.appendChild(importPanel);if(layout)layout.remove();qsa('.tab-button',tabs).forEach(btn=>btn.addEventListener('click',()=>{qsa('.tab-button',tabs).forEach(b=>b.classList.remove('active'));qsa('.tab-panel').forEach(p=>p.classList.remove('active'));btn.classList.add('active');$(btn.dataset.tab)?.classList.add('active');}));}
  function visibleCards(){return qsa('.workout-card').filter(c=>c.offsetParent!==null);}
  function setupRandomSelection(){const toolbar=qs('.toolbar');if(!toolbar||$('randomWorkoutBtn'))return;const btn=document.createElement('button');btn.id='randomWorkoutBtn';btn.type='button';btn.textContent='Random matching workout';btn.addEventListener('click',()=>{const cards=visibleCards();if(!cards.length){alert('No workouts match the current filters.');return;}const pick=cards[Math.floor(Math.random()*cards.length)];pick.click();qs('[data-tab="tab-workout"]')?.click();setTimeout(()=>qs('.detail-panel')?.scrollIntoView({behavior:'smooth',block:'start'}),100);});toolbar.appendChild(btn);}
  function setupCloudCollapse(){const panel=qs('.cloud-panel')||$('cloudStatus')?.closest('section');if(!panel||panel.dataset.v51CloudReady)return;panel.dataset.v51CloudReady='true';panel.classList.add('cloud-collapsed');['supabaseUrl','supabaseKey'].forEach(id=>$(id)?.closest('label')?.classList.add('technical-supabase-field'));const heading=qs('.panel-heading',panel);const btn=document.createElement('button');btn.type='button';btn.className='secondary compact-toggle';btn.textContent='Show cloud sync';btn.addEventListener('click',()=>{const collapsed=panel.classList.toggle('cloud-collapsed');btn.textContent=collapsed?'Show cloud sync':'Hide cloud sync';});heading?.appendChild(btn);}
  function setupImportToggle(){const imp=$('dropZone')?.closest('section');if(!imp||$('toggleImportToolsBtn'))return;imp.classList.add('import-hidden');const btn=document.createElement('button');btn.id='toggleImportToolsBtn';btn.type='button';btn.className='secondary compact-toggle';btn.textContent='Show import tools';btn.addEventListener('click',()=>{const hidden=imp.classList.toggle('import-hidden');btn.textContent=hidden?'Show import tools':'Hide import tools';});const row=(qs('.cloud-panel')||$('cloudStatus')?.closest('section'))?.querySelector('.button-row')||qs('.button-row');row?.appendChild(btn);}
  function collapseCoachNotes(){qsa('.notes-section').forEach(section=>{if(section.dataset.v51NotesReady)return;section.dataset.v51NotesReady='true';section.classList.add('coach-notes-collapsed');const h=qs('h3',section);if(!h)return;const btn=document.createElement('button');btn.type='button';btn.className='secondary compact-toggle notes-toggle';btn.textContent='Show notes';btn.addEventListener('click',()=>{const collapsed=section.classList.toggle('coach-notes-collapsed');btn.textContent=collapsed?'Show notes':'Hide notes';});h.appendChild(btn);});}
  function collapseCoachInstructions(){const grid=qs('.coach-grid');const detail=qs('.detail-panel');if(!grid||!detail||grid.dataset.v51Ready)return;grid.dataset.v51Ready='true';grid.classList.add('coach-instructions-collapsed');const btn=document.createElement('button');btn.type='button';btn.className='secondary compact-toggle coach-instructions-toggle';btn.textContent='Show session guidance';btn.addEventListener('click',()=>{const collapsed=grid.classList.toggle('coach-instructions-collapsed');btn.textContent=collapsed?'Show session guidance':'Hide session guidance';});qs('.detail-title',detail)?.insertAdjacentElement('afterend',btn);}
  function setupStrokeProfileInputs(){const max=$('max100Input');if(!max||$('strokeProfileGrid'))return;const p=loadStrokeProfile();max.value=p.free;const c=document.createElement('div');c.id='strokeProfileGrid';c.className='stroke-profile-grid';c.innerHTML=`<label>Freestyle 100m<input id="free100Input" value="${p.free}" inputmode="numeric" placeholder="1:20"></label><label>Backstroke 100m<input id="back100Input" value="${p.back}" inputmode="numeric" placeholder="1:35"></label><label>Breaststroke 100m<input id="breast100Input" value="${p.breast}" inputmode="numeric" placeholder="1:45"></label><label>Kick 100m<input id="kick100Input" value="${p.kick}" inputmode="numeric" placeholder="2:00"></label>`;const grid=max.closest('section')?.querySelector('.settings-grid');grid?.insertAdjacentElement('afterend',c);function sync(){const updated={free:$('free100Input')?.value||p.free,back:$('back100Input')?.value||p.back,breast:$('breast100Input')?.value||p.breast,kick:$('kick100Input')?.value||p.kick};saveStrokeProfile(updated);max.value=updated.free;updateVisiblePaces();updateIntensityMap();updateOpenStepDetails();}qsa('input',c).forEach(i=>{i.addEventListener('input',sync);i.addEventListener('change',sync);});}
  function color(level){return level>=5?'#ef4444':level===4?'#f97316':level===3?'#eab308':level===2?'#3b82f6':'#22c55e';}
  function updateIntensityMap(){const detail=qs('.detail-panel');if(!detail)return;const lines=qsa('.detail-panel .set-line');if(!lines.length)return;let map=$('selectedIntensityMap');if(!map){map=document.createElement('section');map.id='selectedIntensityMap';map.className='intensity-map';qs('.detail-title')?.insertAdjacentElement('afterend',map) || detail.prepend(map);}const metrics=lines.map(setMetrics);const total=metrics.reduce((s,m)=>s+m.totalDistance,0)||1;const avgLevel=metrics.reduce((s,m)=>s+m.zone.level*m.totalDistance,0)/total;const mainZone=avgLevel>=4.5?'Sprint/Fast':avgLevel>=3?'Threshold':avgLevel>=2?'Aerobic':'Technique/Easy';let offset=0;const rings=metrics.map((m,i)=>{const pct=Math.max(1,m.totalDistance/total*100);const ring=`<circle class="ring-step" data-step-index="${i}" cx="80" cy="80" r="62" pathLength="100" stroke="${color(m.zone.level)}" stroke-width="18" fill="none" stroke-dasharray="${pct} ${100-pct}" stroke-dashoffset="${-offset}" transform="rotate(-90 80 80)"><title>${m.desc} - ${m.zone.zone}</title></circle>`;offset+=pct;return ring;}).join('');const bars=metrics.map((m,i)=>`<button type="button" class="intensity-segment" data-step-index="${i}" title="${m.desc} - ${m.zone.zone}" style="width:${Math.max(4,m.totalDistance/total*100)}%;background:${color(m.zone.level)}"></button>`).join('');map.innerHTML=`<div class="intensity-layout"><button class="ring-shell" type="button" title="Tap to cycle through workout steps"><svg class="interactive-ring" viewBox="0 0 160 160" aria-label="Interactive workout intensity ring"><circle cx="80" cy="80" r="62" stroke="rgba(255,255,255,.16)" stroke-width="18" fill="none"></circle>${rings}</svg><span class="ring-center"><strong>${Math.round(total)}m</strong><em>${mainZone}</em><small>Tap segments</small></span></button><div class="intensity-side"><div class="intensity-title"><strong>Workout format</strong><span>${metrics.length} steps</span></div><div class="intensity-bar">${bars}</div><div id="ringStepSummary" class="ring-step-summary">Tap a ring segment or bar to inspect a step.</div><div class="intensity-legend"><span>Easy/Technique</span><span>Aerobic</span><span>Threshold</span><span>Fast/Sprint</span></div></div></div>`;function selectStep(idx){const i=Number(idx)||0;const m=metrics[i];qsa('.ring-step',map).forEach(el=>el.classList.toggle('active',Number(el.dataset.stepIndex)===i));qsa('.intensity-segment',map).forEach(el=>el.classList.toggle('active',Number(el.dataset.stepIndex)===i));const summary=$('ringStepSummary');if(summary&&m)summary.textContent=`Step ${i+1}: ${m.desc} • ${m.zone.zone} • ${m.distance}m • approx rest ${formatTime(m.restSeconds)}`;lines[i]?.click();}qsa('.ring-step',map).forEach(el=>el.addEventListener('click',e=>{e.stopPropagation();selectStep(el.dataset.stepIndex);}));qsa('.intensity-segment',map).forEach(btn=>btn.addEventListener('click',()=>selectStep(btn.dataset.stepIndex)));let cycle=0;qs('.ring-shell',map)?.addEventListener('click',()=>{selectStep(cycle%metrics.length);cycle++;});}
  function setupStepDetails(){qsa('.set-line').forEach((line,index)=>{if(line.dataset.v51StepReady)return;line.dataset.v51StepReady='true';line.tabIndex=0;line.classList.add('clickable-step');const open=()=>toggleStepDetail(line,index);line.addEventListener('click',open);line.addEventListener('keypress',e=>{if(e.key==='Enter'||e.key===' ')open();});});}
  function updateOpenStepDetails(){qsa('.inline-step-detail').forEach(panel=>{const prev=panel.previousElementSibling;if(prev?.classList.contains('set-line'))renderInlineDetail(prev,Number(prev.dataset.stepIndex||0),panel);});}
  function toggleStepDetail(line,index){line.dataset.stepIndex=String(index);let panel=line.nextElementSibling;if(panel&&panel.classList.contains('inline-step-detail')){panel.remove();return;}qsa('.inline-step-detail').forEach(p=>p.remove());panel=document.createElement('section');panel.className='inline-step-detail';line.insertAdjacentElement('afterend',panel);renderInlineDetail(line,index,panel);panel.scrollIntoView({behavior:'smooth',block:'nearest'});}
  function renderInlineDetail(line,index,panel){const m=setMetrics(line);const swimPct=Math.min(100,Math.max(5,m.swimSeconds/Math.max(1,m.sendoffSeconds)*100));panel.innerHTML=`<div class="step-detail-head"><strong>Step ${index+1}: ${m.desc}</strong><button type="button" class="close-inline-step">Close</button></div><div class="step-detail-visual"><div class="mini-zone-dot" style="background:${color(m.zone.level)}"></div><div class="mini-bars"><div class="bar-row"><span>Swim</span><div class="bar-track"><div class="bar-fill" style="width:${swimPct}%"></div></div><strong>${formatTime(m.swimSeconds)}</strong></div><div class="bar-row"><span>Rest</span><div class="bar-track rest"><div class="bar-fill rest" style="width:${Math.max(3,100-swimPct)}%"></div></div><strong>${formatTime(m.restSeconds)}</strong></div></div></div><div class="step-detail-grid"><div><span>Distance</span><strong>${m.distance}m</strong></div><div><span>Stroke basis</span><strong>${m.stroke==='choice'?'Back/Breast Choice':m.stroke}</strong></div><div><span>Zone</span><strong>${m.zone.zone}</strong></div><div><span>Target pace</span><strong>${formatTime(m.paceSeconds)}/100m</strong></div><div><span>Send-off</span><strong>${formatTime(m.sendoffSeconds)}</strong></div><div><span>Approx rest</span><strong>${formatTime(m.restSeconds)}</strong></div></div>`;qs('.close-inline-step',panel)?.addEventListener('click',e=>{e.stopPropagation();panel.remove();});}
  function setupLibraryFilters(){const tab=$('tab-library');const panel=qs('.library-panel');if(!tab||!panel||$('libraryFilterPanel'))return;const filter=document.createElement('section');filter.id='libraryFilterPanel';filter.className='library-filter-panel';filter.innerHTML=`<div class="library-filter-grid"><input id="libraryTextFilter" type="search" placeholder="Filter library by title, tag, focus..."><select id="libraryDistanceFilter"><option value="">All distances</option><option value="0-2499">Under 2500m</option><option value="2500-2999">2500-2999m</option><option value="3000-3499">3000-3499m</option><option value="3500-9999">3500m+</option></select><select id="libraryFocusFilter"><option value="">All focus</option><option value="speed">Speed</option><option value="technique">Technique</option><option value="kick">Kick</option><option value="endurance">Endurance</option><option value="threshold">Threshold</option></select><button id="libraryClearFilter" type="button" class="secondary">Clear</button></div><p id="libraryFilterCount" class="small muted"></p>`;panel.parentNode.insertBefore(filter,panel);function apply(){const q=($('libraryTextFilter')?.value||'').toLowerCase().trim();const dist=$('libraryDistanceFilter')?.value||'';const focus=$('libraryFocusFilter')?.value||'';const cards=qsa('.workout-card');let shown=0;cards.forEach(card=>{const hay=card.textContent.toLowerCase();const d=Number((qs('.card-distance',card)?.textContent||'').replace(/[^0-9]/g,''))||0;let ok=true;if(q&&!hay.includes(q))ok=false;if(focus&&!hay.includes(focus))ok=false;if(dist){const parts=dist.split('-').map(Number);if(d<parts[0]||d>parts[1])ok=false;}card.style.display=ok?'block':'none';if(ok)shown++;});const c=$('libraryFilterCount');if(c)c.textContent=`Showing ${shown} of ${cards.length} workouts`; }['libraryTextFilter','libraryDistanceFilter','libraryFocusFilter'].forEach(id=>$(id)?.addEventListener('input',apply));$('libraryClearFilter')?.addEventListener('click',()=>{if($('libraryTextFilter'))$('libraryTextFilter').value='';if($('libraryDistanceFilter'))$('libraryDistanceFilter').value='';if($('libraryFocusFilter'))$('libraryFocusFilter').value='';apply();});setTimeout(apply,250);}function runPatch(){try{saveSupabaseDefaults();}catch{}setupTabs();setupRandomSelection();setupLibraryFilters();setupCloudCollapse();setupImportToggle();setupStrokeProfileInputs();renameWorkoutCards();cleanDetailTitle();cleanStepNames();collapseCoachNotes();collapseCoachInstructions();updateVisiblePaces();updateIntensityMap();setupStepDetails();}
  document.addEventListener('DOMContentLoaded',runPatch);setTimeout(runPatch,300);setTimeout(runPatch,1200);setTimeout(runPatch,2500);const obs=new MutationObserver(()=>window.requestAnimationFrame(runPatch));obs.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
})();


// v5.3 visual/search refinements
(function(){
  const qs=(s,r=document)=>r.querySelector(s);
  const qsa=(s,r=document)=>Array.from(r.querySelectorAll(s));
  function txt(el){return (el&&el.textContent||'').toLowerCase();}
  function distOf(card){return Number((qs('.card-distance',card)?.textContent||'').replace(/[^0-9]/g,''))||0;}
  function currentWorkoutCriteria(){
    return {
      q:(qs('#searchInput')?.value||'').toLowerCase().trim(),
      focus:(qs('#focusFilter')?.value||'').toLowerCase().trim(),
      dist:(qs('#distanceFilter')?.value||'').trim()
    };
  }
  function matchCard(card,c){
    const hay=txt(card);
    const d=distOf(card);
    if(c.q && !hay.includes(c.q)) return false;
    if(c.focus && !hay.includes(c.focus)) return false;
    if(c.dist){
      const [lo,hi]=c.dist.split('-').map(Number);
      if(d<lo || d>hi) return false;
    }
    return true;
  }
  function allCards(){return qsa('.workout-card');}
  function matchingWorkoutCards(){return allCards().filter(card=>matchCard(card,currentWorkoutCriteria()));}
  function replaceRandomButton(){
    const old=qs('#randomWorkoutBtn');
    if(!old || old.dataset.v53Ready) return;
    const btn=old.cloneNode(true);
    btn.dataset.v53Ready='true';
    btn.textContent='Random workout from filters';
    old.replaceWith(btn);
    btn.addEventListener('click',()=>{
      const matches=matchingWorkoutCards();
      if(!matches.length){
        alert('No workouts match the current filters. Try clearing search, focus, or distance filters.');
        return;
      }
      const pick=matches[Math.floor(Math.random()*matches.length)];
      pick.click();
      qs('[data-tab="tab-workout"]')?.click();
      setTimeout(()=>qs('.detail-panel')?.scrollIntoView({behavior:'smooth',block:'start'}),100);
    });
  }
  function setupLibraryFilterPanel(){
    const tab=qs('#tab-library');
    const panel=qs('.library-panel');
    if(!tab || !panel) return;
    let filter=qs('#libraryFilterPanel');
    if(!filter){
      filter=document.createElement('section');
      filter.id='libraryFilterPanel';
      filter.className='library-filter-panel';
      filter.innerHTML='<div class="library-filter-grid"><input id="libraryTextFilter" type="search" placeholder="Filter library by title, distance, focus, stroke..."><select id="libraryDistanceFilter"><option value="">All distances</option><option value="0-2499">Under 2500m</option><option value="2500-2999">2500-2999m</option><option value="3000-3499">3000-3499m</option><option value="3500-9999">3500m+</option></select><select id="libraryFocusFilter"><option value="">All focus</option><option value="speed">Speed</option><option value="technique">Technique</option><option value="kick">Kick</option><option value="endurance">Endurance</option><option value="threshold">Threshold</option></select><button id="libraryClearFilter" type="button" class="secondary">Clear</button></div><p id="libraryFilterCount" class="small muted"></p>';
      panel.parentNode.insertBefore(filter,panel);
    }
    if(filter.dataset.v53Ready) return;
    filter.dataset.v53Ready='true';
    function apply(){
      const q=(qs('#libraryTextFilter')?.value||'').toLowerCase().trim();
      const focus=(qs('#libraryFocusFilter')?.value||'').toLowerCase().trim();
      const dist=(qs('#libraryDistanceFilter')?.value||'').trim();
      let shown=0;
      const cards=allCards();
      cards.forEach(card=>{
        const d=distOf(card);
        const hay=txt(card);
        let ok=true;
        if(q && !hay.includes(q)) ok=false;
        if(focus && !hay.includes(focus)) ok=false;
        if(dist){const [lo,hi]=dist.split('-').map(Number); if(d<lo||d>hi) ok=false;}
        card.style.display=ok?'block':'none';
        if(ok) shown++;
      });
      const count=qs('#libraryFilterCount');
      if(count) count.textContent=`Showing ${shown} of ${cards.length} workouts`;
    }
    ['libraryTextFilter','libraryDistanceFilter','libraryFocusFilter'].forEach(id=>qs('#'+id)?.addEventListener('input',apply));
    qs('#libraryClearFilter')?.addEventListener('click',()=>{
      if(qs('#libraryTextFilter')) qs('#libraryTextFilter').value='';
      if(qs('#libraryDistanceFilter')) qs('#libraryDistanceFilter').value='';
      if(qs('#libraryFocusFilter')) qs('#libraryFocusFilter').value='';
      apply();
    });
    setTimeout(apply,200);
  }
  function simplifyIntensityCard(){
    const map=qs('#selectedIntensityMap');
    if(!map || map.dataset.v53Ready) return;
    map.dataset.v53Ready='true';
    qsa('.intensity-bar,.intensity-legend',map).forEach(el=>el.remove());
    const title=qs('.intensity-title strong',map); if(title) title.textContent='Workout shape';
    const summary=qs('#ringStepSummary',map); if(summary) summary.textContent='Tap a ring segment to inspect that step.';
  }
  function run(){replaceRandomButton();setupLibraryFilterPanel();simplifyIntensityCard();}
  document.addEventListener('DOMContentLoaded',run);
  setTimeout(run,300);setTimeout(run,1200);setTimeout(run,2500);
  new MutationObserver(()=>requestAnimationFrame(run)).observe(document.documentElement,{childList:true,subtree:true});
})();
