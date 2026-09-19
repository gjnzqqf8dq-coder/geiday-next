/* ============================================================
   掲示板エンジン（展示情報 / 譲り合い / 講評の日程 / 公募・奨学金）

   4つとも「一覧 ＋ 絞り込み ＋ 投稿フォーム」で構造が同じなので、
   欄の定義だけ差し替えて同じ仕組みで動かす。個別に4回書かない。

   守っていること
     - 譲り合いに金額の欄を作らない。無償のやりとりだけを扱う。
       売買の場にすると、運営側に別の責任が生じるため。
     - 公募は「事実（名称・主催・締切・URL）」だけを持つ欄構成にし、
       募集要項の本文を貼る場所を作らない。転載を避けるため。
     - 連絡先は自由記述にせず「学内で会える場所・時間」を書く欄にした。
       電話番号やメールをそのまま晒す作りにしない。
   ============================================================ */
(function(){
"use strict";
/* 数値や真偽値が来ても落ちないように、必ず文字列にしてから置換する */
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
const LSg=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d;}catch(e){return d;}};
const SSg=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true;}
                  catch(e){alert('保存できませんでした。');return false;}};
const TODAY=new Date().toISOString().slice(0,10);
const bldName=n=>{ const b=(typeof B!=='undefined')?B.find(x=>x.n===Number(n)):null;
                   return b?b.jp:''; };
const bldOpts=()=>{ const L=(typeof B!=='undefined')?B:[];
  return '<option value="">選ぶ</option>'+L.map(b=>`<option value="${b.n}">${esc(b.jp)}</option>`).join(''); };
const DEPTLIST=["デザイン","油画","日本画","彫刻","工芸","建築","先端芸術表現",
                "芸術学","文化財保存学","美術教育","グローバルアートプラクティス"];

/* ── 4つの板の定義 ───────────────────────── */
const BOARDS={
  /* 展示と講評は、どちらも「その日に行けば見られるもの」なので1つの板にまとめた。
     他の科の講評は行くといちばん勉強になる、という話と、展示を見に行く話は
     同じ気分で開くところだから。並びは日付順で、両方が混ざって出る。 */
  ex:{
    key:'geidai_exhib_v1',
    dummy:()=> ((typeof DUMMY_EXHIB!=='undefined'?DUMMY_EXHIB:[]).map(x=>({...x,_t:'展示'}))),
    title:'展示',
    lead:'学内・学外の展示。日付の近い順に並びます。',
    filters:[{k:'when',label:'いつ',opts:['これから','開催中','終わった']}],
    /* 終わったものが上に来ても仕方がない。
       これから・開催中を先に、その中で日付の近い順。 */
    sort:(a,b)=>{
      /* 並べ方は3段。
         ① 終わったものは下。それ以外は同じ扱いにする
            （以前は講評を展示より上に置いていたが、講評は写真が無いので
              一覧の頭が図形だけになって、何の場所か伝わらなかった）
         ② 写真があるものが先。開いた瞬間に中身が見えるように
         ③ 同じ条件なら日付の近い順 */
      const done=x=> x._t==='講評' ? ((x.date||'')<TODAY?1:0)
                                   : ((x.to  ||'')<TODAY?1:0);
      const pic =x=> x.img?0:1;
      const key =x=> x._t==='講評' ? (x.date||'') : (x.from||'');
      return done(a)-done(b) || pic(a)-pic(b) || key(a).localeCompare(key(b));
    },
    /* 出すときは、まず展示か講評かを選ぶ。聞くことが違う。 */
    fieldsExhib:[
      {k:'title',t:'展示の名前',type:'text',req:true,max:40},
      {k:'who',t:'誰の展示',type:'text',max:30,ph:'例）デザイン科 有志'},
      {k:'__span',t:'期間',type:'span',req:true},
      {k:'place',t:'会場',type:'text',max:40,ph:'例）陳列館 / 3331'},
      {k:'body',t:'ひとこと',type:'area',max:140},
      {k:'url',t:'リンク',type:'url',ph:'https://'},
    ],
    fieldsKouhyo:[
      {k:'title',t:'なにの講評か',type:'text',req:true,max:40},
      {k:'dept',t:'科',type:'sel',opts:DEPTLIST,req:true},
      {k:'date',t:'日にち',type:'date',req:true},
      {k:'period',t:'時間',type:'text',max:20,ph:'例）2〜5限'},
      {k:'bld',t:'場所',type:'bld'},
      {k:'open',t:'他の科の人も見られる',type:'check'},
      {k:'body',t:'ひとこと',type:'area',max:140},
    ],
    get fields(){ return this.fieldsExhib; },   // 旧い呼び出しへの保険
    row(x){
      if(x._t==='講評'){
        /* 「これから」が全部オレンジだと一面オレンジになる。
           2週間以内だけオレンジ（急ぎ）、先のものは青にして配分を作る。 */
        const left=Math.ceil((new Date(x.date)-new Date(TODAY))/86400000);
        const st=left<0?'終わった':(left<=14?(left===0?'今日':'あと'+left+'日'):'講評');
        return {tag:st, tagCls:left<0?'past':(left<=14?'soon':'live'),
          head:x.title, sub:[x.dept?x.dept+'科':'',x.bld?bldName(x.bld):''].filter(Boolean).join(' ／ '),
          meta:`${x.date}${x.period?' '+x.period:''}${x.open?' ／ 見学できます':' ／ 学内向け'}`,
          body:x.body};
      }
      const st=x.from>TODAY?'これから':(x.to>=TODAY?'開催中':'終わった');
      return {tag:st, tagCls:st==='開催中'?'live':(st==='これから'?'soon':'past'),
        head:x.title, sub:[x.who,x.bld?bldName(x.bld):x.place].filter(Boolean).join(' ／ '),
        meta:`${x.from} 〜 ${x.to}`, body:x.body, url:x.url};
    },
    match(x,f){
      if(!f.when) return true;
      const st=x.from>TODAY?'これから':(x.to>=TODAY?'開催中':'終わった');
      return f.when===st;
    },
  },
  gv:{
    key:'geidai_give_v1', dummy:()=> (typeof DUMMY_GIVE!=='undefined'?DUMMY_GIVE:[]),
    title:'譲り合い',
    lead:'画材や道具を、学内で無償でゆずり合う場所。',
    filters:[{k:'mode',label:'種類',opts:['ゆずる','ほしい']},
             {k:'cat',label:'分類',opts:['画材','道具','機材','本','その他']}],
    /* 写真つきを先に。品物は写真が無いと何なのか分からない。
       同じ条件なら新しい順。 */
    sort:(a,b)=> ((a.img?0:1)-(b.img?0:1)) || ((b.at||0)-(a.at||0)),
    fields:[
      {k:'mode',t:'どちら',type:'sel',opts:['ゆずる','ほしい'],req:true},
      {k:'title',t:'品物',type:'text',req:true,max:40},
      {k:'cat',t:'分類',type:'sel',opts:['画材','道具','機材','本','その他'],req:true},
      {k:'bld',t:'受け渡しの場所',type:'bld'},
      {k:'body',t:'状態・ひとこと',type:'area',max:140},
      {k:'meet',t:'いつ学内にいるか',type:'text',max:40,ph:'例）平日の昼、総合工房棟にいます'},
    ],
    row(x){
      return {tag:x.done?'終了':x.mode, tagCls:x.done?'past':(x.mode==='ゆずる'?'live':'soon'),
        head:x.title, sub:[x.cat,x.bld?bldName(x.bld):''].filter(Boolean).join(' ／ '),
        meta:[x.dept?x.dept+'科':'',x.meet].filter(Boolean).join(' ／ '), body:x.body};
    },
    match(x,f){ return (!f.mode||f.mode===x.mode)&&(!f.cat||f.cat===x.cat); },
    note:'無償のやりとりだけです。',
  },
  kb:{
    key:'geidai_kobo_v1',
    /* ここだけダミーではなく実データ。1件ずつ公式ページを開いて
       締切・応募資格・URLを確認したものを使う。 */
    dummy:()=> (typeof REAL_KOBO!=='undefined'?REAL_KOBO:[]),
    title:'公募・奨学金',
    lead:'いま応募できる公募と奨学金。締切の近い順。過ぎたものは出しません。',
    filters:[{k:'cat',label:'分野',opts:['グラフィック','イラスト・絵画','広告・コピー','写真','映像・メディア','プロダクト・家具','建築・空間','工芸・クラフト','音楽・舞台','奨学金・助成','その他']},
             {k:'kind',label:'種類',opts:['学内','学外','奨学金']}],
    sort:(a,b)=> (a.due||'').localeCompare(b.due||''),
    fields:[
      {k:'title',t:'名称',type:'text',req:true,max:50},
      {k:'kind',t:'種類',type:'sel',opts:['学内','学外','奨学金'],req:true},
      {k:'cat',t:'分野',type:'sel',opts:['グラフィック','イラスト・絵画','広告・コピー','写真','映像・メディア','プロダクト・家具','建築・空間','工芸・クラフト','音楽・舞台','奨学金・助成','その他']},
      {k:'org',t:'主催',type:'text',max:40},
      {k:'due',t:'締切',type:'date',req:true},
      {k:'target',t:'対象',type:'text',max:30,ph:'例）学部・大学院'},
      {k:'amount',t:'金額（円・わかれば）',type:'num'},
      {k:'url',t:'公式ページ',type:'url',ph:'https://',req:true},
      {k:'body',t:'ひとこと（要項の転載はしないでください）',type:'area',max:120},
    ],
    row(x){
      const left=Math.ceil((new Date(x.due)-new Date(TODAY))/86400000);
      const st=left>=0?(left<=14?'あと'+left+'日':'まだ間に合う'):'過ぎた';
      const amt = x.amountRaw ? x.amountRaw
                : (x.amount ? Number(x.amount).toLocaleString()+'円' : '');
      return {tag:st, tagCls:left<0?'past':(left<=14?'live':'soon'),
        head:x.title, sub:[x.cat,x.org].filter(Boolean).join(' ／ '),
        meta:`締切 ${x.dueRaw||x.due}${amt?' ／ '+amt:''}`,
        /* 一覧には応募資格を出さない。1件が高くなって、画面に2件しか入らなくなる。
           押して開けば「対象」として出る。 */
        body:x.body||'',
        url:x.url};
    },
    /* 締切が過ぎたものは探しようがないので、最初から出さない */
    match(x,f){ if((x.due||'')<TODAY) return false;
      return (!f.kind||f.kind===x.kind)&&(!f.cat||f.cat===(x.cat||'その他')); },
    /* 免責の常時表示はしない。要項の確認は各件の「公式ページ」リンクが担う。 */
  },
};

const state={};
Object.keys(BOARDS).forEach(k=>state[k]={f:{},open:false,kind:(BOARDS[k].kinds||[''])[0]});
const mineOf=id=>LSg(BOARDS[id].key,[]);
/* 公募だけは、あらかじめ入っているのがダミーではなく
   1件ずつ公式ページで確かめた実データ。サーバに投稿が付いても引っ込めない。 */
const REALDATA = new Set(['kb']);
const allOf=id=>{
  /* サーバに本物が入っている板では、ダミーを出さない。
     本物と作り物が混ざると、どれが本当か分からなくなる。 */
  const srv=(typeof SRVDATA!=='undefined')?SRVDATA.posts(id):[];
  /* その板にサーバの投稿が入っていれば、その板のダミーだけを引っ込める。
     他の板は関係ない。 */
  const hideSeed = !REALDATA.has(id) && srv.length > 0;
  const d = hideSeed ? [] : BOARDS[id].dummy();
  /* 手元にあってサーバにも上がっているものは重ねない */
  const up=new Set(srv.map(p=>p.at));
  const mine=mineOf(id).filter(x=>!up.has(x.at));
  /* 「自分の投稿か」は uid を自分のアカウントidと見比べて決める。
     サーバに付けさせると応答が人ごとに変わって、エッジに置けなくなる。 */
  const my=(typeof myUid==='function')?myUid():'';
  return d.concat(srv.map(p=>({...p, mine: !!(my && String(p.uid||'')===my)})))
          .concat(mine)
          .slice().sort(BOARDS[id].sort);
};

function render(id){
  const B0=BOARDS[id], st=state[id];
  const list=allOf(id).filter(x=>B0.match(x,st.f));
  const el=document.getElementById('p-'+id);
  el.innerHTML=`
    <div class="bhead">
      <div><h2>${B0.title}</h2><p>${B0.lead}</p></div>
      ${id==='kb'?'':`<button class="btn o" id="${id}-new">${st.open?'やめる':'書く'}</button>`}
    </div>
    ${st.open?formHTML(id):''}
    <!-- 絞り込みはセレクト1本ずつ。ボタンを並べると
         「種類3つ＋いつ4つ」で2行になり、スマホで一覧が下に押される。 -->
    <div class="bfilt">
      ${B0.filters.map(f=>`<select class="fsel" data-f="${f.k}">
          <option value="">${esc(f.label)}：すべて</option>
          ${f.opts.map(o=>`<option value="${esc(o)}"${st.f[f.k]===o?' selected':''}>${esc(o)}</option>`).join('')}
        </select>`).join('')}
      <span class="bcnt">${list.length}件</span>
    </div>
    <div class="blist">${list.length?list.map(x=>itemHTML(id,x)).join(''):
      '<div class="empty">まだありません。最初の1件を書いてみてください。</div>'}</div>
    ${B0.note?`<div class="bnote">${B0.note}</div>`:''}
`;

  const nb=document.getElementById(id+'-new'); if(nb) nb.onclick=()=>{st.open=!st.open;render(id);};
  el.querySelectorAll('.bfilt .fsel').forEach(sel=>sel.onchange=()=>{
    st.f[sel.dataset.f]=sel.value; render(id);});
  /* 消す・終わった は「手元の写し」と「サーバ写し(geiday_srv_v1)」の両方を直す。
     手元だけ直すと、次の描画でサーバ写しから同じ投稿が湧いて戻ってくる。 */
  el.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{
    if(!confirm('消しますか？')) return;
    const pid=b.dataset.del;
    const post=allOf(id).find(x=>String(x.id)===String(pid));
    if(typeof GAPI!=='undefined') GAPI.delPost(pid).catch(()=>{});
    SSg(B0.key, mineOf(id).filter(x=>x.id!==pid && !(post&&post.at&&x.at===post.at)));
    if(typeof SRVDATA!=='undefined'&&SRVDATA.removePost) SRVDATA.removePost(pid);
    render(id);});
  el.querySelectorAll('[data-done]').forEach(b=>b.onclick=()=>{
    const pid=b.dataset.done;
    const post=allOf(id).find(x=>String(x.id)===String(pid));
    const next=!(post&&post.done);
    const m=mineOf(id);
    const t=m.find(x=>x.id===pid || (post&&post.at&&x.at===post.at));
    if(t){ t.done=next; SSg(B0.key,m); }
    if(typeof SRVDATA!=='undefined'&&SRVDATA.patchPost) SRVDATA.patchPost(pid,{done:next});
    if(typeof GAPI!=='undefined') GAPI.donePost(pid,next).catch(()=>{});
    render(id);});
  /* 本文をクリックで開閉。ボタン類の上では反応させない。 */
  el.querySelectorAll('.bitem[data-open]').forEach(b=>b.onclick=e=>{
    if(e.target.closest('button,a')) return;
    openId[id] = openId[id]===b.dataset.open ? null : b.dataset.open;
    render(id);
  });
  el.querySelectorAll('[data-map]').forEach(b=>b.onclick=e=>{
    e.stopPropagation();
    if(typeof window.__gotoBuilding==='function') window.__gotoBuilding(Number(b.dataset.map));
  });
  /* 譲り合いの相手へ。ここで連絡先を出すのではなく、
     その人のページへ送る。連絡はそこにあるSNSから。
     メッセージ機能を持つと、届いた・届かないの責任がこちらに来る。 */
  el.querySelectorAll('[data-who]').forEach(b=>b.onclick=e=>{
    e.stopPropagation();
    if(typeof window.__gotoArtist==='function') window.__gotoArtist(b.dataset.who);
  });

  el.querySelectorAll('.bkind [data-kind]').forEach(b=>b.onclick=()=>{
    st.kind=b.dataset.kind; render(id);});
  const go=document.getElementById(id+'-save');
  if(go) go.onclick=()=>submit(id);
  if(st.open) bindPic(id);
}

/* 写真を出すのは展示と譲り合いだけ。
   講評の日程と公募は文字だけで足りるし、写真があると逆に読みにくい。 */
const WITHPIC=['ex','gv'];

/* 開いている投稿。板ごとに1つだけ開く。 */
const openId = {};

/* 一覧に出していない項目まで見せる。ここが「詳細」。 */
function detailHTML(id,x){
  const rows=[];
  const add=(k,v)=>{ if(v) rows.push([k,v]); };
  if(id==='ex' && x._t==='講評'){
    add('日時', [x.date,x.period].filter(Boolean).join(' '));
    add('場所', x.bld?bldName(x.bld):'');
    add('科', x.dept);
    add('見学', x.open?'他の科の人も見られます':'学内向け');
  } else if(id==='kb'){
    add('締切', x.dueRaw||x.due);
    add('主催', x.org);
    add('対象', x.target);
    add('金額', x.amountRaw||(x.amount?Number(x.amount).toLocaleString()+'円':''));
  } else if(id==='ex'){
    add('会期', [x.from,x.to].filter(Boolean).join(' 〜 '));
    add('会場', x.bld?bldName(x.bld):x.place);
    add('だれの', x.who);
    add('入場', x.free?'誰でも入れます':'—');
  } else if(id==='gv'){
    add('分類', x.cat);
    add('受け渡し', x.bld?bldName(x.bld):'');
    add('会える時間', x.meet);
    add('出した人', x.dept?x.dept+'科':'');
  }
  return `<div class="bdet">
    ${x.img?`<img class="bdpic" src="${esc(x.img)}" alt="">`:''}
    <div class="bdbody">
      <dl>${rows.map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
      ${x.body?`<p class="bdtxt">${esc(x.body)}</p>`:''}
      <div class="bdacts">
        ${x.bld?`<button class="btn" data-map="${esc(x.bld)}">地図で見る</button>`:''}
        ${id==='gv'&&x.uid?`<button class="btn o" data-who="${esc(x.uid)}">この人のページを見る</button>`:''}
        ${x.url?`<a class="btn o" href="${esc(x.url)}" target="_blank" rel="noopener noreferrer">公式ページ →</a>`:''}
      </div>
      ${id==='gv'?`<p class="bdnote">やりとりは、相手のページにあるSNSからお願いします。
        このサイトの中にメッセージ機能はありません。</p>`:''}
    </div>
  </div>`;
}

/* 講評には写真が無い。展示と混ざったときに行の背が揃わないので、
   科ごとに違う図をその場で描く。写真の代わり。
   使う色は青と薄い青とオレンジだけ。 */
function kouhyoThumb(x){
  const i = [...String(x.dept||'')].reduce((a,c)=>a+c.charCodeAt(0),0) % 3;
  const body=[
    /* 壁に掛かった作品と、見ている人 */
    `<rect x="12" y="14" width="26" height="22" fill="#093FB4"/>
     <rect x="42" y="14" width="12" height="22" fill="#FF5035"/>
     <circle cx="26" cy="46" r="5" fill="#093FB4"/>
     <circle cx="40" cy="46" r="5" fill="#093FB4"/>`,
    /* 台の上の立体を囲む */
    `<rect x="24" y="18" width="16" height="16" fill="#FF5035"/>
     <rect x="18" y="34" width="28" height="5" fill="#093FB4"/>
     <circle cx="13" cy="47" r="5" fill="#093FB4"/>
     <circle cx="32" cy="50" r="5" fill="#093FB4"/>
     <circle cx="51" cy="47" r="5" fill="#093FB4"/>`,
    /* 発表と、指している手 */
    `<rect x="10" y="14" width="34" height="24" fill="#093FB4"/>
     <path d="M14 44h36M14 50h24" stroke="#093FB4" stroke-width="3" stroke-linecap="round"/>
     <circle cx="50" cy="26" r="7" fill="#FF5035"/>`,
  ][i];
  return 'data:image/svg+xml;utf8,'+encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="96" height="96">`+
    `<rect width="64" height="64" fill="#DCE5F7"/>${body}</svg>`);
}

function itemHTML(id,x){
  const r=BOARDS[id].row(x);
  if(id==='ex' && x._t==='講評' && !x.img) x={...x, img:kouhyoThumb(x)};
  const on = openId[id]===x.id;
  return `<div class="bitem${x.img?' haspic':''}${on?' open':''}" data-open="${esc(x.id)}">
    <span class="btag ${r.tagCls}">${esc(r.tag)}</span>
    ${x.img?`<img class="bpic" src="${esc(x.img)}" alt="" loading="lazy">`:''}
    <div class="bmain">
      <div class="bh">${esc(r.head)}${x.dummy?'<span class="adum">ダミー</span>':''}</div>
      ${r.sub?`<div class="bs">${esc(r.sub)}</div>`:''}
      <div class="bm">${esc(r.meta)}</div>
      ${r.body?`<div class="bb">${esc(r.body)}</div>`:''}
      ${r.url?`<a class="bu" href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">公式ページを開く →</a>`:''}
    </div>
    ${x.mine?`<div class="bact">
      ${id==='gv'?`<button data-done="${esc(x.id)}">${x.done?'まだある':'終わった'}</button>`:''}
      <button data-del="${esc(x.id)}">消す</button></div>`:''}
    ${on?detailHTML(id,x):''}
  </div>`;
}
function formHTML(id){
  const B0=BOARDS[id], st=state[id];
  /* 展示と公募は聞くことが違う。先に「どちらを出すか」を選ばせて、
     選んだほうの項目だけ出す。両方並べると長くて手が止まる。 */
  const F = B0.fieldsFor ? B0.fieldsFor(st.kind) : B0.fields;
  const head = B0.kinds ? `<div class="bkind">${B0.kinds.map(k=>
      `<button class="tbtn ${st.kind===k?'on':''}" data-kind="${esc(k)}">${esc(k)}を出す</button>`
    ).join('')}</div>` : '';
  return `<div class="bform">${head}${F.map(f=>{
    const n=id+'-'+f.k;
    if(f.type==='check') return `<label class="bcheck"><input type="checkbox" id="${n}">${f.t}</label>`;
    if(f.type==='area')  return `<label class="bfull">${f.t}${f.req?' <i>必須</i>':''}
      <textarea id="${n}" maxlength="${f.max||140}" placeholder="${esc(f.ph||'')}"></textarea></label>`;
    if(f.type==='sel')   return `<label>${f.t}${f.req?' <i>必須</i>':''}
      <select id="${n}"><option value="">選ぶ</option>${f.opts.map(o=>`<option>${esc(o)}</option>`).join('')}</select></label>`;
    if(f.type==='bld')   return `<label>${f.t}<select id="${n}">${bldOpts()}</select></label>`;
    if(f.type==='span')  return `<label class="bspan">${f.t}${f.req?' <i>必須</i>':''}
      <span class="bspanrow"><input type="date" id="${id}-from"><em>〜</em><input type="date" id="${id}-to"></span></label>`;
    const t=f.type==='date'?'date':f.type==='num'?'number':f.type==='url'?'url':'text';
    return `<label>${f.t}${f.req?' <i>必須</i>':''}
      <input type="${t}" id="${n}" ${f.max?`maxlength="${f.max}"`:''} placeholder="${esc(f.ph||'')}"></label>`;
  }).join('')}
  ${WITHPIC.includes(id)?`
    <div class="bpicwrap">
      <img id="${id}-prev" class="bprev" alt="" style="display:none">
      <label class="pbtn" id="${id}-picbtn">写真を選ぶ（1枚・任意）
        <input type="file" id="${id}-pic" accept="image/*" hidden></label>
      <button class="plink" id="${id}-picclr" style="display:none">消す</button>
      <span class="bpicnote">${id==='gv'?'ゆずる物が分かる写真を1枚。':(state[id].kind==='公募'?'案内の画像があれば1枚。':'展示風景か案内の写真を1枚。')}
        8MBまで。長辺640pxに縮めて保存します。</span>
    </div>`:''}
  <div class="bsave"><button class="btn o" id="${id}-save">出す</button></div></div>`;
}

/* 選んだ写真は「出す」まで持っておく。フォームを開き直したら捨てる。 */
let draftPic={};
function bindPic(id){
  if(!WITHPIC.includes(id)) return;
  const inp=document.getElementById(id+'-pic');
  if(!inp) return;
  const prev=document.getElementById(id+'-prev'),
        clr=document.getElementById(id+'-picclr'),
        lab=document.getElementById(id+'-picbtn');
  const GX=window.GX||{};
  const show=d=>{ prev.src=d; prev.style.display=d?'block':'none';
                  clr.style.display=d?'':'none'; };
  if(draftPic[id]) show(draftPic[id]);
  inp.addEventListener('change', async e=>{
    const f=e.target.files[0]; e.target.value=''; if(!f) return;
    if(GX.busy) GX.busy(lab,true,'読み込み中…');
    try{
      draftPic[id]= GX.shrink ? await GX.shrink(f,'post') : '';
      show(draftPic[id]);
      if(GX.toast) GX.toast('写真を読み込みました');
    }catch(err){ if(GX.toast) GX.toast(err.message,'err'); else alert(err.message); }
    finally{ if(GX.busy) GX.busy(lab,false); }
  });
  clr.addEventListener('click',()=>{ draftPic[id]=''; show(''); });
}
function submit(id){
  const B0=BOARDS[id], v={};
  /* いま画面に出ている項目だけを拾う。展示のフォームで公募の項目を
     読みに行くと、要る項目が空だと言われて出せなくなる。 */
  const FS = B0.fieldsFor ? B0.fieldsFor(state[id].kind) : B0.fields;
  for(const f of FS){
    if(f.type==='span'){                       /* 期間＝はじまる日・おわる日の2つで1行 */
      const a=document.getElementById(id+'-from'), b=document.getElementById(id+'-to');
      if(!a||!b) continue;
      v.from=a.value.trim(); v.to=b.value.trim();
      if(f.req && (!v.from||!v.to)){ alert('期間を入れてください。'); (v.from?b:a).focus(); return; }
      continue;
    }
    const el=document.getElementById(id+'-'+f.k);
    if(!el) continue;
    v[f.k]= f.type==='check' ? el.checked : el.value.trim();
    if(f.req && !v[f.k]){ alert(f.t+'を入れてください。'); el.focus(); return; }
  }
  if(B0.kinds) v._t = state[id].kind; else if(id==='ex') v._t='展示';
  if(v.url && !/^https?:\/\//i.test(v.url)){ alert('リンクは http:// か https:// から始めてください。'); return; }
  if(v.from && v.to && v.from>v.to){ alert('おわる日が、はじまる日より前になっています。'); return; }
  const m=mineOf(id);
  /* フォームで科を選ぶ板（講評）では、選んだ値を優先する。
     いつも ME で上書きすると、必須で選ばせた「科」が捨てられて
     自分の学科に化ける。選ばせていない板だけ ME を使う。 */
  m.push({...v, img:draftPic[id]||'', id:'m'+Date.now(), at:Date.now(), mine:true,
          /* 誰が出したか。譲り合いで相手のページへ送るのに使う。 */
          uid:(typeof myProfile==='function'&&myProfile())?myProfile().id:'',
          dept: v.dept  || (typeof ME!=='undefined'?ME.dept :''),
          grade:v.grade || (typeof ME!=='undefined'?ME.grade:'')});
  if(SSg(B0.key,m)){
    const posted=m[m.length-1];
    if(typeof GAPI!=='undefined'){
      /* id・mine・done はこの端末の管理用。送るとサーバの data に紛れ込み、
         一覧APIの返しで本物のid（UUID）や done を上書きして、
         「他人の画面に消すボタンが出る」「消しても消えない」が起きる。 */
      const {id:_id, mine:_mn, done:_dn, ...clean}=posted;
      GAPI.putPost({...clean, board:id, ref:posted.bld||''}).catch(()=>{});
    }
    draftPic[id]='';
    state[id].open=false; render(id);
    if(window.GX&&window.GX.toast) window.GX.toast('出しました');
  } else if(window.GX&&window.GX.toast){
    m.pop();
    window.GX.toast('保存できませんでした。写真を外すか、古い投稿を消してください。','err');
  }
}

window.renderBoard=render;
window.boardStats=()=>Object.fromEntries(Object.keys(BOARDS).map(k=>[BOARDS[k].title,allOf(k).length]));
})();
