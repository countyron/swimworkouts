// Metric Swim Workout Library v5.6 stable feature patch
// Purpose: stabilise iPhone/Safari by removing heavy DOM scanning, mutation loops, and duplicated touch handlers.
(function(){
  'use strict';

  const SUPABASE_URL='https://qrjmucaneoplywllrcjh.supabase.co';
  const SUPABASE_KEY='sb_publishable_8EFScHJJvGXKr2rhhx_W0A_5C-ku-Re';
  const SUPABASE_CFG_KEY='metricSwimSupabase.v1';
  const FAV_KEY='metricSwimFavorites.v55';

  const $=id=>document.getElementById(id);
  const qs=(s,r=document)=>r.querySelector(s);
  const qsa=(s,r=document)=>Array.from(r.querySelectorAll(s));
  let authClient=null;
  let libraryFilterReady=false;

  function safeJson(key,fallback){try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback));}catch{return fallback;}}
  function favs(){return new Set(safeJson(FAV_KEY,[]));}
  function saveFavs(s){localStorage.setItem(FAV_KEY,JSON.stringify(Array.from(s)));}
  function clean(v){return String(v||'').replace(/\s+/g,' ').trim();}
  function cardKey(card){return clean((qs('.card-title',card)?.textContent||'')+'|'+(qs('.card-distance',card)?.textContent||''));}
  function activeCard(){return qs('.workout-card.active')||qs('.workout-card[aria-selected="true"]');}
  function activeKey(){const c=activeCard();return c?cardKey(c):clean(qs('.detail-title h2')?.textContent||'');}
  function allCards(){return qsa('.workout-card');}
  function cardDist(card){return +(qs('.card-distance',card)?.textContent||'').replace(/[^0-9]/g,'')||0;}
  function matchCard(card,c){const hay=(card.textContent||'').toLowerCase();const d=cardDist(card);if(c.q&&!hay.includes(c.q))return false;if(c.focus&&!hay.includes(c.focus))return false;if(c.dist){const parts=c.dist.split('-').map(Number);if(d<parts[0]||d>parts[1])return false;}if(c.fav&&!favs().has(cardKey(card)))return false;return true;}

  function setupTabs(){
    const shell=qs('.shell');
    if(!shell||$('appTabs'))return;
    const profilePanel=$('max100Input')?.closest('section');
    const cloud=qs('.cloud-panel')||$('cloudStatus')?.closest('section');
    const imp=$('dropZone')?.closest('section');
    const toolbar=qs('.toolbar');
    const lib=qs('.library-panel');
    const detail=qs('.detail-panel');
    const layout=qs('.layout');

    const tabs=document.createElement('section');
    tabs.id='appTabs';
    tabs.className='app-tabs';
    tabs.innerHTML='<button type="button" class="tab-button active" data-tab="tab-workout">Workout</button><button type="button" class="tab-button" data-tab="tab-library">Library</button><button type="button" class="tab-button" data-tab="tab-profile">Profile / Settings</button>';

    const tw=document.createElement('section'); tw.id='tab-workout'; tw.className='tab-panel active';
    const tl=document.createElement('section'); tl.id='tab-library'; tl.className='tab-panel';
    const tp=document.createElement('section'); tp.id='tab-profile'; tp.className='tab-panel';

    shell.prepend(tp); shell.prepend(tl); shell.prepend(tw); shell.prepend(tabs);
    if(toolbar)tw.appendChild(toolbar);
    if(detail)tw.appendChild(detail);
    if(lib)tl.appendChild(lib);
    if(profilePanel)tp.appendChild(profilePanel);
    if(cloud)tp.appendChild(cloud);
    if(imp)tp.appendChild(imp);
    if(layout)layout.remove();

    tabs.addEventListener('click',function(e){
      const b=e.target.closest('.tab-button');
      if(!b)return;
      qsa('.tab-button',tabs).forEach(x=>x.classList.remove('active'));
      qsa('.tab-panel').forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      $(b.dataset.tab)?.classList.add('active');
      if(b.dataset.tab==='tab-library')setupLibraryFilters();
    });
  }

  function setupControls(){
    const toolbar=qs('.toolbar');
    if(!toolbar||$('workoutControls'))return;
    const wrap=document.createElement('section');
    wrap.id='workoutControls';
    wrap.className='workout-controls';
    wrap.innerHTML='<button id="randomWorkoutBtn" type="button">Random workout from filters</button><div class="pool-toggle"><button type="button" data-pool="25">25m</button><button type="button" data-pool="50">50m</button></div><button id="workoutFavBtn" class="fav-detail-btn" type="button">☆ Favourite</button>';
    toolbar.parentNode.insertBefore(wrap,toolbar.nextSibling);
    wrap.addEventListener('click',function(e){
      const pool=e.target.closest('[data-pool]');
      if(pool){
        if($('poolSelect')){
          $('poolSelect').value=pool.dataset.pool;
          $('poolSelect').dispatchEvent(new Event('change',{bubbles:true}));
        }
        updatePoolToggle();
        return;
      }
      if(e.target.id==='randomWorkoutBtn'){
        const c={q:($('searchInput')?.value||'').toLowerCase().trim(),focus:($('focusFilter')?.value||'').toLowerCase().trim(),dist:($('distanceFilter')?.value||'').trim(),fav:false};
        const matches=allCards().filter(card=>matchCard(card,c));
        if(!matches.length){alert('No workouts match the current filters. Try clearing search, focus, or distance.');return;}
        matches[Math.floor(Math.random()*matches.length)].click();
        qs('[data-tab="tab-workout"]')?.click();
        setTimeout(updateFavDetail,150);
        return;
      }
      if(e.target.id==='workoutFavBtn'){
        const k=activeKey();
        if(!k){alert('Select a workout first.');return;}
        const s=favs();
        s.has(k)?s.delete(k):s.add(k);
        saveFavs(s);
        updateFavDetail();
      }
    });
    updatePoolToggle();
  }

  function updatePoolToggle(){qsa('.pool-toggle [data-pool]').forEach(b=>b.classList.toggle('active',b.dataset.pool===$('poolSelect')?.value));}
  function updateFavDetail(){const b=$('workoutFavBtn');if(!b)return;const on=favs().has(activeKey());b.classList.toggle('active',on);b.textContent=on?'★ Favourite':'☆ Favourite';}

  function setupLibraryFilters(){
    const panel=qs('.library-panel');
    if(!panel||libraryFilterReady)return;
    libraryFilterReady=true;
    const filter=document.createElement('section');
    filter.id='libraryFilterPanel';
    filter.className='library-filter-panel';
    filter.innerHTML='<div class="library-filter-grid"><input id="libraryTextFilter" type="search" placeholder="Filter library by title, distance, focus, stroke..."><select id="libraryDistanceFilter"><option value="">All distances</option><option value="0-2499">Under 2500m</option><option value="2500-2999">2500-2999m</option><option value="3000-3499">3000-3499m</option><option value="3500-9999">3500m+</option></select><select id="libraryFocusFilter"><option value="">All focus</option><option value="speed">Speed</option><option value="technique">Technique</option><option value="kick">Kick</option><option value="endurance">Endurance</option><option value="threshold">Threshold</option></select><button id="libraryFavFilter" type="button" class="secondary">Favourites</button><button id="libraryClearFilter" type="button" class="secondary">Clear</button></div><p id="libraryFilterCount" class="small muted"></p>';
    panel.parentNode.insertBefore(filter,panel);
    let favOnly=false;
    let timer=null;
    function apply(){
      const c={q:($('libraryTextFilter')?.value||'').toLowerCase().trim(),focus:($('libraryFocusFilter')?.value||'').toLowerCase().trim(),dist:($('libraryDistanceFilter')?.value||'').trim(),fav:favOnly};
      let shown=0;
      const cards=allCards();
      cards.forEach(card=>{const ok=matchCard(card,c);card.style.display=ok?'block':'none';if(ok)shown++;});
      if($('libraryFilterCount'))$('libraryFilterCount').textContent=`Showing ${shown} of ${cards.length} workouts`;
    }
    function soon(){clearTimeout(timer);timer=setTimeout(apply,120);}
    $('libraryTextFilter')?.addEventListener('input',soon);
    $('libraryDistanceFilter')?.addEventListener('change',apply);
    $('libraryFocusFilter')?.addEventListener('change',apply);
    $('libraryFavFilter')?.addEventListener('click',function(){favOnly=!favOnly;this.classList.toggle('active',favOnly);apply();});
    $('libraryClearFilter')?.addEventListener('click',function(){if($('libraryTextFilter'))$('libraryTextFilter').value='';if($('libraryDistanceFilter'))$('libraryDistanceFilter').value='';if($('libraryFocusFilter'))$('libraryFocusFilter').value='';favOnly=false;$('libraryFavFilter')?.classList.remove('active');apply();});
    setTimeout(apply,50);
  }

  function collapseSections(){
    const cloud=qs('.cloud-panel');
    if(cloud&&!cloud.dataset.safeReady){
      cloud.dataset.safeReady='1';
      cloud.classList.add('cloud-collapsed');
      ['supabaseUrl','supabaseKey'].forEach(id=>$(id)?.closest('label')?.classList.add('technical-supabase-field'));
      const btn=document.createElement('button');
      btn.type='button'; btn.className='secondary compact-toggle'; btn.textContent='Show cloud sync';
      btn.addEventListener('click',function(){const c=cloud.classList.toggle('cloud-collapsed');btn.textContent=c?'Show cloud sync':'Hide cloud sync';});
      qs('.panel-heading',cloud)?.appendChild(btn);
    }
    const imp=$('dropZone')?.closest('section');
    if(imp&&!$('toggleImportToolsBtn')){
      imp.classList.add('import-hidden');
      const b=document.createElement('button');
      b.id='toggleImportToolsBtn'; b.type='button'; b.className='secondary compact-toggle'; b.textContent='Show import tools';
      b.addEventListener('click',function(){const h=imp.classList.toggle('import-hidden');b.textContent=h?'Show import tools':'Hide import tools';});
      qs('.cloud-panel .button-row')?.appendChild(b);
    }
  }

  function setupCodeLogin(){
    const cloud=qs('.cloud-panel');
    if(!cloud||$('emailCodeInput'))return;
    const row=document.createElement('div');
    row.className='cloud-auth-code';
    row.innerHTML='<input id="emailCodeInput" inputmode="numeric" autocomplete="one-time-code" placeholder="Enter 6-digit code"><button id="sendCodeBtn" class="secondary" type="button">Send code</button><button id="verifyCodeBtn" type="button">Verify code</button>';
    const hint=document.createElement('p');
    hint.id='codeLoginHint'; hint.className='cloud-hint'; hint.textContent='For iPhone web app sign-in, use email code login instead of the magic link.';
    qs('.button-row',cloud)?.insertAdjacentElement('afterend',row);
    row.insertAdjacentElement('afterend',hint);
    if($('magicLinkBtn'))$('magicLinkBtn').style.display='none';
    $('sendCodeBtn')?.addEventListener('click',sendCode);
    $('verifyCodeBtn')?.addEventListener('click',verifyCode);
    $('signOutBtn')?.addEventListener('click',signOutAuth);
    setTimeout(refreshAuthStatus,250);
  }

  function cfg(){const saved=safeJson(SUPABASE_CFG_KEY,{});return{url:SUPABASE_URL,key:SUPABASE_KEY,email:($('supabaseEmail')?.value||saved.email||'').trim()};}
  function saveCfg(){const c=cfg();localStorage.setItem(SUPABASE_CFG_KEY,JSON.stringify(c));if($('supabaseUrl'))$('supabaseUrl').value=SUPABASE_URL;if($('supabaseKey'))$('supabaseKey').value=SUPABASE_KEY;}
  function client(){if(authClient)return authClient;if(!window.supabase)return null;authClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});return authClient;}
  async function refreshAuthStatus(){saveCfg();const el=$('cloudStatus');if(!el)return;try{const c=client();if(!c){el.textContent='Auth unavailable';return;}const {data}=await c.auth.getSession();const email=data?.session?.user?.email||'';el.textContent=email?`Signed in: ${email}`:'Not signed in';el.classList.toggle('cloud-ok',!!email);}catch{el.textContent='Auth unavailable';el.classList.remove('cloud-ok');}}
  async function sendCode(){saveCfg();const email=cfg().email;if(!email){alert('Enter the email address used for your workout library.');return;}const c=client();if(!c){alert('Supabase is still loading. Try again in a moment.');return;}const {error}=await c.auth.signInWithOtp({email,options:{shouldCreateUser:true}});if(error){alert(`Send code failed: ${error.message}`);return;}if($('codeLoginHint'))$('codeLoginHint').textContent='Verification code sent. Enter the 6-digit code below in the app.';}
  async function verifyCode(){saveCfg();const email=cfg().email;const code=($('emailCodeInput')?.value||'').trim();if(!email||!code){alert('Enter both the email address and the 6-digit code.');return;}const c=client();if(!c){alert('Supabase is still loading. Try again in a moment.');return;}const {error}=await c.auth.verifyOtp({email,token:code,type:'email'});if(error){alert(`Verify code failed: ${error.message}`);return;}await refreshAuthStatus();}
  async function signOutAuth(){try{await client()?.auth.signOut();}catch{}refreshAuthStatus();}


  function parseTime(v,f){const s=String(v||'').trim();const m=s.match(/^(\d+):([0-5]?\d)$/);if(m)return +m[1]*60+ +m[2];const n=+s;return Number.isFinite(n)&&n>0?n:f;}
  function fmt(sec){sec=Math.max(0,Math.round(sec));return `${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`;}
  function r5(sec){return Math.round(sec/5)*5;}
  function profile(){return{free:$('max100Input')?.value||'1:20',back:'1:35',breast:'1:45',kick:'2:00'};}
  function stroke(t){const s=String(t||'').toLowerCase();if(s.includes('kick'))return'kick';if(s.includes('breast')||/\bbr\b/.test(s))return'breast';if(s.includes('back'))return'back';if(s.includes('choice')||s.includes(' im')||s.includes('imo'))return'choice';return'free';}
  function strokeTime(st,p){if(st==='choice')return Math.max(parseTime(p.back,95),parseTime(p.breast,105));return parseTime(p[st]||p.free,parseTime(p.free,80));}
  function zone(t){const s=String(t||'').toLowerCase();if(s.includes('sprint')||s.includes('blocks')||s.includes('dive'))return{f:1,rest:35,z:'Sprint'};if(s.includes('fast')||s.includes('faster')||s.includes('for time'))return{f:1.08,rest:25,z:'Fast'};if(s.includes('build')||s.includes('descend')||s.includes('threshold'))return{f:1.18,rest:18,z:'Threshold'};if(s.includes('strong')||s.includes('hold'))return{f:1.25,rest:18,z:'Strong'};if(s.includes('easy')||s.includes('smooth'))return{f:1.48,rest:15,z:'Recovery'};if(s.includes('drill')||s.includes('scull')||s.includes('balance'))return{f:1.55,rest:15,z:'Technique'};if(s.includes('kick'))return{f:1.25,rest:20,z:'Kick'};return{f:1.32,rest:15,z:'Aerobic'};}
  function lineDistance(line){const q=qs('.set-qty',line)?.textContent||'';const m=q.match(/×\s*(\d+)m/i)||q.match(/(\d+)m/i);return m?+m[1]:100;}
  function lineReps(line){const q=qs('.set-qty',line)?.textContent||'';const m=q.match(/^(\d+)\s*×/);return m?+m[1]:1;}
  function lineDesc(line){return clean(qs('.set-desc strong',line)?.textContent||line.textContent||'Swim');}
  function metrics(line){const d=lineDesc(line);const st=stroke(d);const p=profile();const z=zone(d);const distance=lineDistance(line);const repeat=lineReps(line);const pace=r5(strokeTime(st,p)*z.f);const send=r5((pace*distance/100)+z.rest);const swim=Math.round(pace*distance/100);const rest=Math.max(0,send-swim);return{desc:d,st,z,distance,repeat,pace,send,swim,rest,total:distance*repeat};}

  function setupStepDetails(){
    const panel=qs('.detail-panel');
    if(!panel||panel.dataset.v56StepReady)return;
    panel.dataset.v56StepReady='1';
    panel.addEventListener('click',function(e){
      if(e.target.closest('.inline-step-detail'))return;
      const line=e.target.closest('.set-line');
      if(!line)return;
      const idx=qsa('.detail-panel .set-line').indexOf(line);
      openStepDetail(line,idx);
    });
  }
  function openStepDetail(line,idx){
    let p=line.nextElementSibling;
    if(p&&p.classList.contains('inline-step-detail')){p.remove();return;}
    qsa('.inline-step-detail').forEach(x=>x.remove());
    p=document.createElement('section');
    p.className='inline-step-detail';
    line.insertAdjacentElement('afterend',p);
    renderStepDetail(line,idx,p);
    p.scrollIntoView({behavior:'smooth',block:'nearest'});
  }
  function renderStepDetail(line,idx,p){
    const m=metrics(line);
    const swimPct=Math.min(100,Math.max(8,m.swim/Math.max(1,m.send)*100));
    p.innerHTML=`<div class="step-detail-head"><strong>Step ${idx+1}: ${m.desc}</strong><button type="button">Close</button></div><div class="single-sendoff-bar"><div class="bar-head"><span>Target swim ${fmt(m.swim)}</span><span>Send-off ${fmt(m.send)}</span></div><div class="sendoff-track"><div class="sendoff-swim" style="width:${swimPct}%">Swim</div><div class="sendoff-rest" style="width:${100-swimPct}%">Rest</div></div></div><div class="step-detail-grid"><div><span>Distance</span><strong>${m.distance}m</strong></div><div><span>Repeats</span><strong>${m.repeat}</strong></div><div><span>Zone</span><strong>${m.z.z}</strong></div><div><span>Pace</span><strong>${fmt(m.pace)}/100m</strong></div><div><span>Send-off</span><strong>${fmt(m.send)}</strong></div><div><span>Approx rest</span><strong>${fmt(m.rest)}</strong></div></div>`;
    qs('button',p)?.addEventListener('click',()=>p.remove());
  }

  function setupCoachNotes(){
    qsa('.notes-section').forEach(sec=>{
      if(sec.dataset.v56NotesReady)return;
      sec.dataset.v56NotesReady='1';
      sec.classList.add('coach-notes-collapsed');
      const b=document.createElement('button');
      b.type='button';
      b.className='secondary compact-toggle notes-toggle';
      b.textContent='Show notes';
      b.addEventListener('click',function(e){e.stopPropagation();const c=sec.classList.toggle('coach-notes-collapsed');b.textContent=c?'Show notes':'Hide notes';});
      qs('h3',sec)?.appendChild(b);
    });
    const cg=qs('.coach-grid');
    if(cg&&!cg.dataset.v56GuideReady){
      cg.dataset.v56GuideReady='1';
      cg.classList.add('coach-instructions-collapsed');
      const b=document.createElement('button');
      b.type='button';
      b.className='secondary compact-toggle coach-instructions-toggle';
      b.textContent='Show session guidance';
      b.addEventListener('click',function(){const c=cg.classList.toggle('coach-instructions-collapsed');b.textContent=c?'Show session guidance':'Hide session guidance';});
      qs('.detail-title')?.insertAdjacentElement('afterend',b);
    }
  }

  function setupDetailObserver(){
    const panel=qs('.detail-panel');
    if(!panel||panel.dataset.v56ObserverReady)return;
    panel.dataset.v56ObserverReady='1';
    let timer=null;
    const mo=new MutationObserver(function(muts){
      for(const m of muts){
        if(m.target?.closest?.('.inline-step-detail'))continue;
        clearTimeout(timer);
        timer=setTimeout(function(){setupCoachNotes();updateFavDetail();},120);
        break;
      }
    });
    mo.observe(panel,{childList:true,subtree:true});
  }

  function init(){
    setupTabs();
    setupControls();
    collapseSections();
    setupCodeLogin();
    updateFavDetail();
    setupStepDetails();
    setupCoachNotes();
    setupDetailObserver();
    document.addEventListener('click',function(e){if(e.target.closest('.workout-card'))setTimeout(updateFavDetail,120);});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
