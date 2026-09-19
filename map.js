/* ============================================================
   校内地図（GEIDAY プラットフォームの1タブとして動く版）

   出典
     建物の輪郭・高さ・階数 : Project PLATEAU 3D都市モデル 台東区2024年度（国土交通省）
                              メッシュ53394661 / CityGML LOD0外周線 + measuredHeight
     地面・道・緑・門       : OpenStreetMap contributors（ODbL）
     建物の名称             : 東京藝術大学「上野校地案内図」2026年6月版
     各階に何があるか       : 学生便覧2026「建物・教室等一覧」＋ 芸術情報センター 無線LAN AP一覧

   操作の方針
     ドラッグ＝地図を動かす（回転ではない）。回転は Shift＋ドラッグか「回転」ボタン。
     ホイールとピンチはページごと拡大されないよう必ず止める。
   ============================================================ */
(function(){
"use strict";

let inited=false, cv, ctx, labels, stage;
let W=0,H=0,DPR=Math.min(devicePixelRatio||1,2),dirty=true;
let cam={yaw:-0.62,pitch:0.92,dist:330,tx:0,tz:0,zoom:3.0};
let target={...cam}, selected=null, hover=null, areaFilter='', selFloor=null, rotMode=false;
let mOpen=false;                 // 建物の中身（各階など）を開いているか
let ALLB=[], CX=0, CZ=0;

/* ── 校地の切り替え ──────────────────────────
   上野は PLATEAU の航空測量、それ以外は OpenStreetMap。精度が違うので画面に出す。 */
const OTHERC = (typeof CAMPUSES!=='undefined') ? CAMPUSES : {};
let campus='ueno';
let DS={B:[],OTHERS:[],GROUND:{},meta:{}};
function loadCampus(k){
  campus=k;
  if(k==='ueno'){
    /* GROUND は必ず写しを渡す。prepare() が G[k]=G[k].map(mv) と座標を
       中心へ寄せて**上書き**するので、元データを生で渡すと、
       他校地から戻ってくるたびに道と緑だけが約42m×60mずつ流されていく。
       建物は毎回 poly から作り直すのでずれない。地面だけ逃げるのはこれだった。 */
    DS={B:B, OTHERS:OTHERS, GROUND:JSON.parse(JSON.stringify(GROUND)),
        meta:{jp:'上野校地',en:'Ueno',addr:CAMPUS.addr,access:CAMPUS.access,
              src:'Project PLATEAU 3D都市モデル 台東区2024年度（国土交通省）＋ OpenStreetMap'}};
  } else {
    const c=OTHERC[k];
    DS={B:JSON.parse(JSON.stringify(c.B)), OTHERS:JSON.parse(JSON.stringify(c.OTHERS)),
        GROUND:JSON.parse(JSON.stringify(c.GROUND)), meta:c.meta};
  }
  selected=null; selFloor=null; areaFilter=''; mOpen=false;
  if(typeof resetLabels==='function' && labels) resetLabels();
  Object.assign(cam,{yaw:-0.62,pitch:0.92,dist:330,tx:0,tz:0,zoom:3});
  Object.assign(target,cam);
  prepare();
}

const AREA={art:'美術学部',music:'音楽学部',common:'共通'};
const ROOMS = (typeof ROOMDATA!=='undefined') ? ROOMDATA : {};
const FREE  = (typeof ROOMFREE!=='undefined') ? ROOMFREE : {};
const INFO  = (typeof PLACEINFO!=='undefined') ? PLACEINFO : {};
const esc = s => (s||'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));

/* ── 掲示板（建物ごと） ────────────────────────── */
const BKEY='geidai_board_v1';
let BOARD={};
try{ BOARD=JSON.parse(localStorage.getItem(BKEY)||'{}'); }catch(e){ BOARD={}; }
function boardOf(n){
  const mine=BOARD[n]||[];
  const dum=(typeof DUMMY_BOARD!=='undefined' && window.__useDummy!==false) ? (DUMMY_BOARD[n]||[]) : [];
  return dum.concat(mine).sort((a,b)=>(b.at||0)-(a.at||0));
}
function saveBoard(){ try{ localStorage.setItem(BKEY,JSON.stringify(BOARD)); }catch(e){} }

/* ── 色はサイトのCSS変数から取る ───────────────── */
let C={};
function readTheme(){
  const g=k=>getComputedStyle(document.body).getPropertyValue(k).trim();
  /* 地図の地形色は UI の6色ルールの外。情報レイヤーであって装飾ではない。
     緑地を青、水面をオレンジにしたら地図として読めなくなる。
     ただし地図の上に載る札・ボタン・選択色は6色に従う。 */
  C={ paper:g('--paper'), ink:g('--ink'), orange:g('--orange'),
      rule:g('--map-dim'), sub:g('--sub'), faint:g('--faint'), card:g('--paper') };
  C.wood=g('--map-wood'); C.woodline=g('--map-woodline');
  C.grass=g('--map-grass'); C.grassline=g('--map-grassline');
  C.water=g('--map-water'); C.waterline=g('--map-waterline');
  C.road=g('--map-road'); C.path=g('--map-path'); C.bound=g('--map-bound');
}

/* ── 座標 ─────────────────────────────────── */
function prepare(){
  ALLB = DS.B.concat(DS.OTHERS);
  let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;
  for(const b of ALLB) for(const p of b.poly){
    if(p[0]<x0)x0=p[0]; if(p[0]>x1)x1=p[0];
    if(p[1]<z0)z0=p[1]; if(p[1]>z1)z1=p[1];
  }
  CX=(x0+x1)/2; CZ=(z0+z1)/2;
  const mv=p=>[p[0]-CX,p[1]-CZ];
  for(const b of ALLB){
    b.ring=b.poly.map(mv);
    const n=b.ring.length;
    b.X=b.ring.reduce((s,p)=>s+p[0],0)/n;
    b.Z=b.ring.reduce((s,p)=>s+p[1],0)/n;
    if(b.lx!==undefined){ const q=mv([b.lx,b.lz]); b.LX=q[0]; b.LZ=q[1]; }
    else { b.LX=b.X; b.LZ=b.Z; }
  }
  const G=DS.GROUND;
  for(const k of ['boundary','wood','grass','water','pitch','path','road'])
    G[k]=(G[k]||[]).map(r=>r.map(mv));
  G.gate=(G.gate||[]).map(g=>{const q=mv([g.x,g.z]); return {...g,x:q[0],z:q[1]};});
  calcLimit();                 // 校地が替わったら、動かせる範囲も引き直す
}

/* ── 投影 ─────────────────────────────────── */
function project(p){
  let x=p[0]-cam.tx, y=p[1], z=p[2]-cam.tz;
  const cy=Math.cos(cam.yaw), sy=Math.sin(cam.yaw);
  const X=x*cy-z*sy, Z=x*sy+z*cy;
  const cp=Math.cos(cam.pitch), sp=Math.sin(cam.pitch);
  const Y=y*cp-Z*sp, D=y*sp+Z*cp;
  /* 焦点距離は固定。倍率だけ zoom に比例させる＝いくらでも寄れる */
  const f=cam.dist*2.4, s=f/(f+D+cam.dist*0.6), k=s*cam.zoom*1.15;
  return [W/2+X*k, H/2-Y*k+H*0.06, D, k];
}
/* 画面の点 → 地面(y=0)の座標。project の逆をたどる。
   カーソルの真下を固定したままズームするために要る。 */
function screenToGround(px,py){
  const f=cam.dist*2.4;
  const cp=Math.cos(cam.pitch), sp=Math.sin(cam.pitch);
  /* y=0 なので Y=-Z*sp, D=Z*cp。ここから s と k を Z の式で表して解く。 */
  const A=px-W/2, B=H/2+H*0.06-py;
  /* k = f/(f+D+dist*0.6) * zoom * 1.15、D=Z*cp
     B = Y*k = (-Z*sp)*k  → Z = -B/(sp*k)
     k は Z に依存するので、数回繰り返して収束させる（3回で十分）。 */
  let Z=0,k=0;
  for(let i=0;i<4;i++){
    const D=Z*cp;
    const den=f+D+cam.dist*0.6;
    if(Math.abs(den)<1e-6) return null;
    k=(f/den)*cam.zoom*1.15;
    if(Math.abs(sp*k)<1e-9) return null;
    Z=-B/(sp*k);
  }
  const X=A/k;
  /* ここまでが回転後の座標。yaw を戻す */
  const cy=Math.cos(cam.yaw), sy=Math.sin(cam.yaw);
  const x= X*cy + Z*sy;
  const z=-X*sy + Z*cy;
  return [x+cam.tx, z+cam.tz];
}

const polyPath=(P,pts)=>{ P.beginPath();
  for(let i=0;i<pts.length;i++) i?P.lineTo(pts[i][0],pts[i][1]):P.moveTo(pts[i][0],pts[i][1]);
  P.closePath(); };
const depthOf=pts=>pts.reduce((s,p)=>s+p[2],0)/pts.length;
const solid=b=>({base:b.ring.map(p=>project([p[0],0,p[1]])),
                 roof:b.ring.map(p=>project([p[0],b.h,p[1]]))});
function inPoly(x,y,poly){
  let ins=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
    const xi=poly[i][0],yi=poly[i][1],xj=poly[j][0],yj=poly[j][1];
    if(((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi)) ins=!ins;
  }
  return ins;
}
function inPoly2(x,z,poly){
  let ins=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
    const xi=poly[i][0],zi=poly[i][1],xj=poly[j][0],zj=poly[j][1];
    if(((zi>z)!==(zj>z))&&(x<(xj-xi)*(z-zi)/(zj-zi)+xi)) ins=!ins;
  }
  return ins;
}

/* ── 描画 ─────────────────────────────────── */
function drawGround(){
  const area=(rings,fill,stroke,dash)=>{
    ctx.save(); if(dash) ctx.setLineDash(dash);
    for(const r of rings){ polyPath(ctx,r.map(p=>project([p[0],0,p[1]])));
      if(fill){ctx.fillStyle=fill;ctx.fill();}
      if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();} }
    ctx.restore();
  };
  const line=(rings,style,wd,dash)=>{
    ctx.save(); ctx.strokeStyle=style; ctx.lineWidth=wd; if(dash) ctx.setLineDash(dash);
    for(const r of rings){ ctx.beginPath();
      r.forEach((p,i)=>{const q=project([p[0],0,p[1]]); i?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]);});
      ctx.stroke(); }
    ctx.restore();
  };
  area(DS.GROUND.water,C.water,C.waterline);
  area(DS.GROUND.grass,C.grass,C.grassline);
  area(DS.GROUND.pitch,C.grass,C.grassline,[4,3]);
  area(DS.GROUND.wood,C.wood,C.woodline,[3,3]);
  /* 森の点は数が多い。引きの絵では潰れて見えないので、寄ったときだけ描く。
     これを常時描くと、動かしている間ずっと重かった。 */
  if(cam.zoom>3.6){
  ctx.save(); ctx.strokeStyle=C.woodline; ctx.lineWidth=1;
  const step=cam.zoom>6?5.5:11;
  for(const r of DS.GROUND.wood){
    let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;
    for(const p of r){x0=Math.min(x0,p[0]);x1=Math.max(x1,p[0]);z0=Math.min(z0,p[1]);z1=Math.max(z1,p[1]);}
    for(let x=x0;x<=x1;x+=step) for(let z=z0;z<=z1;z+=step){
      if(!inPoly2(x,z,r)) continue;
      const c=project([x,3.5,z]);
      ctx.beginPath(); ctx.arc(c[0],c[1],Math.max(1.2,3.2*(c[3]||1)),0,6.284); ctx.stroke();
    }
  }
  ctx.restore();
  }
  line(DS.GROUND.road,C.road,2.2);
  line(DS.GROUND.path,C.path,1);
  line(DS.GROUND.boundary,C.bound,1.2,[7,4]);
}
function drawGates(){
  ctx.save();
  for(const g of DS.GROUND.gate){
    const a=project([g.x,0,g.z]), t=project([g.x,7,g.z]);
    ctx.strokeStyle=C.ink; ctx.lineWidth=1.2;
    ctx.beginPath(); ctx.moveTo(a[0],a[1]); ctx.lineTo(t[0],t[1]); ctx.stroke();
    ctx.beginPath(); ctx.arc(t[0],t[1],2.6,0,6.284);
    ctx.fillStyle=C.card; ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}
function flOrder(k){
  let m=k.match(/^B(\d*)F$/); if(m) return -(Number(m[1]||1));
  m=k.match(/^M(\d+)F$/);     if(m) return Number(m[1])+0.5;
  m=k.match(/^(\d+)F$/);      return m?Number(m[1]):0;
}
function floorY(b,k){
  const o=flOrder(k), n=b.fl||1;
  if(o<=0) return 0.02;
  const i=Math.min(n,Math.max(1,Math.round(o)));
  return b.h*(i-0.5)/n;
}
function drawBuilding(b,named,pre){
  const s=pre||solid(b);
  const dim=named?(areaFilter&&b.area!==areaFilter):true;
  const sel=named&&selected===b.n, hov=named&&hover===b.n;
  const ink=!named?C.rule:(dim?C.rule:C.ink);
  const lw=sel?1.9:hov?1.5:(named?1:.8);
  const n=s.base.length, quads=[];
  for(let i=0;i<n;i++){
    const j=(i+1)%n, q=[s.base[i],s.base[j],s.roof[j],s.roof[i]];
    quads.push({q,d:depthOf(q)});
  }
  quads.sort((a,c)=>c.d-a.d);
  for(const {q} of quads){
    polyPath(ctx,q); ctx.fillStyle=C.card; ctx.fill();
    if(sel){ ctx.fillStyle=C.orange; ctx.globalAlpha=.10; ctx.fill(); ctx.globalAlpha=1; }
    ctx.strokeStyle=sel?C.orange:ink; ctx.lineWidth=lw*.85; ctx.stroke();
  }
  polyPath(ctx,s.roof); ctx.fillStyle=C.card; ctx.fill();
  if(sel){ ctx.fillStyle=C.orange; ctx.globalAlpha=.16; ctx.fill(); ctx.globalAlpha=1; }
  ctx.strokeStyle=sel?C.orange:ink; ctx.lineWidth=lw; ctx.stroke();

  if(b.fl&&b.fl>1&&(sel||cam.zoom>4.2)){
    ctx.save(); ctx.strokeStyle=sel?C.orange:ink;
    ctx.globalAlpha=sel?.85:.3; ctx.lineWidth=sel?1:.7;
    for(let f=1;f<b.fl;f++){
      polyPath(ctx,b.ring.map(p=>project([p[0],b.h*f/b.fl,p[1]]))); ctx.stroke();
    }
    ctx.restore();
  }
  if(sel&&selFloor){
    const y=floorY(b,selFloor), th=(b.h/(b.fl||1))*0.9;
    const lo=b.ring.map(p=>project([p[0],Math.max(0,y-th/2),p[1]]));
    const hi=b.ring.map(p=>project([p[0],y+th/2,p[1]]));
    ctx.save();
    for(let i=0;i<lo.length;i++){
      const j=(i+1)%lo.length;
      polyPath(ctx,[lo[i],lo[j],hi[j],hi[i]]);
      ctx.fillStyle=C.orange; ctx.globalAlpha=.5; ctx.fill();
    }
    ctx.globalAlpha=1; ctx.strokeStyle=C.orange; ctx.lineWidth=1.6;
    polyPath(ctx,hi); ctx.stroke(); polyPath(ctx,lo); ctx.stroke();
    ctx.restore();
  }
  if(sel){
    ctx.save(); ctx.setLineDash([3,3]); ctx.strokeStyle=C.orange; ctx.lineWidth=1;
    polyPath(ctx,s.base); ctx.stroke(); ctx.restore();
  }
}
function drawScale(){
  const y=34, x=W-26;
  const p0=project([0,0,0]), p1=project([50,0,0]);
  let m=50, w=Math.hypot(p1[0]-p0[0],p1[1]-p0[1]);
  while(w>150){m/=2;w/=2;} while(w<55){m*=2;w*=2;}
  ctx.save(); ctx.strokeStyle=C.faint; ctx.fillStyle=C.faint; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(x-w,y); ctx.lineTo(x,y);
  ctx.moveTo(x-w,y-4); ctx.lineTo(x-w,y+4); ctx.moveTo(x,y-4); ctx.lineTo(x,y+4);
  ctx.stroke();
  ctx.font='10px SFMono-Regular,Menlo,monospace'; ctx.textAlign='center';
  ctx.fillText(m+' m', x-w/2, y-8);
  const cxp=x-w/2, cyp=y+40;
  const a=project([0,0,0]), b2=project([0,0,-30]);
  const ang=Math.atan2(b2[1]-a[1], b2[0]-a[0]);
  ctx.beginPath();
  ctx.moveTo(cxp+Math.cos(ang)*13, cyp+Math.sin(ang)*13);
  ctx.lineTo(cxp-Math.cos(ang)*9-Math.sin(ang)*4, cyp-Math.sin(ang)*9+Math.cos(ang)*4);
  ctx.lineTo(cxp-Math.cos(ang)*9+Math.sin(ang)*4, cyp-Math.sin(ang)*9-Math.cos(ang)*4);
  ctx.closePath(); ctx.fill();
  ctx.fillText('N', cxp+Math.cos(ang)*21, cyp+Math.sin(ang)*21+3.5);
  ctx.restore();
}
/* ラベルは作り直さない。
   前は毎フレーム innerHTML を差し替えて、30個のDOMを捨てて作り、
   さらに1個ずつに3つのイベントを付け直していた。
   1秒で5000回以上のイベント登録になっていて、これがラグの主因だった。
   いまは要素を使い回し、動かすのは transform だけ（レイアウトが走らない）。 */
const LB={ gate:[], bld:[], fl:[], nearOn:null, selOn:undefined, filtOn:undefined };
function ensureLabels(){
  if(LB.bld.length) return;
  const mk=(cls,txt)=>{ const e=document.createElement('span'); e.className=cls;
                        e.textContent=txt||''; labels.appendChild(e); return e; };
  for(const g of DS.GROUND.gate) LB.gate.push(g.name?mk('mgt',g.name):null);
  for(const b of DS.B){ const e=mk('mlb'); e.dataset.n=b.n; LB.bld.push(e); }
  for(let i=0;i<14;i++) LB.fl.push(mk('mfl'));
  /* イベントは器に1つだけ付ける。中身が入れ替わっても付け直さなくて済む。 */
  labels.onclick=e=>{ const t=e.target.closest('.mlb'); if(t) select(Number(t.dataset.n)); };
  labels.onmouseover=e=>{ const t=e.target.closest('.mlb');
    const v=t?Number(t.dataset.n):null; if(v!==hover){hover=v;dirty=true;} };
  labels.onmouseleave=()=>{ if(hover!==null){hover=null;dirty=true;} };
}
function resetLabels(){ labels.innerHTML=''; LB.gate=[];LB.bld=[];LB.fl=[];
                        LB.nearOn=null; LB.selOn=undefined; LB.filtOn=undefined; }

function draw(){
  if(!ctx) return;
  ctx.clearRect(0,0,W,H); ctx.lineJoin='round'; ctx.lineCap='round';
  drawGround();

  /* 建物の投影は1回だけ。前は並べ替え用と描画用で2回やっていた。 */
  const items=[];
  for(const b of ALLB){
    const sd=solid(b);
    items.push({b, sd, d:depthOf(sd.roof), named:b.n!==undefined});
  }
  items.sort((p,q)=>q.d-p.d);
  for(const it of items) drawBuilding(it.b,it.named,it.sd);
  drawGates(); drawScale();

  ensureLabels();
  const near=cam.zoom>4.2;
  /* 文字を書き換えるのは、内容が変わったときだけ */
  const textDirty = (LB.nearOn!==near)||(LB.selOn!==selected)||(LB.filtOn!==areaFilter);

  DS.GROUND.gate.forEach((g,i)=>{
    const e=LB.gate[i]; if(!e) return;
    const t=project([g.x,9,g.z]);
    const out=t[0]<-70||t[0]>W+70||t[1]<-40||t[1]>H+40;
    e.style.display=out?'none':'';
    if(!out) e.style.transform=`translate(-50%,-50%) translate(${t[0].toFixed(1)}px,${t[1].toFixed(1)}px)`;
  });
  DS.B.forEach((b,i)=>{
    const e=LB.bld[i];
    const top=project([b.LX,b.h+3,b.LZ]);
    const out=top[0]<-90||top[0]>W+90||top[1]<-40||top[1]>H+40;
    e.style.display=out?'none':'';
    if(out) return;
    e.style.transform=`translate(-50%,-50%) translate(${top[0].toFixed(1)}px,${top[1].toFixed(1)}px)`;
    if(textDirty){
      const dim=areaFilter&&b.area!==areaFilter, on=selected===b.n;
      e.className='mlb'+(on?' on':'')+(dim?' dim':'');
      e.textContent=String(b.n).padStart(2,'0')+((on||near)?' '+b.jp:'');
    }
  });
  const sb=selected!=null?DS.B.find(x=>x.n===selected):null;
  LB.fl.forEach((e,i)=>{
    const f=i+1;
    if(!sb||!sb.fl||f>sb.fl){ e.style.display='none'; return; }
    const q=project([sb.X,sb.h*(f-0.5)/sb.fl,sb.Z]);
    if(q[0]<-40||q[0]>W+40){ e.style.display='none'; return; }
    e.style.display='';
    e.style.transform=`translate(0,-50%) translate(${(q[0]+Math.max(14,26*(q[3]||1))).toFixed(1)}px,${q[1].toFixed(1)}px)`;
    if(textDirty||e.textContent!==f+'F') e.textContent=f+'F';
  });
  LB.nearOn=near; LB.selOn=selected; LB.filtOn=areaFilter;
}
/* 動かしている間は解像度を落とす。止まったら戻す。
   1380×1316（=180万画素）をDPR2で毎フレーム塗り直すと、
   動かしている最中だけ確実に間に合わない。
   止まっている絵は綺麗である必要があるが、動いている絵は必要ない。 */
let lowRes=false, calmT=null;
function setRes(low){
  if(low===lowRes) return;
  lowRes=low;
  const d=low?1:DPR;
  cv.width=W*d; cv.height=H*d;
  ctx.setTransform(d,0,0,d,0,0);
  dirty=true;
}
function tick(){
  let moved=false;
  for(const k of ['yaw','pitch','dist','tx','tz','zoom']){
    const d=target[k]-cam[k];
    if(Math.abs(d)>1e-4){cam[k]+=d*0.18;moved=true;}
  }
  if(moved){
    if(DPR>1) setRes(true);
    clearTimeout(calmT);
    calmT=setTimeout(()=>setRes(false),180);
  }
  if(moved||dirty){draw();dirty=false;}
  requestAnimationFrame(tick);
}

/* ── 操作 ─────────────────────────────────── */
const ZMAX=42, ZMIN=.45;
/* 引きの下限は「全体が収まる倍率」。fitView が計るたびに更新する。
   これより引けると、校地が画面の中で切手みたいに縮んで、まわりが白一色になる。
   見たいものが全部見えている状態より引く理由は無い。 */
let ZFIT=ZMIN;
function setZoom(z){
  target.zoom=Math.max(Math.max(ZMIN,ZFIT*0.92),Math.min(ZMAX,z));
  clampTarget();
}
/* 動かせる範囲。建物と敷地の外側に少しだけ余白を持たせた矩形で、
   ここから出られないようにする。何もない白い場所まで行けると、
   自分がどこを見ているのか分からなくなって、戻ってこられない。 */
let LIMIT=null;
function calcLimit(){
  let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;
  const put=(x,z)=>{ if(x<x0)x0=x; if(x>x1)x1=x; if(z<z0)z0=z; if(z>z1)z1=z; };
  for(const b of (DS.B||[])) for(const p of b.ring) put(p[0],p[1]);
  for(const r of ((DS.GROUND&&DS.GROUND.boundary)||[])) for(const p of r) put(p[0],p[1]);
  if(x0>x1){ LIMIT=null; return; }
  /* 敷地の対角の12%を余白にする。寄っているときほど、
     端の建物を画面の真ん中に置きたくなるので、その分だけ許す。 */
  const m=Math.hypot(x1-x0,z1-z0)*0.12;
  LIMIT={x0:x0-m, x1:x1+m, z0:z0-m, z1:z1+m};
}
function clampTarget(){
  if(!LIMIT) return;
  target.tx=Math.max(LIMIT.x0,Math.min(LIMIT.x1,target.tx));
  target.tz=Math.max(LIMIT.z0,Math.min(LIMIT.z1,target.tz));
}
function panBy(dxPx,dyPx){
  const k=project([0,0,0])[3]||1, sp=Math.max(0.18,Math.sin(cam.pitch));
  const dX=dxPx/k, dZ=dyPx/(sp*k);
  const cy=Math.cos(cam.yaw), sy=Math.sin(cam.yaw);
  target.tx-=dX*cy+dZ*sy;
  target.tz-=-dX*sy+dZ*cy;
  clampTarget();
}
function sameRing(b){
  const k=JSON.stringify(b.ring);
  return DS.B.filter(x=>JSON.stringify(x.ring)===k);
}
function pickAmong(list,mx,my){
  if(list.length===1) return list[0].n;
  let best=list[0], bd=Infinity;
  for(const b of list){
    const q=project([b.LX,b.h,b.LZ]);
    const d=(q[0]-mx)**2+(q[1]-my)**2;
    if(d<bd){bd=d;best=b;}
  }
  return best.n;
}
function pick(e){
  const r=cv.getBoundingClientRect(), mx=e.clientX-r.left, my=e.clientY-r.top;
  const cands=DS.B.map(b=>{const s=solid(b);
    return {b,roof:s.roof,base:s.base,d:depthOf(s.roof)};}).sort((p,q)=>p.d-q.d);
  for(const c of cands) if(inPoly(mx,my,c.roof)){ select(pickAmong(sameRing(c.b),mx,my)); return; }
  for(const c of cands) if(inPoly(mx,my,c.base)){ select(pickAmong(sameRing(c.b),mx,my)); return; }
  let near=null, nd=26*26;
  for(const b of DS.B){
    const q=project([b.LX,b.h,b.LZ]);
    const d=(q[0]-mx)**2+(q[1]-my)**2;
    if(d<nd){nd=d;near=b.n;}
  }
  select(near);
}
function fitView(){
  const save={...cam};
  cam.yaw=target.yaw; cam.pitch=target.pitch; cam.tx=0; cam.tz=0;
  for(let k=0;k<4;k++){
    /* 名前つき建物だけに合わせると、OSMの収録が薄い校地で極端に寄ってしまう。
       敷地境界と、無名を含む全建物に合わせる。 */
    let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;
    const put=q=>{ if(q[0]<x0)x0=q[0]; if(q[0]>x1)x1=q[0];
                   if(q[1]<y0)y0=q[1]; if(q[1]>y1)y1=q[1]; };
    for(const b of ALLB) for(const p of b.ring) put(project([p[0],b.h,p[1]]));
    for(const r of (DS.GROUND.boundary||[])) for(const p of r) put(project([p[0],0,p[1]]));
    cam.zoom=Math.max(ZMIN,Math.min(ZMAX,
      cam.zoom*Math.min((W*0.84)/Math.max(1,x1-x0),(H*0.82)/Math.max(1,y1-y0))));
  }
  const z=cam.zoom; Object.assign(cam,save);
  ZFIT=z;                       // これが「ちょうど全体」の倍率
  target.zoom=z; target.tx=0; target.tz=0;
}
const VIEWS={iso:{yaw:-0.62,pitch:0.92},top:{yaw:0,pitch:1.52},
             south:{yaw:0,pitch:0.14},gate:{yaw:-2.05,pitch:0.30}};

/* ── 選択と右パネル ────────────────────────── */
function select(n){
  selected=n; selFloor=null; mOpen=false; dirty=true;
  if(n==null){ target.tx=0; target.tz=0; if(target.zoom>6) fitView(); }
  else{
    const b=DS.B.find(x=>x.n===n);
    target.tx=b.X; target.tz=b.Z;
    target.zoom=Math.max(target.zoom,7.5);
    target.pitch=Math.max(target.pitch,0.45);
  }
  renderList(); renderPanel();
  /* 一覧の該当行まで送るのは、一覧が実際に見えているときだけ。
     スマホでは一覧を隠しているので、これをやると
     地図で押した建物とは関係ない場所へページごと飛ばされる。 */
  const side=document.querySelector('.mside');
  if(side && getComputedStyle(side).display!=='none'){
    const row=document.querySelector(`#mlist .mrow[data-n="${n}"]`);
    if(row) row.scrollIntoView({block:'nearest'});
  }
}
function renderCampusBar(){
  const el=document.getElementById('mcamp'); if(!el) return;
  const L=[['ueno','上野'],['toride','取手'],['senju','千住'],['yokohama','横浜']];
  el.innerHTML=L.map(([k,t])=>`<button data-c="${k}" class="${campus===k?'on':''}">${t}</button>`).join('')
    +`<span class="mcsrc">${esc(DS.meta.addr||'')}<br>${esc(DS.meta.src||'')}</span>`;
  /* スマホでは上の出典を隠している（CSS）。代わりに地図の下に短く出す。
     出どころの全文は「このサイトについて」に載せてある。 */
  el.querySelectorAll('button').forEach(b=>b.onclick=()=>{
    loadCampus(b.dataset.c); renderCampusBar(); renderList(); renderPanel(); fitView(); dirty=true;
  });
}
function renderList(){
  const areas=[...new Set(DS.B.map(b=>b.area))];
  document.getElementById('mfilt').innerHTML=
    ['すべて',...areas.map(a=>AREA[a])].map((t,i)=>{
      const v=i===0?'':areas[i-1];
      return `<button data-a="${v}" class="${areaFilter===v?'on':''}">${t}</button>`;
    }).join('');
  document.querySelectorAll('#mfilt button').forEach(b=>
    b.onclick=()=>{areaFilter=b.dataset.a;dirty=true;renderList();});
  const list=DS.B.filter(b=>!areaFilter||b.area===areaFilter);
  document.getElementById('mlist').innerHTML=list.map(b=>`
    <div class="mrow${selected===b.n?' on':''}" data-n="${b.n}">
      <span class="m1">${String(b.n).padStart(2,'0')}</span>
      <span><span class="m2">${esc(b.jp)}</span>${ROOMS[b.n]?'<span class="mhas">中あり</span>':''}
        <div class="msub">${AREA[b.area]}${b.memo?' ／ '+esc(b.memo):''}</div></span>
      <span class="m3">${b.fl?b.fl+'F':'—'}<br>${b.h}m</span>
    </div>`).join('');
  document.querySelectorAll('#mlist .mrow').forEach(r=>
    r.onclick=()=>select(Number(r.dataset.n)));
}
/* 操作の説明は端末で変える。指で触る端末に「ホイール」と書いても意味がない。 */
const TOUCH = matchMedia('(pointer:coarse)').matches;
const HOWTO = TOUCH
  ? ['1本指でなぞると動く／2本指の広げ縮めで拡大',
     '回したいときは「回転」を押してから、1本指でなぞる']
  : ['2本指で動かす／ピンチで拡大',
     '回すのは Shift＋ドラッグ。Space を押しながらだと必ず動かせます'];

/* 建物を選んでいないときの右側。
   ここが空白のままだと、画面の1/4がずっと死んだままになる。
   選ぶ前でも読む値のあるものを置く。 */
function renderIdle(el){
  /* 建物を選ぶ前に出すものは無い。地図を見に来た人が見たいのは地図。 */
  el.innerHTML = '';
}

function renderPanel(){
  const el=document.getElementById('mpanel');
  /* スマホでは下からせり出す板にしている。選ばれていなければ引っ込める。 */
  el.classList.toggle('mopen', selected!=null);
  const lay=document.querySelector('.maplayout');
  if(lay) lay.classList.toggle('nosel', selected==null);
  if(selected==null){ renderIdle(el); return; }
  const b=DS.B.find(x=>x.n===selected);
  const data=ROOMS[b.n]||{};
  const keys=new Set(Object.keys(data));
  for(let f=1;f<=(b.fl||0);f++) keys.add(f+'F');
  if(b.bf) for(let f=1;f<=b.bf;f++) keys.add(f===1?'BF':`B${f}F`);
  const ks=[...keys].sort((a,c)=>flOrder(c)-flOrder(a));
  const floors=ks.map(k=>{
    const v=data[k];
    const what=v&&v.what.length?esc(v.what.join('、')):'';
    const nos=v&&v.no.length?esc(v.no.join('、')):'';
    return `<div class="mfr${selFloor===k?' on':''}" data-f="${k}">
      <span class="mn">${k}</span>
      <span>${what?`<span>${what}</span>`:'<span class="mc">—</span>'}
        ${nos?`<div class="mrn">${nos}</div>`:''}</span></div>`;
  }).join('');

  const info=INFO[b.n];
  /* 建物を押した瞬間に出すのは、名前・エリア・階数まで。
     中身まで一度に開くと画面の半分が板で埋まり、肝心の地図が見えなくなる。
     続きは押したときだけ開く。 */
  el.innerHTML=`
    <div class="mhead">
      <span class="mno">${String(b.n).padStart(2,'0')}</span>
      <h3>${esc(b.jp)}</h3>
      <div class="men">${esc(b.en)}</div>
      <div class="mmeta">${AREA[b.area]}　${b.fl?b.fl+'階建て':'階数不明'}${b.bf?' / 地下'+b.bf+'階':''}</div>
      <button class="mclose" id="mcl" aria-label="閉じる">×</button>
    </div>
    <button class="mmore" id="mmore" aria-expanded="${mOpen?'true':'false'}">
      ${mOpen?'とじる':'中を見る'}<i>${mOpen?'▲':'▼'}</i></button>
    ${!mOpen?'':`<div class="mdeep">
      ${b.memo?`<div class="mmemo">${esc(b.memo)}</div>`:''}
      ${b.note?`<div class="mnote">${esc(b.note)}</div>`:''}
      ${info?`<div class="msec"><h4>ここでできること</h4>
        <ul class="minfo">${info.items.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>
        </div>`:''}
      <div class="msec"><h4>各階に何があるか</h4>
        ${floors||'<div class="mc">階の情報がありません。</div>'}
        ${FREE[b.n]?`<div class="mnote">${esc(FREE[b.n].join('、'))}</div>`:''}
      </div>
      <div class="msec"><h4>大きさ</h4>
        <div class="mmeta">${b.m2}㎡・高さ${b.h}m</div></div>
    </div>`}`;

  el.querySelectorAll('.mfr').forEach(r=>r.onclick=()=>{
    selFloor = selFloor===r.dataset.f ? null : r.dataset.f;
    renderPanel(); dirty=true;
  });
  const mo=document.getElementById('mmore');
  if(mo) mo.onclick=()=>{ mOpen=!mOpen; renderPanel(); };
  const mc=document.getElementById('mcl');
  if(mc) mc.onclick=()=>{ selected=null; selFloor=null; mOpen=false;
    renderList(); renderPanel(); dirty=true; };
}

/* ── 起動 ─────────────────────────────────── */
function resize(){
  const r=cv.getBoundingClientRect();
  const w=Math.max(1,Math.round(r.width)), h=Math.max(1,Math.round(r.height));
  if(w===W&&h===H) return false;
  W=w;H=h; cv.width=W*DPR; cv.height=H*DPR; ctx.setTransform(DPR,0,0,DPR,0,0);
  return true;
}
function initMap(){
  if(inited){ if(resize()) dirty=true; dirty=true; return; }
  inited=true;
  cv=document.getElementById('mcv'); ctx=cv.getContext('2d');
  labels=document.getElementById('mlabels'); stage=document.getElementById('mstage');
  const hint=document.getElementById('mhint');
  if(hint) hint.innerHTML = TOUCH
    ? '1本指でなぞって移動 ／ 2本指で拡大 ／ 建物をタップ'
    : '2本指で動かす ／ ピンチで拡大 ／ Shift＋ドラッグで回す';
  readTheme(); loadCampus('ueno'); resize(); renderCampusBar(); renderList(); renderPanel();

  addEventListener('resize',()=>{ if(resize()){dirty=true; if(selected==null) fitView();} });
  if(window.ResizeObserver) new ResizeObserver(()=>{
    if(resize()){dirty=true; if(selected==null) fitView();}
  }).observe(stage);

  let drag=null;
  /* 指はホイールを持っていない。
     拡大の口は長いあいだ「ctrlKey つきの wheel」しか無く、これは macOS の
     トラックパッド専用だった。iPhone はその形を送らないので、2本の指が
     どちらも同じ drag に流れ込み、panBy に渡る移動量が
     「指1の位置 − 指2の位置」＝指の間隔そのものになっていた。
     符号が毎イベント反転するので、地図が指の幅ぶん左右に暴れる。
     （実測：ラベルのxが 104→199→85→218→66→237 と ±95〜190px 往復）
     指を2本置いた時点でパンをやめ、ピンチとして扱う。 */
  const pts=new Map();          // いま触れている指（pointerId → 位置）
  let pinch=null;               // {d:指の間隔, x,y:2本の中点}
  const gauge=()=>{ const [a,b]=[...pts.values()];
    return {d:Math.hypot(a.x-b.x,a.y-b.y), x:(a.x+b.x)/2, y:(a.y+b.y)/2}; };

  cv.addEventListener('pointerdown',e=>{
    if(e.pointerType==='touch'){
      pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
      if(pts.size>=2){
        /* 2本目が着いた。1本目で始まりかけたパンは無かったことにする。
           これをしないと、指を離した時に pick() が走って建物が勝手に選ばれる。 */
        drag=null; pinch=gauge();
        cv.setPointerCapture(e.pointerId);
        return;
      }
    }
    /* Figma と同じ。既定は「掴んで動かす」。
       回すのは、回転モードのときか Shift＋ドラッグか右ボタンのとき。
       中ボタンと Space は Figma と同じく必ず「動かす」。 */
    const grab = e.button===1 || (window.__mapSpace && window.__mapSpace());
    drag={x:e.clientX,y:e.clientY,px:e.clientX,py:e.clientY,
          yaw:target.yaw,pitch:target.pitch,moved:0,
          rot: grab ? false : (rotMode||e.shiftKey||e.button===2)};
    cv.style.cursor='grabbing';
    cv.setPointerCapture(e.pointerId);
  });
  cv.addEventListener('pointermove',e=>{
    if(e.pointerType==='touch' && pts.has(e.pointerId))
      pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pinch && pts.size>=2){
      const n=gauge(), r=cv.getBoundingClientRect();
      if(pinch.d>8 && n.d>8){
        /* 指の間隔が広がった分だけ寄る。中点の真下を固定するので、
           広げた場所がそのまま画面に残る（ホイールのときと同じ扱い）。 */
        const f=Math.max(.5,Math.min(2,n.d/pinch.d));
        zoomAt(f, n.x-r.left, n.y-r.top);
      }
      /* 2本そろえて滑らせた分は、そのまま平行移動 */
      panBy(n.x-pinch.x, n.y-pinch.y);
      cam.tx=target.tx; cam.tz=target.tz;
      pinch=n; dirty=true;
      return;
    }
    if(!drag) return;
    const dx=e.clientX-drag.x, dy=e.clientY-drag.y;
    drag.moved=Math.max(drag.moved,Math.abs(dx)+Math.abs(dy));
    if(drag.rot){
      target.yaw=drag.yaw+dx*0.0042;
      target.pitch=Math.max(0.10,Math.min(1.52,drag.pitch+dy*0.0035));
    } else {
      panBy(e.clientX-drag.px, e.clientY-drag.py);
      cam.tx=target.tx; cam.tz=target.tz; dirty=true;
    }
    drag.px=e.clientX; drag.py=e.clientY;
  });
  const release=e=>{
    if(e.pointerType==='touch') pts.delete(e.pointerId);
    if(pinch){
      /* 指が1本になってもパンに戻さない。戻すと、残った指の位置へ地図が飛ぶ。
         いったん全部離してもらう。ピンチの直後に建物を選ばないのもここ。 */
      if(pts.size<2){ pinch=null; drag=null; }
      return;
    }
    if(drag&&drag.moved<4) pick(e);
    drag=null;
    cv.style.cursor=(window.__mapSpace&&window.__mapSpace())?'grab':(rotMode?'alias':'grab');
  };
  cv.addEventListener('pointerup',release);
  cv.addEventListener('pointercancel',e=>{
    if(e.pointerType==='touch') pts.delete(e.pointerId);
    if(pts.size<2) pinch=null;
    drag=null; cv.style.cursor='grab';
  });
  cv.addEventListener('contextmenu',e=>e.preventDefault());

  /* ページごと拡大されないよう必ず止める。ピンチは ctrlKey つきの wheel として来る */
  /* 効きが強すぎると操作が怖い。1回の入力での変化率に上限をかけ、
     トラックパッドのピンチ（ctrlKey つき）は特に穏やかにする。 */
  /* ── Figma と同じ操作にする ─────────────────────
     Figma:
       2本指スクロール       → 地図が動く（ズームではない）
       ピンチ                → ズーム。指の位置が中心
       Cmd/Ctrl + スクロール → ズーム。カーソルが中心
       Space + ドラッグ      → 掴んで動かす
       中ボタンドラッグ      → 掴んで動かす

     ブラウザ側の事情:
       macOS のピンチは「ctrlKey=true の wheel」として飛んでくる。
       Cmd+スクロールと見分けがつかないので、どちらもズームにする（Figmaも同じ）。
       トラックパッドの2本指スクロールは deltaX が出る・deltaY が細かい整数以外、
       マウスホイールは deltaY が大きめの飛び飛びの値、で見分ける。 */
  const zoomAt=(factor, px, py)=>{
    /* カーソルの下にある点を動かさずに拡大する。
       これをやらないと、拡大するたびに見たい場所が画面外へ逃げる。 */
    const before=screenToGround(px,py);
    setZoom(target.zoom*factor);
    cam.zoom=target.zoom;                    // 直後の逆算のために反映
    const after=screenToGround(px,py);
    if(before&&after){
      target.tx+=before[0]-after[0];
      target.tz+=before[1]-after[1];
      cam.tx=target.tx; cam.tz=target.tz;
    }
    dirty=true;
  };

  const onWheel=e=>{
    e.preventDefault(); e.stopPropagation();
    const r=cv.getBoundingClientRect();
    const px=e.clientX-r.left, py=e.clientY-r.top;

    if(e.ctrlKey||e.metaKey){
      /* ピンチ、または Cmd/Ctrl+スクロール → ズーム。
         1回のイベントでの変化に上限をかける。
         トラックパッドのピンチは1回の指の動きで何十回もイベントが飛ぶので、
         1回あたりを大きくすると、少し広げただけで一気に寄って迷子になる。 */
      const d=Math.max(-40,Math.min(40,e.deltaY));
      const f=Math.min(1.08, Math.max(0.93, Math.exp(-d*0.0055)));
      zoomAt(f, px, py);
      return;
    }
    /* それ以外は動かす。Figma の2本指スクロールと同じ。
       Shift を押しているときは横に動かす（Figma と同じ）。 */
    let dx=e.deltaX, dy=e.deltaY;
    if(e.shiftKey && !dx){ dx=dy; dy=0; }
    const k=e.deltaMode===1?16:(e.deltaMode===2?100:1);   // 行・ページ単位のとき
    /* 1回の入力で飛びすぎないよう頭を押さえる */
    const cap=v=>Math.max(-90,Math.min(90,v*k));
    panBy(-cap(dx), -cap(dy));
  };
  cv.addEventListener('wheel',onWheel,{passive:false});
  stage.addEventListener('wheel',onWheel,{passive:false});

  /* Space を押している間は掴んで動かす（Figma と同じ） */
  let spaceHeld=false;
  const onKey=(e,down)=>{
    if(e.code!=='Space') return;
    if(down && /^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement||{}).tagName||'')) return;
    if(!document.getElementById('p-map').classList.contains('on')) return;
    e.preventDefault();
    spaceHeld=down;
    cv.style.cursor=down?'grab':(rotMode?'alias':'grab');
  };
  addEventListener('keydown',e=>onKey(e,true));
  addEventListener('keyup',  e=>onKey(e,false));
  window.__mapSpace=()=>spaceHeld;

  document.querySelectorAll('#mhud button[data-v]').forEach(btn=>{
    btn.onclick=()=>{
      const v=VIEWS[btn.dataset.v];
      target.yaw=v.yaw; target.pitch=v.pitch; select(null); fitView();
      document.querySelectorAll('#mhud button[data-v]').forEach(x=>x.classList.toggle('on',x===btn));
    };
  });
  document.getElementById('mzin').onclick=()=>setZoom(target.zoom*1.5);
  document.getElementById('mzout').onclick=()=>setZoom(target.zoom/1.5);
  document.getElementById('mrot').onclick=e=>{
    rotMode=!rotMode; e.target.classList.toggle('on',rotMode);
    cv.style.cursor=rotMode?'alias':'grab';
  };
  document.getElementById('mreset').onclick=()=>{
    target={yaw:-0.62,pitch:0.92,dist:330,tx:0,tz:0,zoom:3}; select(null); fitView();
    document.querySelectorAll('#mhud button[data-v]').forEach(x=>
      x.classList.toggle('on',x.dataset.v==='iso'));
  };
  document.querySelector('#mhud button[data-v="iso"]').classList.add('on');
  requestAnimationFrame(()=>{ resize(); fitView(); cam.zoom=target.zoom; draw(); });
  tick();
}
window.initMap=initMap;
/* 描画1回にかかる時間を測る。重さの話を体感でなく数字でするため。 */
window.__mapBench=(n=30)=>{
  const t=[];
  for(let i=0;i<n;i++){ const a=performance.now(); draw(); t.push(performance.now()-a); }
  t.sort((x,y)=>x-y);
  return {回数:n, 中央値:Math.round(t[n>>1]*100)/100+'ms',
          最悪:Math.round(t[n-1]*100)/100+'ms',
          canvas:cv.width+'×'+cv.height, ラベル:labels.children.length};
};
/* 他のタブ（展示・譲り合い・講評）から「地図で見る」で呼ばれる。
   上野以外の建物は今のところ指せないので、上野に戻してから選ぶ。 */
window.__gotoBuilding=n=>{
  if(typeof go==='function') go('map');
  setTimeout(()=>{
    if(campus!=='ueno'){ loadCampus('ueno'); renderCampusBar(); renderList(); }
    select(Number(n));
    const el=document.getElementById('mpanel'); if(el) el.scrollTop=0;
  }, 60);
};
window.switchCampus=k=>{ loadCampus(k); renderCampusBar(); renderList(); renderPanel(); fitView(); dirty=true; };
window.currentCampus=()=>campus;
window.campusMeta=()=>DS.meta;
window.mapStats=()=>({校地:campus, 棟:DS.B.length, 無名:DS.OTHERS.length,
  頂点:DS.B.reduce((s,b)=>s+(b.ring?b.ring.length:0),0),
  中あり:Object.keys(ROOMS).length});
})();
