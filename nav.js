/* ============================================================
   GEIDAY next — LINE の構造で組み直したナビ
     上：名前のチップ（→アカウント）＋ さがす／所属 の束
     下：ホーム／つながる／知る／ニュース の4つ（Liquid Glass）
     ホーム＝時間割・地図・教員・予約のカード／つながる＝アーティスト
     知る＝記事（先頭に 留学／就活／受験生へ）／ニュース＝展示・講評／公募／譲り合い
   index.html の go()/pane/refresh() には手を入れず、後から読み込んで包む。
   ============================================================ */
(function(){
const KEY='geiday.role';
const ROLES={student:'藝大生',juken:'受験生',guest:'学外の人'};
const NAME={find:'さがす',tt:'時間割',map:'校内地図',tea:'教員',art:'アーティスト',rs:'予約',ex:'展示・講評',
  kb:'公募',gv:'譲り合い',ry:'留学',sk:'就活',ar:'記事',jk:'受験生へ',acc:'アカウント',home:'ホーム'};
const TABS=[{id:'home',l:'ホーム'},{id:'art',l:'つながる'},{id:'know',l:'知る'},{id:'news',l:'ニュース'}];
const UNDER={home:'home',tt:'home',find:'home',map:'home',tea:'home',rs:'home',acc:'home',
  art:'art', ex:'know',kb:'know',gv:'know',ry:'know',sk:'know',jk:'know', ar:'news'};
const KNOW=['ex','kb','gv','ry','sk'];   /* 「知る」のチップ */
const ENTRY={home:'home',art:'art',know:null,news:'ar'};
const I={
  home:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 11.5 12 4l8.5 7.5"/><path d="M6 10v9.5h12V10"/><path d="M10 19.5v-5h4v5"/></svg>',
  art:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19c.8-3 2.9-4.6 5.5-4.6s4.7 1.6 5.5 4.6"/><circle cx="16.5" cy="9.5" r="2.4"/><path d="M15.5 14.2c2.6 0 4.3 1.5 5 4.3"/></svg>',
  know:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6.5c-1.6-1.3-3.8-1.8-7.5-1.8v13c3.7 0 5.9.5 7.5 1.8 1.6-1.3 3.8-1.8 7.5-1.8v-13c-3.7 0-5.9.5-7.5 1.8z"/><path d="M12 6.5v13"/></svg>',
  news:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="4.5" width="17" height="15" rx="3"/><path d="M7 9h4.5M7 12.5h10M7 16h10M14 9h3"/></svg>',
  amc:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 9.5 12 4l8.5 5.5H3.5z"/><path d="M5.5 9.5v7M10 9.5v7M14 9.5v7M18.5 9.5v7M3.5 19.5h17"/></svg>',
  kobo:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M13.5 8.5 4.5 17.5l2 2 9-9"/><path d="M11.5 6.5l2.5-2.5 6 6-2.5 2.5z"/><path d="M15 3.5l1.5 1.5"/></svg>',
  ar:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6.5c-1.6-1.3-3.8-1.8-7.5-1.8v13c3.7 0 5.9.5 7.5 1.8 1.6-1.3 3.8-1.8 7.5-1.8v-13c-3.7 0-5.9.5-7.5 1.8z"/><path d="M12 6.5v13"/></svg>',
  ex:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="4.5" width="17" height="15" rx="3"/><path d="M7 9h4.5M7 12.5h10M7 16h10M14 9h3"/></svg>',
  find:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>',
  tt:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><rect x="3.5" y="5" width="17" height="15.5" rx="3.5"/><path d="M3.5 9.5h17M8 3v3.5M16 3v3.5"/><circle cx="8.3" cy="13.3" r=".9" fill="currentColor" stroke="none"/><circle cx="12" cy="13.3" r=".9" fill="currentColor" stroke="none"/><circle cx="15.7" cy="13.3" r=".9" fill="currentColor" stroke="none"/><circle cx="8.3" cy="17" r=".9" fill="currentColor" stroke="none"/><circle cx="12" cy="17" r=".9" fill="currentColor" stroke="none"/></svg>',
  map:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 8.5v11l5.5-2.5 6 2.5 5.5-2.5v-11L15 8.5"/><path d="M9 6.5v10.5M15 8.5v10.5"/><path d="M12 2.5a3 3 0 0 0-3 3c0 2.3 3 5.5 3 5.5s3-3.2 3-5.5a3 3 0 0 0-3-3z"/></svg>',
  tea:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3"/><circle cx="5.5" cy="10" r="2.2"/><circle cx="18.5" cy="10" r="2.2"/><path d="M7.5 19c.6-3 2.3-4.5 4.5-4.5s3.9 1.5 4.5 4.5M2.5 17.5c.4-2 1.6-3.2 3-3.2M21.5 17.5c-.4-2-1.6-3.2-3-3.2"/></svg>',
  rs:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
  kb:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11v2a2 2 0 0 0 2 2h1.5l3 5h2l-1.4-5H13l6 3V6l-6 3H6a2 2 0 0 0-2 2z"/></svg>',
  gv:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h11l-3-3M20 15H9l3 3"/></svg>',
  ry:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 12h17M12 3.5c-3 3-3 14 0 17M12 3.5c3 3 3 14 0 17"/><circle cx="12" cy="12" r="8.5"/></svg>',
  sk:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="7" width="17" height="12.5" rx="2.5"/><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3.5 12h17"/></svg>',
  jk:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-4.5L21 9l-9 4.5z"/><path d="M6.5 11v4.5c1.5 1.6 3.4 2.4 5.5 2.4s4-.8 5.5-2.4V11M21 9v5"/></svg>',
  gear:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  chev:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
  back:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M14 6l-6 6 6 6"/></svg>',
  ext:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7M9 7h8v8"/></svg>',
  role_student:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-4.5L21 9l-9 4.5z"/><path d="M6.5 11v4.5c1.5 1.6 3.4 2.4 5.5 2.4s4-.8 5.5-2.4V11"/></svg>',
  role_juken:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4.5l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5L4.8 9.8l5-.7z"/></svg>',
  role_guest:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V9l8-5 8 5v11"/><path d="M4 20h16M10 20v-5h4v5"/></svg>'
};
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let role=null; try{ role=localStorage.getItem(KEY); }catch(e){}
if(role && !ROLES[role]) role=null;
let cur='find', knowKind='ex';

/* ---------- DOM ---------- */
const main=document.querySelector('main');
const mk=(tag,id,cls)=>{ const e=document.createElement(tag); if(id) e.id=id; if(cls) e.className=cls; return e; };
const secHome=mk('section','p-home','pane'); main.appendChild(secHome);
const secJk=mk('section','p-jk','pane'); main.appendChild(secJk);
const back=mk('button','gback'); back.type='button'; main.insertBefore(back,main.firstChild);
const lhead=mk('div','lhead');
lhead.innerHTML='<button type="button" class="lchip" id="lchip"><span class="av"></span><b>Geiday</b></button>'+
  '<div class="lclu"><button type="button" id="lfind" aria-label="さがす">'+I.find+'</button><button type="button" id="lrole" aria-label="所属を変える">'+I.gear+'</button></div>';
document.body.insertBefore(lhead,main);
const edge=mk('div','gedge'); document.body.appendChild(edge);
const nav=mk('nav','gnav'); nav.setAttribute('aria-label','主なページ');
nav.innerHTML='<div class="gbar" id="gbar"><div id="glens"></div></div>'; document.body.appendChild(nav);
const onb=mk('div','onb'); onb.setAttribute('role','dialog'); onb.setAttribute('aria-label','あなたは？');
onb.innerHTML='<i class="b1"></i><i class="b2"></i><i class="b3"></i><div class="onbc"><div class="onbk">GEIDAY</div><h1 class="onbt">あなたは？</h1>'+
  '<button class="onbo" data-r="student"><span class="ic">'+I.role_student+'</span><span><b>藝大生</b><small>時間割・地図・予約。ぜんぶ</small></span><span class="ar">'+I.chev+'</span></button>'+
  '<button class="onbo" data-r="juken"><span class="ic">'+I.role_juken+'</span><span><b>受験生</b><small>先輩の受験記から</small></span><span class="ar">'+I.chev+'</span></button>'+
  '<button class="onbo" data-r="guest"><span class="ic">'+I.role_guest+'</span><span><b>学外の人</b><small>展示・アーティスト・公募</small></span><span class="ar">'+I.chev+'</span></button>'+
  '<div class="onbn">あとから右上の歯車で変えられます。</div></div>';
document.body.appendChild(onb);
if(role){ onb.classList.add('bye'); onb.style.display='none'; }
onb.addEventListener('click',e=>{ const b=e.target.closest('.onbo'); if(!b) return; setRole(b.dataset.r,true); });

function setRole(r,animate){
  role=r; try{ localStorage.setItem(KEY,r); }catch(e){}
  document.body.classList.remove('role-student','role-juken','role-guest'); document.body.classList.add('role-'+r);
  if(typeof window.go==='function'){ try{ window.go('home'); }catch(e){} }
  onb.classList.add('bye'); if(animate) setTimeout(()=>{ onb.style.display='none'; },480); else onb.style.display='none';
}
function askRole(){ onb.style.display='flex'; onb.offsetHeight; onb.classList.remove('bye'); }
window.geidayAskRole=askRole;
document.getElementById('lrole').onclick=askRole;
document.getElementById('lfind').onclick=()=>window.go('find');
document.getElementById('lchip').onclick=()=>window.go('acc');

/* ---------- 名前のチップ ---------- */
function paintChip(){
  const chip=document.getElementById('lchip'), av=chip.querySelector('.av'), b=chip.querySelector('b');
  let logged=false, prof=null;
  try{ logged=typeof isLoggedIn==='function' && isLoggedIn(); prof=(typeof myProfile==='function')?myProfile():null; }catch(e){}
  if(logged){
    const email=(typeof accountEmail==='function')?accountEmail():'';
    const name=(prof&&prof.name)||(email?email.split('@')[0]:'')||'アカウント';
    b.textContent=name;
    av.innerHTML=(prof&&prof.face)?'<img src="'+esc(prof.face)+'" alt="">':'<span style="font-family:Karla,sans-serif;font-weight:700;font-size:14px;color:var(--ink)">'+esc(name.slice(0,1).toUpperCase())+'</span>';
  }else{
    b.textContent=role==='student'?'ログイン':'Geiday';
    av.innerHTML=(typeof GEIDAY_MARK==='string')?GEIDAY_MARK:'';
  }
}
window.geidayPaintChip=paintChip;

/* ---------- 下のタブバー ---------- */
const bar=document.getElementById('gbar'), lens=document.getElementById('glens');
function tabW(){ const t=bar.querySelector('.gtab'); if(t && t.offsetWidth) return t.offsetWidth; const vw=Math.min(innerWidth,560); return Math.floor((vw-32-12)/TABS.length); }
function buildNav(){
  bar.querySelectorAll('.gtab').forEach(x=>x.remove());
  TABS.forEach(t=>{ const b=document.createElement('button'); b.type='button'; b.className='gtab'; b.dataset.p=t.id; b.innerHTML=I[t.id]+'<b>'+esc(t.l)+'</b>'; bar.appendChild(b); });
  requestAnimationFrame(()=>{ document.documentElement.style.setProperty('--tw',tabW()+'px'); sync(cur); });
}
function lensX(x){ lens.style.transform='translateX('+x+'px)'; lens.style.setProperty('--lx',(-x*.38)+'px'); }
function lensTo(i){ lensX(i*tabW()); }
function tabIndex(p){ const u=UNDER[p]||'home'; return Math.max(0,TABS.findIndex(t=>t.id===u)); }
function sync(p){
  cur=p; const i=tabIndex(p);
  bar.querySelectorAll('.gtab').forEach((b,k)=>{ const on=k===i;
    if(on && !b.classList.contains('on')){ const ic=b.querySelector('svg');
      if(ic && ic.animate) ic.animate([{transform:'scale(1)'},{transform:'scale(1.22)'},{transform:'scale(1)'}],{duration:420,easing:'cubic-bezier(.32,1.6,.45,1)'}); }
    b.classList.toggle('on',on); });
  lensTo(i);
  const u=UNDER[p]; const sub=(u==='home'&&p!=='home')||p==='jk';
  back.classList.toggle('show',sub);
  if(sub){ const to=u==='home'?'home':knowKind; back.innerHTML=I.back+'<span>'+(u==='home'?'ホーム':'知る')+'</span>'; back.onclick=()=>window.go(to); placeBack(); }
  paintChip();
}
function placeBack(){ const h=document.getElementById('lhead'); document.documentElement.style.setProperty('--gbtop',((h?h.offsetHeight:0)+10)+'px'); }
addEventListener('resize',()=>{ buildNav(); placeBack(); });
let drag=null; const rubber=(d,c)=>c*(1-1/(d/c+1));
bar.addEventListener('pointerdown',e=>{ drag={x0:e.clientX,idx:tabIndex(cur),moved:false,tab:e.target.closest('.gtab')}; try{ bar.setPointerCapture(e.pointerId); }catch(_){} lens.style.scale='1.12 1.16'; });
bar.addEventListener('pointermove',e=>{ if(!drag) return; const dx=e.clientX-drag.x0; if(Math.abs(dx)>12) drag.moved=true; if(!drag.moved) return;
  const W=tabW(), max=(TABS.length-1)*W; let x=drag.idx*W+dx; if(x<0) x=-rubber(-x,40); if(x>max) x=max+rubber(x-max,40); lens.style.transition='scale .35s var(--gl-spring)'; lensX(x); });
function endDrag(e){ if(!drag) return; lens.style.transition=''; lens.style.scale='1 1'; const st=drag; drag=null; const W=tabW();
  if(st.moved){ openTab(TABS[Math.max(0,Math.min(TABS.length-1,Math.round((st.idx*W+(e.clientX-st.x0))/W)))].id); }
  else{ let p=st.tab&&st.tab.dataset.p; if(!p){ const rc=bar.getBoundingClientRect(); p=TABS[Math.max(0,Math.min(TABS.length-1,Math.floor((e.clientX-rc.left-6)/W)))].id; } openTab(p); } }
bar.addEventListener('pointerup',endDrag);
bar.addEventListener('pointercancel',()=>{ lens.style.transition=''; lens.style.scale='1 1'; drag=null; lensTo(tabIndex(cur)); });
function openTab(id){ if(id==='know') id=knowKind; else if(ENTRY[id]) id=ENTRY[id]; if(cur===id){ scrollTo({top:0,behavior:'smooth'}); return; } window.go(id); }

/* ---------- go() を包む ---------- */
function wrapGo(){
  if(typeof window.go!=='function' || window.go.__line) return false;
  const orig=window.go;
  const w=function(p){ const prev=cur;
    if(p==='home') renderHome(); if(p==='jk') renderJuken(); if(KNOW.includes(p)) knowKind=p;
    orig(p);
    if(KNOW.includes(p)) mountKnow(p); if(p==='ar') mountNews();
    sync(p); if(p!==prev) scrollTo({top:0}); };
  w.__line=true; window.go=w; return true;
}
function boot(){ wrapGo(); try{ pane='home'; }catch(e){} paintChip(); }
if(!wrapGo()){ document.addEventListener('DOMContentLoaded',boot); } else boot();

/* ---------- ホーム ---------- */
function ttCount(){
  let tt={}; try{ tt=JSON.parse(localStorage.getItem('geidai_tt_v1')||'{}')||{}; }catch(e){}
  return Object.keys(tt).length;
}
function todayCard(){
  if(typeof byKey==='undefined' || typeof ttk!=='function' || typeof DATA==='undefined' || !DATA) return '';
  let tt={}; try{ tt=JSON.parse(localStorage.getItem('geidai_tt_v1')||'{}')||{}; }catch(e){}
  const d=['日','月','火','水','木','金','土'][new Date().getDay()];
  const t=(typeof term==='string')?term:'前期';
  const PT=(typeof PTIME!=='undefined')?PTIME:{};
  const rows=[];
  for(let p=1;p<=6;p++){ const v=tt[ttk(t,d,p)]; const c=v&&byKey[v]; if(c) rows.push([p,c]); }
  const md=(new Date().getMonth()+1)+'/'+new Date().getDate();
  let h='<div class="lcard wide lwide today"><b>今日 <span class="ld">'+md+'（'+d+'）</span></b><div class="lrows">';
  if(d==='日'||d==='土'||!rows.length){
    h+='<div class="lempty">'+(rows.length||d==='日'||d==='土'?'今日は授業がありません':'時間割が空です。「さがす」から入れられます')+'</div>';
  }else{
    h+=rows.map(([p,c])=>'<button type="button" class="lr" data-p="tt"><span class="lp"><b>'+p+'限</b><small>'+esc(PT[p]||'')+'</small></span><span class="lt"><span class="ttl">'+esc(c.title)+'</span><small>'+esc(c.teacher||'')+'</small></span><span class="chev">'+I.chev+'</span></button>').join('');
  }
  return h+'</div></div>';
}
function homeCards(){
  const r=role||'student';
  const n=ttCount(), nt=(typeof TEACHERS!=='undefined'&&TEACHERS.length)?TEACHERS.length+'人':'';
  const sq=(p,title,sub,extra)=>'<button type="button" class="lcard sq" data-p="'+p+'"><span class="ltile">'+I[p]+'</span><b>'+esc(title)+'</b><small>'+esc(sub)+'</small>'+(extra||'')+'</button>';
  const c={
    tt:sq('tt','時間割',n?('今学期 '+n+'コマ'):'まだ空です','<span class="lbtn" data-p="find">さがす</span>'),
    map:sq('map','校内地図','上野・取手'),
    tea:sq('tea','教員',nt),
    jk:sq('jk','受験生へ','先輩の受験記'),
    ex:sq('ex','展示','いま見られる')
  };
  const rows=(title,items)=>'<div class="lcard wide lwide"><b>'+esc(title)+'</b><div class="lrows">'+items.map(([p,l,ic])=>
    '<button type="button" class="lr" data-p="'+p+'"><span class="ltile s">'+I[ic||p]+'</span><span>'+esc(l)+'</span><span class="chev">'+I.chev+'</span></button>').join('')+'</div></div>';
  if(r==='juken') return '<div class="lrow">'+c.jk+c.map+c.tea+'</div>'+rows('見る',[['ex','展示・講評'],['kb','公募']])+featJk();
  if(r==='guest') return '<div class="lrow">'+c.ex+c.map+c.tea+'</div>'+rows('見る',[['kb','公募'],['art','アーティスト']]);
  return todayCard()+'<div class="lrow">'+c.tt+c.map+c.tea+'</div>'+rows('予約',[['rs','AMC','amc'],['rs','工房','kobo']])+featJk();
}
function featJk(){
  if(typeof JUKEN_POSTS==='undefined') return '';
  const x=JUKEN_POSTS.find(p=>p.pin===1)||JUKEN_POSTS[0]; if(!x) return '';
  return '<div class="lcard lwide"><b>あなたへ</b><a class="lfeat" href="'+esc(x.u)+'" target="_blank" rel="noopener noreferrer">'+
    (x.img?'<img src="'+esc(x.img)+'" alt="" loading="lazy">':'')+'<span><p>'+esc(x.t)+'</p><small>'+esc(JUKEN_PROFILE.name)+'（note）</small></span></a></div>';
}
function renderHome(){
  secHome.innerHTML='<div class="lh">'+homeCards()+'</div>';
  secHome.querySelectorAll('[data-p]').forEach(b=>b.addEventListener('click',e=>{ e.stopPropagation(); window.go(b.dataset.p); }));
}

/* ---------- 知る：大見出し＋チップ（展示・講評／公募／譲り合い／留学／就活） ---------- */
function mountKnow(p){
  const el=document.getElementById('p-'+p); if(!el) return;
  let k=el.querySelector('.lk.know');
  if(!k){ k=document.createElement('div'); k.className='lk know';
    k.innerHTML='<div class="ltitle"><h2>知る</h2><button type="button" class="lcirc" aria-label="さがす">'+I.find+'</button></div>'+
      '<div class="lchips">'+KNOW.map(x=>'<button type="button" data-p="'+x+'">'+esc(NAME[x])+'</button>').join('')+'</div>';
    k.querySelector('.lcirc').onclick=()=>window.go('find');
    k.querySelectorAll('.lchips button').forEach(b=>b.onclick=()=>window.go(b.dataset.p));
    el.insertBefore(k,el.firstChild); }
  k.querySelectorAll('.lchips button').forEach(b=>b.classList.toggle('on',b.dataset.p===p));
  const w=el.querySelector('.bhead .btn.o'); if(w && !w.classList.contains('chipg')){ w.classList.add('chipg','write'); k.querySelector('.ltitle').insertBefore(w,k.querySelector('.lcirc')); }
}
/* ---------- ニュース＝GEIDAYの記事 ---------- */
function mountNews(){
  const el=document.getElementById('p-ar'); if(!el || el.querySelector('.lk.news')) return;
  const k=document.createElement('div'); k.className='lk news';
  k.innerHTML='<div class="ltitle"><h2>ニュース</h2></div>';
  const q=el.querySelector('.bhead .btn.o'); if(q){ q.classList.add('chipg','ask'); k.querySelector('.ltitle').appendChild(q); }
  el.insertBefore(k,el.firstChild);
}

/* ---------- 上に引っ張るとグニャッ ---------- */
(function(){
  let y0=null, pulling=false;
  const chip=document.getElementById('lchip'), clu=document.querySelector('.lclu');
  const set=d=>{ const k=Math.min(d,120); const s=1+k/900, sy=1+k/500;
    main.style.transform='translateY('+(k*.35)+'px)'; chip.style.transform='scale('+s+','+sy+')'; clu.style.transform='scale('+s+','+sy+')'; };
  const reset=()=>{ const tr='transform .55s var(--gl-spring)'; main.style.transition=chip.style.transition=clu.style.transition=tr;
    main.style.transform=chip.style.transform=clu.style.transform=''; setTimeout(()=>{ main.style.transition=chip.style.transition=clu.style.transition=''; },600); };
  document.addEventListener('touchstart',e=>{ y0=(scrollY<=0 && !document.body.classList.contains('mapfull'))?e.touches[0].clientY:null; pulling=false; },{passive:true});
  document.addEventListener('touchmove',e=>{ if(y0==null) return; const d=e.touches[0].clientY-y0;
    if(d>0 && scrollY<=0){ pulling=true; main.style.transition=chip.style.transition=clu.style.transition=''; set(rubber(d,160)); } },{passive:true});
  document.addEventListener('touchend',()=>{ if(pulling) reset(); y0=null; pulling=false; },{passive:true});
})();

/* ---------- 受験生へ ---------- */
let jkFilter='すべて';
function renderJuken(){
  if(typeof JUKEN_POSTS==='undefined'){ secJk.innerHTML='<p class="jkl">読み込めませんでした。</p>'; return; }
  const P=JUKEN_PROFILE, all=JUKEN_POSTS.slice(); const pins=all.filter(x=>x.pin).sort((a,b)=>a.pin-b.pin);
  const kinds=['すべて','受験','制作と生活']; const list=all.filter(x=>jkFilter==='すべて'||x.k===jkFilter);
  const card=(x,n)=>'<a class="jkc" href="'+esc(x.u)+'" target="_blank" rel="noopener noreferrer">'+
    (x.img?'<img src="'+esc(x.img)+'" alt="" loading="lazy">':'<div style="aspect-ratio:1.91;background:var(--ln-fill)"></div>')+(n?'<span class="n">'+n+'</span>':'')+
    '<div class="b"><b>'+esc(x.t)+'</b>'+(x.ex?'<p>'+esc(x.ex)+'</p>':'')+'<small><span>'+esc(x.d.replace(/-/g,'.'))+'</span><span><b>♥</b> '+x.l+'</span></small></div></a>';
  secJk.innerHTML='<div class="jk"><h2 class="jkh">受験生へ</h2>'+
    '<p class="jkl">3浪して藝大に入った先輩が、受験のあいだに書いていたこと。<br>合格の話も、落ちた年の話も、そのまま。</p>'+
    '<div class="jkp"><img src="'+esc(P.img)+'" alt=""><div><b>'+esc(P.name)+'<em>note では '+esc(P.nick)+'</em></b><small>'+esc(P.bio)+'</small></div></div>'+
    '<div class="jklinks"><a class="chipg" href="'+esc(P.note)+'" target="_blank" rel="noopener noreferrer">note で読む '+I.ext+'</a><a class="chipg" href="'+esc(P.book.u)+'" target="_blank" rel="noopener noreferrer">本になりました '+I.ext+'</a></div>'+
    '<div class="jks">まず、この5本</div><div class="jkpin">'+pins.map(x=>card(x,x.pin)).join('')+'</div>'+
    '<a class="jkbook" href="'+esc(P.book.u)+'" target="_blank" rel="noopener noreferrer"><span class="bk"></span><span><b>『'+esc(P.book.t)+'』</b><small>'+esc(P.book.sub)+'</small></span><span class="chev">'+I.chev+'</span></a>'+
    '<div class="jks">ぜんぶ '+all.length+'本</div><div class="jklinks" id="jkchips">'+kinds.map(k=>'<button type="button" class="chipg'+(k===jkFilter?' on':'')+'" data-k="'+esc(k)+'">'+esc(k)+'<small>'+(k==='すべて'?all.length:all.filter(x=>x.k===k).length)+'</small></button>').join('')+'</div>'+
    '<div class="jkg">'+list.map(x=>card(x,0)).join('')+'</div><p class="jknote">見出しと冒頭だけを載せています。本文は note で。一覧は '+esc(P.fetched)+' 取得。</p></div>';
  secJk.querySelectorAll('#jkchips .chipg').forEach(b=>b.onclick=()=>{ jkFilter=b.dataset.k; renderJuken(); });
}
window.renderJuken=renderJuken; window.renderHome=renderHome;

if(role){ document.body.classList.add('role-'+role); }
buildNav(); placeBack(); paintChip();
/* 8MB の JS が届く前に、ホームだけ先に描いておく */
document.querySelectorAll('main > .pane.on').forEach(x=>x.classList.remove('on'));
secHome.classList.add('on'); renderHome(); cur='home';
})();
