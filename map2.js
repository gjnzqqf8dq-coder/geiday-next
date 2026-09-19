/* ============================================================
   校内地図 v2（2026-09-20 作り直し）
   前の版は疑似3D（俯瞰・回転）で、スマホでは輪郭が重なって読めなかった。
   真上からの平面図に戻し、やることを3つに絞る：
     1. 建物の番号を見つける（番号ピルは拡大率に関係なく同じ大きさ）
     2. 押すと下に「この建物に何があるか」が出る
     3. 一覧からも探せる（一覧を押すと地図がそこへ寄る）
   データは前の版と同じ（places.js / campuses.js / rooms.js）。
   ============================================================ */
(function(){
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const AREA={art:'美術学部',music:'音楽学部',common:'共通'};
const ROOMS=(typeof ROOMDATA!=='undefined')?ROOMDATA:{};
const FREE=(typeof ROOMFREE!=='undefined')?ROOMFREE:{};
const INFO=(typeof PLACEINFO!=='undefined')?PLACEINFO:{};
const OTHERC=(typeof CAMPUSES!=='undefined')?CAMPUSES:{};
const CAMPS=[['ueno','上野'],['toride','取手'],['senju','千住'],['yokohama','横浜']].filter(([k])=>k==='ueno'||OTHERC[k]);
let campus='ueno', DS=null, sel=null, inited=false;
let view={cx:0,cy:0,s:1};           /* 中心（m）と 1m あたりの px */
let fit={cx:0,cy:0,s:1};
let svg, stage, sheet, list, W=0, H=0;
const NS='http://www.w3.org/2000/svg';

function data(k){
  if(k==='ueno') return {B:(typeof B!=='undefined')?B:[], OTHERS:(typeof OTHERS!=='undefined')?OTHERS:[], GROUND:(typeof GROUND!=='undefined')?GROUND:{}, meta:(typeof CAMPUS!=='undefined')?CAMPUS:{}};
  const c=OTHERC[k]; return {B:c.B||[], OTHERS:c.OTHERS||[], GROUND:c.GROUND||{}, meta:c.meta||{}};
}
function bounds(){
  let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;
  DS.B.forEach(b=>b.poly.forEach(([x,y])=>{ x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y); }));
  if(x0>x1){ x0=-100;x1=100;y0=-100;y1=100; }
  return {x0,x1,y0,y1};
}
function fitView(){
  const b=bounds(), pad=24;
  const s=Math.min((W-pad*2)/(b.x1-b.x0), (H-pad*2)/(b.y1-b.y0));
  fit={cx:(b.x0+b.x1)/2, cy:(b.y0+b.y1)/2, s:Math.max(.2,s)};
  view={...fit};
}
const P=(x,y)=>[(x-view.cx)*view.s+W/2,(y-view.cy)*view.s+H/2];
const pts=poly=>poly.map(([x,y])=>P(x,y).map(v=>v.toFixed(1)).join(',')).join(' ');
function el(tag,attrs,txt){ const e=document.createElementNS(NS,tag); for(const k in attrs) e.setAttribute(k,attrs[k]); if(txt!=null) e.textContent=txt; return e; }

function draw(){
  if(!svg) return;
  svg.setAttribute('viewBox','0 0 '+W+' '+H);
  while(svg.firstChild) svg.removeChild(svg.firstChild);
  const G=DS.GROUND||{};
  const layer=el('g',{});
  (G.grass||[]).concat(G.wood||[]).forEach(p=>layer.appendChild(el('polygon',{points:pts(p),fill:'#eef3e6'})));
  (G.pitch||[]).forEach(p=>layer.appendChild(el('polygon',{points:pts(p),fill:'#f1efe4'})));
  (G.water||[]).forEach(p=>layer.appendChild(el('polygon',{points:pts(p),fill:'#dbe8f8'})));
  (G.boundary||[]).forEach(p=>layer.appendChild(el('polygon',{points:pts(p),fill:'none',stroke:'#c9c9c9','stroke-width':1,'stroke-dasharray':'5 4'})));
  (G.road||[]).forEach(p=>layer.appendChild(el('polyline',{points:pts(p),fill:'none',stroke:'#e4e4e2','stroke-width':Math.max(2,3*view.s/2),'stroke-linecap':'round','stroke-linejoin':'round'})));
  (G.path||[]).forEach(p=>layer.appendChild(el('polyline',{points:pts(p),fill:'none',stroke:'#ebebe9','stroke-width':Math.max(1,1.4*view.s/2),'stroke-linecap':'round','stroke-linejoin':'round'})));
  (DS.OTHERS||[]).forEach(o=>layer.appendChild(el('polygon',{points:pts(o.poly),fill:'#f2f2f2',stroke:'#dcdcdc','stroke-width':1})));
  svg.appendChild(layer);
  /* 建物：同じ形（ひとつながり）は1回だけ描く */
  const seen=new Set(); const bl=el('g',{});
  DS.B.forEach(b=>{ const key=JSON.stringify(b.poly[0])+b.poly.length; const on=sel===b.n;
    if(seen.has(key) && !on) return; seen.add(key);
    const g=el('polygon',{points:pts(b.poly),fill:on?'#EAF0FB':'#ffffff',stroke:on?'#093FB4':'#3a5fc4','stroke-width':on?2.2:1.4,'stroke-linejoin':'round','data-n':b.n,class:'m2b'});
    bl.appendChild(g); });
  svg.appendChild(bl);
  /* 番号ピル：画面上の大きさは常に同じ */
  const ll=el('g',{});
  DS.B.forEach(b=>{ const [x,y]=P(b.lx,b.lz); const on=sel===b.n; const w=b.n>=100?30:24;
    const g=el('g',{class:'m2l'+(on?' on':''),'data-n':b.n,transform:'translate('+x.toFixed(1)+','+y.toFixed(1)+')'});
    g.appendChild(el('rect',{x:-w/2,y:-11,width:w,height:22,rx:7,fill:on?'#093FB4':'#fff',stroke:'#093FB4','stroke-width':1.4}));
    g.appendChild(el('text',{x:0,y:4.5,'text-anchor':'middle','font-size':12,'font-weight':700,fill:on?'#fff':'#093FB4','font-family':'Karla,-apple-system,sans-serif'},String(b.n).padStart(2,'0')));
    ll.appendChild(g); });
  svg.appendChild(ll);
  /* 北とスケール */
  const sc=el('g',{transform:'translate('+(W-70)+','+(H-22)+')'});
  const m=view.s*50>140?20:50; const px=m*view.s;
  sc.appendChild(el('line',{x1:0,y1:0,x2:px,y2:0,stroke:'#8e8e93','stroke-width':1.5}));
  sc.appendChild(el('text',{x:px/2,y:-6,'text-anchor':'middle','font-size':10,fill:'#8e8e93','font-family':'Karla,sans-serif'},m+' m'));
  svg.appendChild(sc);
}
function size(){
  const r=stage.getBoundingClientRect(); const nw=Math.round(r.width), nh=Math.round(r.height);
  if(nw===W && nh===H) return; W=nw; H=nh; fitView(); draw();
}
function zoomAt(f,px,py){
  const ns=Math.max(fit.s*.6,Math.min(fit.s*8,view.s*f));
  const [mx,my]=[(px-W/2)/view.s+view.cx,(py-H/2)/view.s+view.cy];
  view.s=ns; view.cx=mx-(px-W/2)/ns; view.cy=my-(py-H/2)/ns; draw();
}
function centerOn(b){ view.cx=b.lx; view.cy=b.lz; view.s=Math.max(view.s,fit.s*2.2); draw(); }

/* ---------- 建物の中身 ---------- */
function flOrder(k){ if(k==='BF')return -1; const m=/^B(\d+)F$/.exec(k); if(m) return -Number(m[1]); const n=parseInt(k,10); return isNaN(n)?99:n; }
function renderSheet(){
  if(sel==null){ sheet.innerHTML=''; sheet.classList.remove('on'); return; }
  const b=DS.B.find(x=>x.n===sel); if(!b){ sheet.innerHTML=''; return; }
  const data=ROOMS[b.n]||{}; const keys=new Set(Object.keys(data));
  for(let f=1;f<=(b.fl||0);f++) keys.add(f+'F'); if(b.bf) for(let f=1;f<=b.bf;f++) keys.add(f===1?'BF':'B'+f+'F');
  const ks=[...keys].sort((a,c)=>flOrder(c)-flOrder(a));
  const floors=ks.map(k=>{ const v=data[k]; const what=v&&v.what&&v.what.length?v.what.join('、'):''; const nos=v&&v.no&&v.no.length?v.no.join('、'):'';
    return '<div class="m2f"><span class="m2fn">'+esc(k)+'</span><span>'+(what?esc(what):'<span class="m2dim">—</span>')+(nos?'<div class="m2no">'+esc(nos)+'</div>':'')+'</span></div>'; }).join('');
  const info=INFO[b.n];
  sheet.innerHTML='<div class="m2h"><span class="m2num">'+String(b.n).padStart(2,'0')+'</span><div><h3>'+esc(b.jp)+'</h3><div class="m2en">'+esc(b.en||'')+'</div>'+
    '<div class="m2meta">'+esc(AREA[b.area]||'')+(b.fl?'　'+b.fl+'階建て':'')+(b.bf?' / 地下'+b.bf+'階':'')+'</div></div><button type="button" class="m2x" aria-label="閉じる">×</button></div>'+
    (b.memo?'<div class="m2memo">'+esc(b.memo)+'</div>':'')+(b.note?'<div class="m2note">'+esc(b.note)+'</div>':'')+
    (info&&info.items?'<div class="m2sec"><h4>ここでできること</h4><ul>'+info.items.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul></div>':'')+
    '<div class="m2sec"><h4>各階に何があるか</h4>'+(floors||'<div class="m2dim">階の情報がありません。</div>')+(FREE[b.n]?'<div class="m2note">'+esc(FREE[b.n].join('、'))+'</div>':'')+'</div>';
  sheet.classList.add('on');
  sheet.querySelector('.m2x').onclick=()=>{ sel=null; draw(); renderSheet(); renderList(); };
}
function renderList(){
  const q=(document.getElementById('m2q')||{}).value||'';
  const rows=DS.B.filter(b=>!q||(b.jp+' '+(b.en||'')+' '+String(b.n)).toLowerCase().includes(q.toLowerCase()));
  list.innerHTML='<div class="m2lh">建物 <small>'+DS.B.length+'</small></div>'+rows.map(b=>'<button type="button" class="m2r'+(sel===b.n?' on':'')+'" data-n="'+b.n+'"><span class="m2num">'+String(b.n).padStart(2,'0')+'</span><span class="m2rn">'+esc(b.jp)+'<small>'+esc(AREA[b.area]||'')+'</small></span></button>').join('');
  list.querySelectorAll('.m2r').forEach(r=>r.onclick=()=>{ select(Number(r.dataset.n),true); });
}
function select(n,center){
  sel=(sel===n)?null:n; const b=DS.B.find(x=>x.n===sel);
  if(b&&center) centerOn(b); else draw();
  renderSheet(); renderList();
  if(b){ stage.scrollIntoView({block:'start',behavior:'smooth'}); }
}
function loadCampus(k){ campus=k; DS=data(k); sel=null; fitView(); draw(); renderSheet(); renderList();
  document.querySelectorAll('#m2camp button').forEach(b=>b.classList.toggle('on',b.dataset.k===k));
  const m=document.getElementById('m2meta'); if(m) m.textContent=(DS.meta.addr||'')+(DS.meta.access?'　'+DS.meta.access:''); }

/* ---------- 触る ---------- */
function bindPointer(){
  let ptr=new Map(), last=null, moved=false, pinch=null;
  stage.addEventListener('pointerdown',e=>{ ptr.set(e.pointerId,[e.clientX,e.clientY]); stage.setPointerCapture(e.pointerId); moved=false;
    if(ptr.size===1) last=[e.clientX,e.clientY];
    if(ptr.size===2){ const a=[...ptr.values()]; pinch={d:Math.hypot(a[0][0]-a[1][0],a[0][1]-a[1][1])}; } });
  stage.addEventListener('pointermove',e=>{ if(!ptr.has(e.pointerId)) return; ptr.set(e.pointerId,[e.clientX,e.clientY]);
    if(ptr.size===2 && pinch){ const a=[...ptr.values()]; const d=Math.hypot(a[0][0]-a[1][0],a[0][1]-a[1][1]); const r=stage.getBoundingClientRect();
      zoomAt(d/pinch.d,(a[0][0]+a[1][0])/2-r.left,(a[0][1]+a[1][1])/2-r.top); pinch.d=d; moved=true; return; }
    if(ptr.size===1 && last){ const dx=e.clientX-last[0], dy=e.clientY-last[1]; if(Math.abs(dx)+Math.abs(dy)>3) moved=true;
      view.cx-=dx/view.s; view.cy-=dy/view.s; last=[e.clientX,e.clientY]; draw(); } });
  const up=e=>{ ptr.delete(e.pointerId); if(ptr.size<2) pinch=null; if(ptr.size===0){ last=null;
      if(!moved){ const t=e.target.closest('[data-n]'); if(t) select(Number(t.getAttribute('data-n')),false); } } };
  stage.addEventListener('pointerup',up); stage.addEventListener('pointercancel',up);
  stage.addEventListener('wheel',e=>{ e.preventDefault(); const r=stage.getBoundingClientRect(); zoomAt(e.deltaY<0?1.15:1/1.15,e.clientX-r.left,e.clientY-r.top); },{passive:false});
  document.getElementById('m2in').onclick=()=>zoomAt(1.3,W/2,H/2);
  document.getElementById('m2out').onclick=()=>zoomAt(1/1.3,W/2,H/2);
  document.getElementById('m2reset').onclick=()=>{ fitView(); draw(); };
}

function build(){
  const pane=document.getElementById('p-map'); if(!pane) return;
  pane.innerHTML='<div class="lk"><div class="ltitle"><h2>校内地図</h2></div>'+
    '<div class="lchips" id="m2camp">'+CAMPS.map(([k,l])=>'<button type="button" data-k="'+k+'">'+l+'</button>').join('')+'</div>'+
    '<div id="m2stage"><svg id="m2svg" xmlns="'+NS+'"></svg><div id="m2hud"><button type="button" id="m2in" aria-label="拡大">＋</button><button type="button" id="m2out" aria-label="縮小">−</button><button type="button" id="m2reset">戻す</button></div></div>'+
    '<div class="m2hint">1本指でなぞって移動／2本指で拡大／番号を押す</div>'+
    '<div id="m2sheet" class="lcard"></div>'+
    '<div class="m2search"><input id="m2q" type="search" placeholder="建物名・番号でさがす" autocomplete="off"></div>'+
    '<div id="m2list"></div><div class="m2meta" id="m2meta"></div></div>';
  svg=document.getElementById('m2svg'); stage=document.getElementById('m2stage'); sheet=document.getElementById('m2sheet'); list=document.getElementById('m2list');
  document.querySelectorAll('#m2camp button').forEach(b=>b.onclick=()=>loadCampus(b.dataset.k));
  document.getElementById('m2q').oninput=renderList;
  bindPointer();
  if('ResizeObserver' in window) new ResizeObserver(()=>size()).observe(stage);
}
window.initMap=function(){
  if(!inited){ inited=true; build(); DS=data(campus); loadCampus(campus); }
  size();
};
})();
