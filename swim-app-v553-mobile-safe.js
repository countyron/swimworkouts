// Metric Swim Workout Library v5.5.3 known-good mobile-safe patch
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

  function init(){
    setupTabs();
    setupControls();
    collapseSections();
    setupCodeLogin();
    updateFavDetail();
    document.addEventListener('click',function(e){if(e.target.closest('.workout-card'))setTimeout(updateFavDetail,120);});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
