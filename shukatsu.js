/* ============================================================
   就活

   藝大公式の『卒業・修了者の進路状況』5年ぶんを、そのまま図にした。
   数字はいじっていない。足したり割り直したりもしていない。

   なぜ帯グラフなのか
     藝大の進路は「就職したか / しなかったか」では割れない。
     いちばん多いのは非常勤・自営で、就職より多い年が5年のうち4年ある。
     円グラフだと1年ぶんしか置けず、この形が続いていることが見えない。
     同じ幅の帯を5本ならべると、5年ずっと同じ比率だと一目で分かる。

   色は5つの区分に6色のうち5つを割り当てている
     就職＝青　非常勤自営＝オレンジ　進学＝薄い青　留学＝薄いオレンジ
     未定・他＝白（青の細枠）
   ============================================================ */
(function(){
"use strict";
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));

const KEY=[
  {k:'job',  t:'就職'},
  {k:'free', t:'非常勤・自営'},
  {k:'grad', t:'進学'},
  {k:'abr',  t:'留学'},
  {k:'undec',t:'未定・他'},
];

let course='';   // 空 = 全学
let empY=0, empC='';

/* 1本の帯。幅はパーセント。1%未満は潰れて見えないので、
   0でなければ最低1.6%の幅を与えて、数字はそのまま出す。 */
function band(p, v, n){
  const w=p.map(x=>x<=0?0:Math.max(x,1.6));
  const s=w.reduce((a,b)=>a+b,0);
  return `<div class="skband">${p.map((x,i)=>x<=0?'':
    `<span class="skseg ${KEY[i].k}" style="width:${(w[i]/s*100).toFixed(3)}%"
       title="${esc(KEY[i].t)} ${v[i]}人（${x}%）">
       <b>${x>=8?x+'%':''}</b></span>`).join('')}</div>`;
}

function years(rows){
  return `<div class="skyears">${rows.map(r=>`
    <div class="skyear">
      <div class="skyh"><span class="skyy">${r.y}<i>年度</i></span>
        <span class="skyn">${r.n}人</span></div>
      ${band(r.p,r.v,r.n)}
    </div>`).join('')}</div>`;
}

/* いちばん上の1枚。ここだけは数字を大きく面で出す。 */
function hero(r){
  const cards=[
    {k:'job',  t:'就職',        n:r.v[0], p:r.p[0], s:`企業など ${r.kig}人／教職 ${r.kyo}人`},
    {k:'free', t:'非常勤・自営', n:r.v[1], p:r.p[1], s:'作家・演奏・フリーランスはここに入る'},
    {k:'grad', t:'進学',        n:r.v[2], p:r.p[2], s:`藝大院 ${r.hon}人／他大学 ${r.ta}人`},
  ];
  return `<div class="skhero">
    <div class="skhl">
      <span class="skhy">${r.y}年度に卒業・修了した</span>
      <b>${r.n}</b><span class="skhu">人の進路</span>
    </div>
    <div class="skhcards">${cards.map(c=>`
      <div class="skhc ${c.k}">
        <span class="skhcp">${c.p}<i>%</i></span>
        <span class="skhct">${esc(c.t)}</span>
        <span class="skhcn">${c.n}人</span>
        <span class="skhcs">${esc(c.s)}</span>
      </div>`).join('')}
    <div class="skhc rest">
      <span class="skhcp">${(r.p[3]+r.p[4]).toFixed(1)}<i>%</i></span>
      <span class="skhct">留学・未定ほか</span>
      <span class="skhcn">${r.v[3]+r.v[4]}人</span>
      <span class="skhcs">留学 ${r.v[3]}人／未定・他 ${r.v[4]}人</span>
    </div></div>
  </div>`;
}

function legend(){
  return `<div class="sklg">${KEY.map(k=>
    `<span class="sklgi"><i class="skseg ${k.k}"></i>${esc(k.t)}</span>`).join('')}</div>`;
}

/* 「すべて」を選んだときは、その年度の全課程を1つにまとめる。
   同じ会社が別々の課程から出ていたら足す。 */
function mergeYear(D, y){
  const box=new Map(); let hid=0;
  D.emp.filter(e=>e.y===y).forEach(e=>{
    hid += e.hid||0;
    e.l.forEach(([nm,c,lb])=>box.set(nm, (box.get(nm)||0)+c));
  });
  const l=[...box.entries()].map(([nm,c])=>[nm,c,''])
          .sort((a,b)=>b[1]-a[1] || a[0].localeCompare(b[0],'ja'));
  return l.length ? {y, c:'すべて', l, hid} : null;
}

function empBlock(D){
  const ys=[...new Set(D.emp.map(e=>e.y))].sort((a,b)=>b-a);
  if(!empY) empY=ys[0];
  const cs=['すべて', ...D.emp.filter(e=>e.y===empY).map(e=>e.c)];
  if(cs.indexOf(empC)<0) empC='すべて';
  const cur = empC==='すべて' ? mergeYear(D,empY)
                              : D.emp.find(e=>e.y===empY&&e.c===empC);
  const n=cur?cur.l.reduce((s,x)=>s+x[1],0):0;
  return `
    <div class="skpick">
      <div class="seg" id="skey">${ys.map(y=>
        `<button data-y="${y}" class="${y===empY?'on':''}">${y}年度</button>`).join('')}</div>
      <div class="seg wrap" id="skec">${cs.map(c=>
        `<button data-c="${esc(c)}" class="${c===empC?'on':''}">${esc(c)}</button>`).join('')}</div>
    </div>
    ${cur?`<p class="sklead">${n}人が就職しました。</p>
    <div class="skemp">${cur.l.map(([nm,c,lb])=>
      `<span class="skec ${c>1?'many':''}">${esc(nm)}${c>1?`<i>${c}</i>`:''}</span>`).join('')}</div>`
    :'<p class="sklead">この年度は社名が公開されていません。</p>'}`;
}

function render(){
  const el=document.getElementById('p-sk');
  if(!el||!window.SHINRO) return;
  const D=window.SHINRO;
  const cur=course?(D.courses.find(c=>c.k===course)||{r:D.total}).r:D.total;
  const top=D.total[0];

  el.innerHTML=`
    <div class="bhead">
      <div><h2>就活</h2>
        <p>藝大を出た人が、実際にどうしたか。大学が出している『卒業・修了者の進路状況』の数字です。</p></div>
      <a class="btn o" href="${esc(D.meta.page)}" target="_blank" rel="noopener noreferrer">大学のキャリア支援</a>
    </div>

    ${hero(top)}

    <div class="rysec">
      <h3>5年ぶんの推移</h3>
      <p class="bnote">就職より非常勤・自営が多い年が、5年のうち4年あります。
        藝大では会社に入らない道が例外ではなく、いちばん太い道です。</p>
      ${legend()}
      <div class="skpick">
        <div class="seg wrap" id="skcs">
          <button data-k="" class="${course?'':'on'}">全学</button>
          ${D.courses.map(c=>`<button data-k="${esc(c.k)}"
             class="${course===c.k?'on':''}">${esc(c.s)}</button>`).join('')}
        </div>
      </div>
      ${years(cur)}
    </div>

    <div class="rysec">
      <h3>就職先</h3>
      ${empBlock(D)}
    </div>

    <div class="bnote">
      出どころ：<a href="${esc(D.meta.url)}" target="_blank" rel="noopener noreferrer">${esc(D.meta.src)}</a>（東京藝術大学）。${esc(D.meta.got)} 取得。
    </div>`;

  const on=(id,attr,fn)=>{const b=document.getElementById(id); if(b) b.onclick=e=>{
    const t=e.target.closest('button[data-'+attr+']'); if(!t) return; fn(t.getAttribute('data-'+attr)); };};
  on('skcs','k',v=>{course=v; render();});
  on('skey','y',v=>{empY=+v; render();});
  on('skec','c',v=>{empC=v; render();});
}
window.renderShukatsu=render;
})();
