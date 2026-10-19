/* ============================================================
   就活
     上：口コミ（OpenWork の型を藝大生向けに組み直したもの）
         会社ごとに 総合評価・8軸＋藝大の2軸・残業/有給/年収・区分ごとの文章・
         選考体験・質問と回答。読む門は口コミが30件に届いてから（サーバ側）。
     下：進路データ（大学公表の5年ぶん。数字はいじらない）

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

/* ════════════════════════════════════════════════════════════
   口コミ
   ════════════════════════════════════════════════════════════ */
const IND={ad:'広告',ds:'デザイン事務所',inh:'事業会社',game:'ゲーム',anim:'映像・アニメ',pub:'出版・メディア',
  arch:'建築・空間',craft:'工芸・ものづくり',it:'IT・Web',edu:'教育',music:'音楽・舞台',gov:'官公庁・団体',other:'その他'};
const AXES=[['pay','待遇'],['morale','士気'],['open','風通し'],['respect','相互尊重'],['growth','20代成長'],
  ['nurture','長期育成'],['law','法令順守'],['eval','評価の納得'],['craft','制作の裁量'],['artist','作家活動と両立']];
const SNAX=[['diff','難しさ'],['mood','面接の和やかさ'],['pfw','PF重視'],['care','学生への丁寧さ']];
const TEXTC=[['org','組織体制・企業文化'],['gap','入社理由と入社後ギャップ'],['worth','働きがい・成長'],['women','女性の働きやすさ'],
  ['wlb','ワーク・ライフ・バランス'],['quit','退職検討理由'],['swot','企業分析（強み・弱み・展望）'],['ceo','経営者への提言'],['pay','年収・給与']];
const TC=Object.fromEntries(TEXTC);
const HOW=['インターン','アルバイト','業務委託','正社員','契約・非常勤','その他'];
const JOB=['デザイナー','アートディレクター','プランナー','制作進行','エンジニア','総合職','教育','その他'];
const DUR=['〜1か月','〜半年','〜1年','1〜3年','3年〜'];
const YEARS=['25卒','26卒','27卒','28卒','29卒','30卒'];
const STAGE=['インターン','早期選考','本選考','中途・非常勤'];
const RESULT=['内定','最終で落ちた','途中で落ちた','辞退した','選考中'];
const PFK=['PDF','Web','紙','なし'];
const KINDS=[['sn','選考体験'],['rv','働いてみて'],['q','質問']];

/* サーバと同じ正規化。ここが違うと同じ会社が2つに割れる */
function skKey(name){
  return String(name||'').normalize('NFKC').toLowerCase()
    .replace(/株式会社|有限会社|合同会社|合資会社|\(株\)|\(有\)|inc\.?|co\.,? ?ltd\.?|corporation|corp\.?|ltd\.?|llc|k\.k\./g,'')
    .replace(/[\s・･\-–—_,.、。()「」『』'"]/g,'').slice(0,60);
}

let mode='rv';                          // 'rv' 口コミ ／ 'sh' 進路データ
let view='list', prev='list', coKey='', coName='', q='', ind='', sort='n', tab='', reply='';
let formKind='sn', formCo='', formInd='';
let COS=null, COS_AT=0, GATE={on:false}, POSTS=[], PGATE=null, loading=false;
const DIR=window.SK_COMPANIES||[];

/* 大学公表の就職先一覧（5年ぶん・学部/研究科別）を会社ごとに束ねる。
   一覧に載っている分だけなので「全員」ではない。 */
let EMPI=null;
function empIndex(){
  if(EMPI) return EMPI;
  const m=new Map(); const E=(window.SHINRO&&window.SHINRO.emp)||[];
  for(const e of E) for(const [name,cnt,note] of e.l){
    const k=skKey(name); if(!k) continue;
    let o=m.get(k); if(!o){o={k,name:name.replace(/^株式会社|株式会社$/g,'').trim()||name,raw:name,years:{},total:0}; m.set(k,o);}
    (o.years[e.y]=o.years[e.y]||{})[e.c]=((o.years[e.y]||{})[e.c]||0)+cnt; o.total+=cnt;
  }
  return EMPI=m;
}
const empOf=k=>empIndex().get(k)||null;
const EMPY=()=>[...new Set(((window.SHINRO&&window.SHINRO.emp)||[]).map(e=>e.y))].sort();
const CS=c=>c.replace('大学院','').replace('研究科','').replace('(修士課程)',' 修士').replace('(博士後期課程)',' 博士').replace('(博士課程)',' 博士');
let empQ='', empLimit=60;

const logged=()=>!!(window.isLoggedIn&&window.isLoggedIn());
const gl=g=>{g=String(g||'');return /^\d$/.test(g)?'B'+g:g;};
const who=p=>[p.dept||'学科は非公開',gl(p.grade)].filter(Boolean).join('・');
const ym=t=>{const d=new Date(t||0);return d.getFullYear()+'.'+String(d.getMonth()+1).padStart(2,'0');};
const bar=v=>`<div class="skbar"><i style="width:${Math.max(0,Math.min(5,+v||0))/5*100}%"></i></div>`;
const axRows=(o,def)=>def.filter(([k])=>o&&+o[k]).map(([k,l])=>`<span>${l}</span>${bar(o[k])}<em>${(+o[k]).toFixed(1)}</em>`).join('');
const has=v=>v!==''&&v!=null;
function toast(m){
  let t=document.querySelector('.sktoast');
  if(!t){t=document.createElement('div');t.className='sktoast';document.body.appendChild(t);}
  t.textContent=m; t.classList.add('on'); clearTimeout(t._h); t._h=setTimeout(()=>t.classList.remove('on'),2200);
}

/* 名簿とサーバの集計を、同じ会社は1つにして返す */
function merged(){
  const m=new Map();
  for(const c of DIR){const k=skKey(c.n); m.set(k,{k,name:c.n,ind:c.i,req:c.req||null,n:{rv:0,sn:0,q:0},star:0,ax:{},sax:{},at:0});}
  for(const c of (COS||[])){const o=m.get(c.k)||{}; m.set(c.k,Object.assign({},o,c,{ind:c.ind||o.ind||'',req:o.req||null}));}
  return [...m.values()];
}
function listItems(){
  let a=merged();
  const qq=q.trim().toLowerCase();
  if(qq) a=a.filter(c=>c.name.toLowerCase().includes(qq)||(IND[c.ind]||'').includes(qq));
  if(ind) a=a.filter(c=>c.ind===ind);
  const tot=c=>c.n.rv+c.n.sn+c.n.q;
  if(sort==='n') a.sort((x,y)=>tot(y)-tot(x)||(y.at||0)-(x.at||0)||x.name.localeCompare(y.name,'ja'));
  else if(sort==='star') a.sort((x,y)=>(y.star||0)-(x.star||0)||tot(y)-tot(x));
  else if(sort==='new') a.sort((x,y)=>(y.at||0)-(x.at||0)||tot(y)-tot(x));
  else a.sort((x,y)=>x.name.localeCompare(y.name,'ja'));
  return a;
}
const coCard=c=>{const g=empOf(c.k); return `<button class="skco" data-co="${esc(c.k)}" data-name="${esc(c.name)}"><div>
   <b>${esc(c.name)}</b><small>${esc(IND[c.ind]||'')}${c.n.rv+c.n.sn+c.n.q?`${c.ind?' ・ ':''}選考 ${c.n.sn} ／ 働いてみて ${c.n.rv} ／ 質問 ${c.n.q}`:`${c.ind?' ・ ':''}まだ口コミなし`}${g?`<em class="skg">藝大から ${g.total}人</em>`:''}</small></div>
   <div class="skstar">${c.star?`<b>${c.star.toFixed(1)}</b><small>総合</small>`:`<b class="none">—</b>`}</div></button>`;};

function vList(){
  const a=listItems();
  const qq=q.trim();
  const exact=qq&&merged().some(c=>c.name.toLowerCase()===qq.toLowerCase());
  return `<div class="sktop"><h3>会社の口コミ</h3><button class="skmore" data-act="rank">ランキング</button></div>
   <div class="skbar2"><input class="skq" id="skq" type="search" placeholder="会社名で探す" value="${esc(q)}" autocomplete="off">
     <select class="sksel" id="skind"><option value="">業界：すべて</option>${Object.entries(IND).map(([k,v])=>`<option value="${k}" ${ind===k?'selected':''}>${v}</option>`).join('')}</select></div>
   <div class="skchips" style="margin:0 0 12px">${[['n','口コミが多い'],['star','評価が高い'],['new','新しい'],['name','名前順']].map(([k,l])=>`<button data-sort="${k}" class="${sort===k?'on':''}">${l}</button>`).join('')}</div>
   ${GATE.on?`<div class="skgate">口コミが${GATE.total}件になったので、全文は1件書いた人だけ読めます。</div>`:''}
   <div id="sklist">${a.length?a.map(coCard).join(''):`<div class="skempty">見つかりません。</div>`}
   ${qq&&!exact?`<button class="skco" data-act="newco"><div><b>「${esc(qq)}」について書く</b><small>名簿に無い会社は、書くと一覧に載ります</small></div></button>`:''}</div>`;
}

function vCo(){
  const c=merged().find(x=>x.k===coKey)||{k:coKey,name:coName,ind:'',n:{rv:0,sn:0,q:0},ax:{},sax:{},star:0};
  const by=k=>POSTS.filter(p=>p.kind===k);
  const cnt={sn:by('sn').length,rv:by('rv').length,q:by('q').length};
  const t=tab||(cnt.sn?'sn':cnt.rv?'rv':cnt.q?'q':'sn');
  const list=loading?'<div class="skempty">読み込み中</div>'
    :t==='q'?vQ(by('q'),by('a'))
    :(by(t).length?by(t).map(t==='sn'?itSn:itRv).join(''):`<div class="skempty">まだありません。<br>最初の1件を書くと、ここに載ります。</div>`);
  return `<button class="skback" data-act="back">‹ 一覧</button>
   <div class="skhead"><h3>${esc(c.name)}</h3><div class="skind">${esc(IND[c.ind]||'業界は未設定')}</div>
     <div class="skbig">${c.star?`<b>${c.star.toFixed(1)}</b><small>総合評価 ／ 働いてみて ${c.n.rv}件</small>`:`<b class="none">まだ評価なし</b>`}</div>
     ${Object.keys(c.ax||{}).length?`<div class="skax">${axRows(c.ax,AXES)}</div>`:''}
     ${(c.ot!=null||c.pl!=null||c.sal)?`<div class="skmini">${c.ot!=null?`<div><b>${c.ot}h</b><small>残業／月</small></div>`:''}${c.pl!=null?`<div><b>${c.pl}%</b><small>有給消化</small></div>`:''}${c.sal?`<div><b>${c.sal}万</b><small>年収</small></div>`:''}</div>`:''}
     ${Object.keys(c.sax||{}).length?`<div class="skax" style="margin-top:12px">${axRows(c.sax,SNAX)}</div>`:''}
     <button class="skcta" data-act="write">この会社について書く</button>
   </div>
   ${empBlockOf(c.k)}${reqBlock(c.req)}
   ${PGATE&&PGATE.on&&!PGATE.unlocked?`<div class="skgate">全文は、1件書くと読めるようになります。</div>`:''}
   <div class="skchips" style="margin:0 0 10px">${KINDS.map(([k,l])=>`<button data-tab="${k}" class="${t===k?'on':''}">${l}${cnt[k]?' '+cnt[k]:''}</button>`).join('')}</div>
   ${list}`;
}
function empBlockOf(k){
  const g=empOf(k); if(!g) return '';
  const ys=Object.keys(g.years).sort();
  return `<div class="skhead"><h3 class="s">藝大からの就職</h3><div class="skind">大学公表の一覧に載っている分。5年で ${g.total}人</div>
    <table class="sktbl small"><tbody>${ys.map(y=>{const cs=g.years[y]; const n=Object.values(cs).reduce((a,b)=>a+b,0);
      return `<tr><th>${y}年度</th><td><b>${n}人</b></td><td class="dim">${Object.entries(cs).map(([c,v])=>esc(CS(c))+' '+v).join('・')}</td></tr>`;}).join('')}</tbody></table></div>`;
}
function reqBlock(r){
  if(!r||!r.url) return '';
  const row=(l,v)=>v?`<div class="skreq"><span>${l}</span><b>${esc(v)}</b></div>`:'';
  return `<div class="skhead"><h3 class="s">募集要項</h3><div class="skind">会社の公式ページから。数字は原文どおり</div>
    ${row('初任給',r.salary)}${row('職種',r.jobs)}${row('選考',r.flow)}${row('時期',r.deadline)}${row('メモ',r.note)}
    ${r.url?`<a class="skcta" style="text-align:center;line-height:38px;text-decoration:none" href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">${(r.salary||r.jobs||r.flow||r.deadline)?'公式の採用ページを開く':'公式サイトを開く'}</a>`:''}
    ${r.got?`<div class="sknote" style="margin-top:6px">${esc(r.got)} 取得。変わっていることがあるので、締切は公式で確かめてください。</div>`:''}</div>`;
}
const lockBox=p=>p.locked?`<button class="skcta" data-act="write">1件書くと全文が読めます</button>`:'';
const delBtn=p=>p.mine?`<button class="skmore" data-del="${p.id}">消す</button>`:'';
function itSn(p){
  const rc=p.result==='内定'?'ok':/落ちた/.test(p.result||'')?'ng':'';
  return `<div class="skit${p.locked?' sklock':''}">
    <div class="skwho"><span class="tag ${rc}">${esc(p.result||'')}</span>${p.year?`<span class="tag">${esc(p.year)}</span>`:''}${p.stage?`<span class="tag">${esc(p.stage)}</span>`:''}${p.job?`<span class="tag">${esc(p.job)}</span>`:''}<span>${esc(who(p))} ・ ${ym(p.at)}</span>${delBtn(p)}</div>
    ${p.flow?`<h4>選考の流れ</h4><p>${esc(p.flow)}</p>`:''}
    ${(p.pf||p.pfkind)?`<h4>ポートフォリオ</h4><p>${p.pf?p.pf+'ページ':''}${p.pfkind?(p.pf?'（':'')+esc(p.pfkind)+(p.pf?'）':''):''}</p>`:''}
    ${p.asked?`<h4>聞かれたこと</h4><p>${esc(p.asked)}</p>`:''}
    ${p.prep?`<h4>準備してよかったこと</h4><p>${esc(p.prep)}</p>`:''}
    ${p.advice?`<h4>これから受ける人へ</h4><p>${esc(p.advice)}</p>`:''}
    ${SNAX.some(([k])=>+p[k])?`<div class="skax">${axRows(p,SNAX)}</div>`:''}
    ${lockBox(p)}</div>`;
}
function itRv(p){
  return `<div class="skit${p.locked?' sklock':''}">
    <div class="skwho"><span class="tag st">★ ${p.star}</span>${p.how?`<span class="tag">${esc(p.how)}</span>`:''}${p.job?`<span class="tag">${esc(p.job)}</span>`:''}${p.dur?`<span class="tag">${esc(p.dur)}</span>`:''}<span>${esc(who(p))} ・ ${ym(p.at)}</span>${delBtn(p)}</div>
    ${(p.texts||[]).map(t=>`<h4>${esc(TC[t.c]||'')}</h4><p>${esc(t.t)}</p>`).join('')}
    ${(has(p.ot)||has(p.pl)||p.sal)?`<div class="skmini">${has(p.ot)?`<div><b>${p.ot}h</b><small>残業／月</small></div>`:''}${has(p.pl)?`<div><b>${p.pl}%</b><small>有給消化</small></div>`:''}${p.sal?`<div><b>${p.sal}万</b><small>年収</small></div>`:''}</div>`:''}
    ${AXES.some(([k])=>+p[k])?`<div class="skax">${axRows(p,AXES)}</div>`:''}
    ${lockBox(p)}</div>`;
}
function vQ(qs,as){
  return `<div class="skf" style="margin:0 0 10px"><label>この会社について聞きたいこと</label>
    <textarea id="skqt" placeholder="例：ポートフォリオは紙とPDFのどちらで出しましたか"></textarea>
    <button class="skcta" data-act="ask">質問する</button><div class="skerr" id="skqe"></div></div>`+
   (qs.length?qs.map(x=>`<div class="skit"><div class="skwho"><span class="tag">Q</span><span>${esc(who(x))} ・ ${ym(x.at)}</span>${delBtn(x)}</div><p>${esc(x.t||'')}</p>
     ${as.filter(a=>a.parent===x.id).map(a=>`<div class="skans"><div class="skwho"><span class="tag">A</span><span>${esc(who(a))} ・ ${ym(a.at)}</span>${delBtn(a)}</div><p>${esc(a.t||'')}</p></div>`).join('')}
     ${reply===x.id?`<div class="skans"><textarea id="skat" placeholder="知っている範囲で"></textarea><button class="skcta" data-ans="${x.id}">送る</button><div class="skerr" id="skae"></div></div>`
                   :`<button class="skmore" data-reply="${x.id}">答える</button>`}</div>`).join('')
    :`<div class="skempty">まだ質問はありません。</div>`);
}

const txBlock=i=>`<div class="sktxb"><select data-tc="${i}">${TEXTC.map(([k,l],j)=>`<option value="${k}" ${j===i?'selected':''}>${l}</option>`).join('')}</select><textarea data-tt="${i}" placeholder="実際にどうだったか。30字以上"></textarea></div>`;
function vForm(){
  const names=[...new Set(merged().map(c=>c.name))];
  const sc=(f,l,star)=>`<div class="sksc" data-f="${f}"><span>${l}</span><div class="skst${star?' star':''}">${[1,2,3,4,5].map(v=>`<button type="button" data-v="${v}">${star?'★':v}</button>`).join('')}</div></div>`;
  const opts=(a,sel)=>a.map(x=>`<option ${x===sel?'selected':''}>${x}</option>`).join('');
  return `<button class="skback" data-act="back">‹ 戻る</button>
  <div class="skf">
   <div class="skchips">${KINDS.map(([k,l])=>`<button type="button" data-fk="${k}" class="${formKind===k?'on':''}">${l}</button>`).join('')}</div>
   <label>会社名</label><input type="text" id="skfco" list="skdl" value="${esc(formCo)}" placeholder="例：博報堂" autocomplete="off">
   <datalist id="skdl">${names.map(n=>`<option value="${esc(n)}">`).join('')}</datalist>
   <label>業界</label><select id="skfind"><option value="">選ぶ</option>${Object.entries(IND).map(([k,v])=>`<option value="${k}" ${formInd===k?'selected':''}>${v}</option>`).join('')}</select>
   ${formKind==='sn'?`
     <div class="row"><div><label>卒年</label><select id="f_year">${opts(YEARS,'27卒')}</select></div><div><label>選考</label><select id="f_stage">${opts(STAGE)}</select></div></div>
     <div class="row"><div><label>職種</label><select id="f_job">${opts(JOB)}</select></div><div><label>結果</label><select id="f_result">${opts(RESULT)}</select></div></div>
     <label>選考の流れ</label><textarea id="f_flow" placeholder="ES → ポートフォリオ → 1次面接（学生3：面接官2）→ 最終"></textarea>
     <div class="row"><div><label>ポートフォリオ（ページ数）</label><input type="number" id="f_pf" inputmode="numeric" placeholder="20"></div><div><label>形式</label><select id="f_pfkind">${opts(PFK)}</select></div></div>
     <label>聞かれたこと</label><textarea id="f_asked" placeholder="「この作品で一番苦労したところは」「藝大で何を学んだか」"></textarea>
     <label>準備してよかったこと</label><textarea id="f_prep"></textarea>
     <label>これから受ける人へ</label><textarea id="f_advice"></textarea>
     <label>点数（任意）</label>${SNAX.map(([k,l])=>sc(k,l)).join('')}`
   :formKind==='rv'?`
     <div class="row"><div><label>関わり方</label><select id="f_how">${opts(HOW)}</select></div><div><label>職種</label><select id="f_job">${opts(JOB)}</select></div></div>
     <label>期間</label><select id="f_dur">${opts(DUR)}</select>
     <label>総合評価</label>${sc('star','総合',true)}
     <label>8つの軸（OpenWorkと同じ）＋藝大の2軸。任意</label>${AXES.map(([k,l])=>sc(k,l)).join('')}
     <div class="row"><div><label>残業／月（時間）</label><input type="number" id="f_ot" inputmode="numeric" placeholder="20"></div><div><label>有給消化（%）</label><input type="number" id="f_pl" inputmode="numeric" placeholder="50"></div><div><label>年収（万円）</label><input type="number" id="f_sal" inputmode="numeric" placeholder="350"></div></div>
     <label>口コミ（区分を選んで、30字以上）</label><div id="sktx">${txBlock(0)}</div><button type="button" class="skmore" data-act="addtx">＋ 別の区分も書く</button>`
   :`<label>質問</label><textarea id="f_q" placeholder="例：面接はオンラインでしたか"></textarea>`}
   <button class="sksub" data-act="submit">${formKind==='q'?'質問する':'投稿する'}</button>
   <div class="skerr" id="skfe"></div>
   <p class="sknote">名前は出ません。学科と学年だけが付きます。個人が特定できる書き方と、事実でないことは書かないでください。</p>
  </div>`;
}
function vRank(){
  const a=merged();
  const top=(arr,fmt)=>arr.length?arr.map((c,i)=>`<button class="skrk" data-co="${esc(c.k)}" data-name="${esc(c.name)}"><i>${i+1}</i><b>${esc(c.name)}</b><em>${fmt(c)}</em></button>`).join(''):'<div class="skempty">まだ足りません。</div>';
  const rv=a.filter(c=>c.n.rv>=1&&c.star).sort((x,y)=>y.star-x.star||y.n.rv-x.n.rv).slice(0,20);
  const care=a.filter(c=>c.sax&&c.sax.care).sort((x,y)=>y.sax.care-x.sax.care).slice(0,20);
  const sn=a.filter(c=>c.n.sn).sort((x,y)=>y.n.sn-x.n.sn).slice(0,20);
  return `<button class="skback" data-act="back">‹ 一覧</button>
    <div class="skhead"><h3>総合評価</h3><div class="skind">「働いてみて」の平均</div>${top(rv,c=>c.star.toFixed(1))}</div>
    <div class="skhead"><h3>学生への丁寧さ</h3><div class="skind">選考体験の点数</div>${top(care,c=>c.sax.care.toFixed(1))}</div>
    <div class="skhead"><h3>選考体験が多い</h3>${top(sn,c=>c.n.sn+'件')}</div>`;
}

/* ── 就職先の表（大学公表・5年） ── */
function empRows(){
  let a=[...empIndex().values()];
  const qq=empQ.trim().toLowerCase();
  if(qq) a=a.filter(o=>o.raw.toLowerCase().includes(qq)||o.name.toLowerCase().includes(qq));
  return a.sort((x,y)=>y.total-x.total||x.name.localeCompare(y.name,'ja'));
}
function empTable(){
  const ys=EMPY(); const a=empRows(); const show=a.slice(0,empLimit);
  const cnt=(o,y)=>{const c=o.years[y]; return c?Object.values(c).reduce((s,v)=>s+v,0):0;};
  return `<table class="sktbl"><thead><tr><th>会社</th>${ys.map(y=>`<th>${String(y).slice(2)}</th>`).join('')}<th>計</th></tr></thead>
    <tbody id="sktb">${show.map(o=>`<tr data-co="${esc(o.k)}" data-name="${esc(o.name)}"><th>${esc(o.name)}</th>${ys.map(y=>{const n=cnt(o,y);return `<td class="${n?'':'z'}">${n||'·'}</td>`;}).join('')}<td class="t">${o.total}</td></tr>`).join('')}</tbody></table>
    ${a.length>empLimit?`<button class="skcta" data-act="empmore">もっと見る（残り ${a.length-empLimit}）</button>`:''}
    ${a.length?'':'<div class="skempty">見つかりません。</div>'}`;
}
function vEmp(){
  const total=[...empIndex().values()].reduce((s,o)=>s+o.total,0);
  return `<div class="sktop"><h3>藝大生の就職先</h3><span class="sknote" style="margin:0">${empIndex().size}社 ・ ${total}人</span></div>
    <input class="skq" id="skeq" type="search" placeholder="会社名で探す" value="${esc(empQ)}" autocomplete="off" style="width:100%;margin:0 0 10px">
    <div class="skhead" style="padding:8px 6px 4px"><div id="skemp">${empTable()}</div></div>
    <p class="sknote">出どころ：大学公表『卒業・修了者の進路状況』の就職先一覧（学部・修士）。載っていない人もいます。行を押すと、その会社の口コミへ。</p>`;
}

/* ── 進路データ（大学公表。数字はいじらない） ── */
function vShinro(){
  const D=window.SHINRO; if(!D) return '<div class="skempty">データを読み込めませんでした。</div>';
  const cur=course?(D.courses.find(c=>c.k===course)||{r:D.total}).r:D.total;
  return `<p class="sknote" style="margin:0 0 12px">大学が出している『卒業・修了者の進路状況』の数字です。</p>
    ${hero(D.total[0])}
    <div class="rysec"><h3>5年ぶんの推移</h3>
      <p class="bnote">就職より非常勤・自営が多い年が、5年のうち4年あります。藝大では会社に入らない道が例外ではなく、いちばん太い道です。</p>
      ${legend()}
      <div class="skpick"><div class="seg wrap" id="skcs"><button data-k="" class="${course?'':'on'}">全学</button>
        ${D.courses.map(c=>`<button data-k="${esc(c.k)}" class="${course===c.k?'on':''}">${esc(c.s)}</button>`).join('')}</div></div>
      ${years(cur)}</div>
    <div class="rysec"><h3>就職先</h3>${empBlock(D)}</div>
    <a class="skcta" style="text-align:center;line-height:38px;text-decoration:none" href="${esc(D.meta.page)}" target="_blank" rel="noopener noreferrer">大学のキャリア支援を見る</a>
    <div class="bnote">出どころ：<a href="${esc(D.meta.url)}" target="_blank" rel="noopener noreferrer">${esc(D.meta.src)}</a>（東京藝術大学）。${esc(D.meta.got)} 取得。</div>`;
}

/* ── 描画 ── */
function shell(){
  const el=document.getElementById('p-sk'); if(!el) return null;
  let root=el.querySelector('#skroot');
  if(!root){
    el.insertAdjacentHTML('beforeend',`<div class="bhead"><div><h2>就活</h2></div><button class="btn o" data-act="write">書く</button></div>
      <div class="skseg"><button data-mode="rv" class="on">口コミ</button><button data-mode="emp">就職先</button><button data-mode="sh">進路データ</button></div><div id="skroot"></div>`);
    root=el.querySelector('#skroot'); bind(el);
  }
  el.querySelectorAll('.skseg button').forEach(b=>b.classList.toggle('on',b.dataset.mode===mode));
  return root;
}
function paint(){
  const root=shell(); if(!root) return;
  root.innerHTML= mode==='sh'?vShinro() : mode==='emp'?vEmp() : view==='co'?vCo() : view==='form'?vForm() : view==='rank'?vRank() : vList();
}
function paintList(){
  const w=document.getElementById('sklist'); if(!w){paint();return;}
  const tmp=document.createElement('div'); tmp.innerHTML=vList();
  w.innerHTML=tmp.querySelector('#sklist').innerHTML;
}
async function load(force){
  if(!force&&COS&&Date.now()-COS_AT<30000) return;
  if(!window.GAPI){COS=COS||[];return;}
  try{ const r=await GAPI.skCompanies(); COS=r.companies||[]; GATE=r.gate||{on:false}; COS_AT=Date.now(); }
  catch(e){ COS=COS||[]; }
  if(mode==='rv'&&(view==='list'||view==='rank'||view==='co')) paint();
}
async function loadCo(){
  loading=true; POSTS=[]; paint();
  try{ const r=await GAPI.skPosts(coKey); POSTS=r.posts||[]; PGATE=r.gate||null; }
  catch(e){ POSTS=[]; }
  loading=false; paint();
}
function openCo(k,name){ coKey=k; coName=name||coKey; tab=''; reply=''; prev='list'; view='co'; loadCo(); }
function needLogin(){ if(logged()) return false; toast('ログインすると書けます'); if(window.go) go('acc'); return true; }

async function submit(){
  const E=document.getElementById('skfe'); if(E) E.textContent='';
  if(needLogin()) return;
  const g=id=>{const x=document.getElementById(id);return x?x.value.trim():'';};
  const sc=f=>{const b=document.querySelector(`.sksc[data-f="${f}"] button.on`);return b?+b.dataset.v:0;};
  const body={kind:formKind,name:g('skfco'),ind:g('skfind')};
  if(!body.name){E.textContent='会社名を入れてください。';return;}
  if(formKind==='sn'){
    Object.assign(body,{year:g('f_year'),stage:g('f_stage'),job:g('f_job'),result:g('f_result'),flow:g('f_flow'),
      pf:g('f_pf'),pfkind:g('f_pfkind'),asked:g('f_asked'),prep:g('f_prep'),advice:g('f_advice')});
    SNAX.forEach(([k])=>body[k]=sc(k));
  }else if(formKind==='rv'){
    Object.assign(body,{how:g('f_how'),job:g('f_job'),dur:g('f_dur'),star:sc('star'),ot:g('f_ot'),pl:g('f_pl'),sal:g('f_sal')});
    AXES.forEach(([k])=>body[k]=sc(k));
    body.texts=[...document.querySelectorAll('#sktx .sktxb')].map(b=>({c:b.querySelector('select').value,t:b.querySelector('textarea').value.trim()})).filter(t=>t.t);
  }else body.t=g('f_q');
  const btn=document.querySelector('.sksub'); if(btn) btn.disabled=true;
  try{
    await GAPI.putSk(body); toast('投稿しました');
    coKey=skKey(body.name); coName=body.name; tab=formKind; reply=''; view='co';
    await load(true); await loadCo();
  }catch(e){ if(E) E.textContent=e.message||'送れませんでした。'; if(btn) btn.disabled=false; }
}
async function ask(){
  const E=document.getElementById('skqe'); if(E) E.textContent='';
  if(needLogin()) return;
  const t=(document.getElementById('skqt')||{}).value||'';
  try{ await GAPI.putSk({kind:'q',name:coName,t:t.trim()}); toast('質問しました'); tab='q'; await load(true); await loadCo(); }
  catch(e){ if(E) E.textContent=e.message||'送れませんでした。'; }
}
async function answer(parent){
  const E=document.getElementById('skae'); if(E) E.textContent='';
  if(needLogin()) return;
  const t=(document.getElementById('skat')||{}).value||'';
  try{ await GAPI.putSk({kind:'a',parent,t:t.trim()}); toast('答えました'); reply=''; tab='q'; await loadCo(); }
  catch(e){ if(E) E.textContent=e.message||'送れませんでした。'; }
}

function bind(el){
  el.addEventListener('click',async e=>{
    const t=e.target.closest('button,a,tr[data-co]'); if(!t||!el.contains(t)) return;
    const d=t.dataset;
    if(d.mode){ mode=d.mode; paint(); if(mode==='rv') load(); return; }
    if(d.co!=null){ mode='rv'; openCo(d.co,d.name); return; }
    if(d.sort){ sort=d.sort; paint(); return; }
    if(d.tab){ tab=d.tab; reply=''; paint(); return; }
    if(d.fk){ formKind=d.fk; paint(); return; }
    if(d.v!=null&&t.closest('.skst')){
      const w=t.closest('.skst'), v=+d.v, star=w.classList.contains('star');
      [...w.children].forEach(b=>{b.classList.toggle('on',b===t); b.classList.toggle('lit',star&&+b.dataset.v<v);});
      return;
    }
    if(d.reply){ reply=d.reply; paint(); return; }
    if(d.ans){ answer(d.ans); return; }
    if(d.del){ if(!confirm('この投稿を消しますか？')) return; try{ await GAPI.delSk(d.del); toast('消しました'); await load(true); await loadCo(); }catch(err){ toast(err.message||'消せませんでした'); } return; }
    /* 進路データの切り替え */
    if(t.closest('#skcs')){ course=t.getAttribute('data-k')||''; paint(); return; }
    if(t.closest('#skey')){ empY=+t.getAttribute('data-y'); paint(); return; }
    if(t.closest('#skec')){ empC=t.getAttribute('data-c')||''; paint(); return; }
    switch(d.act){
      case 'back':   view = (view==='form'&&prev==='co')?'co':'list'; reply=''; paint(); break;
      case 'rank':   view='rank'; paint(); break;
      case 'write':  if(needLogin()) return; prev=view==='co'?'co':'list'; formCo=view==='co'?coName:''; formInd=view==='co'?((merged().find(c=>c.k===coKey)||{}).ind||''):''; mode='rv'; view='form'; paint(); break;
      case 'newco':  if(needLogin()) return; prev='list'; formCo=q.trim(); formInd=''; formKind='sn'; view='form'; paint(); break;
      case 'addtx':  { const w=document.getElementById('sktx'); if(w&&w.children.length<TEXTC.length) w.insertAdjacentHTML('beforeend',txBlock(w.children.length)); break; }
      case 'submit': submit(); break;
      case 'empmore': empLimit+=100; { const w=document.getElementById('skemp'); if(w) w.innerHTML=empTable(); } break;
      case 'ask':    ask(); break;
    }
  });
  el.addEventListener('input',e=>{ if(e.target.id==='skq'){ q=e.target.value; paintList(); } if(e.target.id==='skeq'){ empQ=e.target.value; empLimit=60; const w=document.getElementById('skemp'); if(w) w.innerHTML=empTable(); } });
  el.addEventListener('change',e=>{
    if(e.target.id==='skind'){ ind=e.target.value; paint(); }
    if(e.target.id==='skfco'){ formCo=e.target.value; }
    if(e.target.id==='skfind'){ formInd=e.target.value; }
  });
}

function render(){ paint(); if(mode==='rv') load(); }
window.renderShukatsu=render;
})();
