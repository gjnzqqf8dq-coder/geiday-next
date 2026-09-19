/* ============================================================
   教員タブ と アーティストタブ

   教員 : 公開シラバスの担当教員欄から作った事実だけの一覧。
          評価・人物評は持たせない（実在の人物なので）。
   アーティスト : 学生が自分で作るプロフィール。
          プロフィール写真と作品写真は自分でアップロードする。
          いま入っている他人のプロフィールはすべて架空（ダミー）。
   ============================================================ */
(function(){
"use strict";

const esc = s => (s||'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
const TEA = (typeof TEACHERS!=='undefined') ? TEACHERS : [];
const DART = (typeof DUMMY_ARTISTS!=='undefined') ? DUMMY_ARTISTS : [];

/* ── 保存 ────────────────────────────────── */
const LSg=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d;}catch(e){return d;}};
const SSg=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true;}
                  catch(e){alert('保存できませんでした。写真を外すか、小さくしてください。');return false;}};
let ME_ART = LSg('geidai_me_artist_v1', null);


/* ── seed から決まる幾何学パターン（プロフィール写真の代わり） ──────
   実在しない人の顔をでっち上げないための措置。明らかに図形と分かる。 */
function pattern(seed, size, kind){
  let s = seed>>>0;
  const rnd = ()=>{ s=(s*1664525+1013904223)>>>0; return s/4294967296; };
  const hue = Math.floor(rnd()*360);
  const bg = `hsl(${hue} 22% 94%)`;
  const fg = `hsl(${hue} 46% 46%)`;
  const fg2= `hsl(${(hue+40)%360} 40% 62%)`;
  let body='';
  if(kind==='work'){
    for(let i=0;i<7;i++){
      const x=rnd()*100, y=rnd()*100, w=8+rnd()*46, h=8+rnd()*46;
      body += rnd()<.45
        ? `<circle cx="${x}" cy="${y}" r="${w/2}" fill="${rnd()<.5?fg:fg2}" opacity="${.25+rnd()*.5}"/>`
        : `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${rnd()<.5?fg:fg2}" opacity="${.2+rnd()*.5}" transform="rotate(${rnd()*40-20} ${x} ${y})"/>`;
    }
  } else {
    for(let i=0;i<4;i++){
      const x=rnd()*100, y=rnd()*100, r=14+rnd()*30;
      body += `<circle cx="${x}" cy="${y}" r="${r}" fill="${i%2?fg:fg2}" opacity="${.35+rnd()*.35}"/>`;
    }
  }
  return `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}">`+
    `<rect width="100" height="100" fill="${bg}"/>${body}</svg>`)}`;
}

/* ── 写真の取り込み。長辺640pxに縮めてから持つ ────────
   そのまま入れると容量を食い切るので必ず縮める。 */
function readImage(file, cb){
  if(!file) return;
  if(!/^image\//.test(file.type)){ alert('画像を選んでください。'); return; }
  const fr=new FileReader();
  fr.onload=()=>{
    const img=new Image();
    img.onload=()=>{
      const M=640, sc=Math.min(1, M/Math.max(img.width,img.height));
      const c=document.createElement('canvas');
      c.width=Math.round(img.width*sc); c.height=Math.round(img.height*sc);
      c.getContext('2d').drawImage(img,0,0,c.width,c.height);
      cb(c.toDataURL('image/jpeg',0.82));
    };
    img.src=fr.result;
  };
  fr.readAsDataURL(file);
}

/* ══════════ 教員タブ ══════════ */
/* 1000人を一度に描くと重い。だが黙って打ち切ると、
   「1004人」と出ているのに残りにたどり着けない。数えて出す。 */
const TSTEP=200;
let tq='', tsort='n', topen=null, tshown=TSTEP;
function renderTeachers(){
  const q=tq.trim().toLowerCase();
  let list=TEA.filter(t=>{
    if(!q) return true;
    return (t.name+' '+t.kubun.join(' ')+' '+t.courses.map(c=>c.t).join(' '))
           .toLowerCase().includes(q);
  });
  if(tsort==='name') list=list.slice().sort((a,b)=>a.name.localeCompare(b.name,'ja'));
  document.getElementById('tcount').innerHTML=`<b>${list.length}</b>人`;
  document.getElementById('tlist').innerHTML=list.slice(0,tshown).map(t=>{
    const bio=(typeof bioOf==='function')?bioOf(t.name):null;
    /* 一覧では「いま何をしている人か」の1行だけ。
       職歴の行がいちばん人物が分かるので、それを出す。
       全部は開いたときに出す。 */
    const one=bio?(bio.b[1]||bio.b[0]||''):'';
    return `
    <li class="row trow${topen===t.name?' open':''}" data-t="${esc(t.name)}">
      <div>
        <div class="ti">${esc(t.name)}</div>
        ${one?`<div class="tbio1">${esc(one)}</div>`:''}
        <div class="mt">${t.kubun.map(k=>`<span class="kchip">${esc(k)}</span>`).join('')}
          ${t.campus.length?`<span class="dot">/</span>${esc(t.campus.join('・'))}`:''}</div>
      </div>
      <div class="right"><span class="cn">${t.n}</span><span class="cu">科目</span></div>
      <div class="detail">${topen===t.name?bioHTML(bio)+courseListHTML(t):''}</div>
    </li>`;}).join('') || `<div class="empty">見つかりませんでした</div>`;

  const more=document.getElementById('tmore');
  if(more){
    const rest=list.length-tshown;
    more.style.display = rest>0 ? '' : 'none';
    more.textContent = rest>0 ? `のこり ${rest}人を表示` : '';
    more.onclick=()=>{ tshown+=TSTEP; renderTeachers(); };
  }

  document.querySelectorAll('#tlist .trow').forEach(li=>li.onclick=()=>{
    topen = topen===li.dataset.t ? null : li.dataset.t;
    renderTeachers();
  });
  document.querySelectorAll('#tlist .gocourse').forEach(a=>a.onclick=e=>{
    e.stopPropagation();
    window.__openCourse && window.__openCourse(a.dataset.k);
  });
}
/* 経歴。researchmap に本人（または所属機関）が登録した内容をそのまま並べる。
   ここに無い人は、公開されている経歴が確認できなかった人。
   実在の人物なので、こちらで書き足すことは絶対にしない。 */
function bioHTML(b){
  if(!b) return `<div class="tbio none">経歴は、公開されているものが見つかりませんでした。</div>`;
  return `<div class="tbio">
    <div class="tbh">経歴</div>
    ${b.b.map(l=>`<p>${esc(l)}</p>`).join('')}
    <div class="tbsrc">出どころ：researchmap（${esc(b.at||'')} 更新）
      <a href="https://researchmap.jp/${esc(b.rm)}" target="_blank" rel="noopener noreferrer"
         onclick="event.stopPropagation()">本人のページを開く</a></div>
  </div>`;
}
function courseListHTML(t){
  return `<div class="tcourses">
    <div class="tch">担当している科目（${t.n}）</div>
    ${t.courses.slice(0,60).map(c=>`
      <div class="tcrow">
        <span class="tcy">${esc(c.y)}</span>
        <span class="tct gocourse" data-k="${esc(c.k)}">${esc(c.t)}</span>
        <span class="tck">${esc(c.kb)}</span>
        <span class="tcs">${c.d?esc(c.d)+c.p:'—'}</span>
      </div>`).join('')}
    ${t.courses.length>60?`<div class="tcmore">ほか ${t.courses.length-60}件</div>`:''}
  </div>`;
}

/* SNSはハンドルだけ持って、開くときにURLを組み立てる。
   フルURLを持たせると、打ち間違いや別サイトへの誘導が入り込む余地ができる。 */
const SNSURL = {
  instagram:'https://www.instagram.com/',
  x:'https://x.com/',
  tiktok:'https://www.tiktok.com/@',
  youtube:'https://www.youtube.com/@',
};

/* ══════════ アーティストタブ ══════════ */
let aFilter='', aOpen=null, aEdit=false;
function allArtists(){
  /* 自分のページはアカウントのプロフィールから来る。1人1つ。 */
  const mine = (typeof myProfile==='function' && myProfile()) ? [myProfile()] : [];
  /* サーバの公開プロフィールと、見本（ダミー）は**両方**出す。
     以前は本物が1人でも入ると見本を全部引っ込めていたが、
     そうすると別の端末から開いた人には1人しか並ばず、壊れて見える。
     見本には「ダミー」の札が付いているので、取り違えは起きない。 */
  const srv = (typeof SRVDATA!=='undefined') ? SRVDATA.artists() : [];
  /* id はサーバ由来がUUID文字列、見本が数値。型をまたいで比べるので必ず文字列に揃える。
     ここが揃っていなかったせいで、サーバから返る自分を別人と数えて2枚並んだ。 */
  const real = srv.filter(a=>!mine.length||String(a.id)!==String(mine[0].id));
  const ids  = new Set(mine.concat(real).map(a=>String(a.id)));
  return mine.concat(real, DART.filter(a=>!ids.has(String(a.id))));
}
function renderArtists(){
  const wrap=document.getElementById('p-art');
  const list=allArtists().filter(a=>!aFilter||a.dept===aFilter);
  /* 学科が空の人（まだ所属を選んでいない人）でボタンを作らない。
     中身のない青いチップが1つ並んでしまう。 */
  const depts=[...new Set(allArtists().map(a=>a.dept).filter(Boolean))];

  wrap.innerHTML=`
    <div class="bhead">
      <div><h2>アーティスト</h2>
        <p>藝大生が、いま何を作っているか。学科をまたいで見られます。</p></div>
      ${(typeof myProfile==='function' && myProfile()) ? ''
        : `<button class="btn o" id="amake">自分のページを作る</button>`}
    </div>
    <!-- 学科は9個ある。ボタンで並べると2行になるのでセレクト1本にする。 -->
    <div class="abar">
      <select class="fsel" id="adept">
        <option value="">学科：すべて</option>
        ${depts.map(d=>`<option value="${esc(d)}"${aFilter===d?' selected':''}>${esc(d)}</option>`).join('')}
      </select>
      <span class="acnt">${list.length}人</span>
    </div>
    <div class="agrid">${list.map(a=>cardHTML(a)).join('')}</div>
    <dialog class="amodal" id="amodal"></dialog>`;

  const mk=document.getElementById('amake');
  if(mk) mk.onclick=()=>{ if(typeof go==='function') go('acc'); };
  const ad=document.getElementById('adept');
  if(ad) ad.onchange=()=>{aFilter=ad.value;renderArtists();};
  /* Number() をかけない。UUIDのidは数値にすると NaN になって、開けなくなる */
  wrap.querySelectorAll('.acard').forEach(c=>c.onclick=()=>openArtist(c.dataset.a, c));
  if(aOpen!=null) openArtist(aOpen);
}

/* ── 開き方 ──────────────────────────────
   前は一覧の下に詳細を差し込んでいた。押すたびに下へ飛ばされるうえ、
   一覧ごと描き直すのでスクロール位置も絞り込みも失われていた。

   いまは <dialog> を showModal() で開く。これだけで
   トップレイヤーへの昇格・::backdrop・背面の不活性化・フォーカスの閉じ込めが
   ブラウザ側で済むので、自前で書くコードが減る（ライブラリも要らない）。

   加えて、実際のギャラリー系サイト（MoMA・Flickr・Behance）が
   詳細を「戻れる状態」として扱っているのに倣って、
     ・履歴を1つ積む → ブラウザの戻る／スマホの戻るジェスチャで閉じる
     ・一覧は描き直さない → スクロール位置と絞り込みがそのまま残る
     ・閉じたら押したカードへフォーカスを返し、少しだけ光らせる
   ようにしてある。 */
let aFrom=null;                       // どのカードから開いたか
let aPushed=false;                    // この詳細のぶんの履歴を積んだか
function openArtist(id, card){
  const a=allArtists().find(x=>String(x.id)===String(id)); if(!a) return;
  const dlg=document.getElementById('amodal'); if(!dlg) return;
  aOpen=id; aFrom=card||null; aEdit=false;
  dlg.innerHTML=`<button class="amx" aria-label="閉じる">×</button>
    <div class="ambody">${detailHTML(a)}</div>`;
  if(!dlg.open){
    dlg.showModal();
    document.body.style.overflow='hidden';
  }
  /* 履歴は1つの詳細につき1つだけ。フォローを押すと一覧ごと描き直されて
     dialog が作り直されるが、そこで毎回積むと、戻るを押した回数だけ
     押していないと外へ出られなくなる。 */
  if(!aPushed){ history.pushState({artist:id}, ''); aPushed=true; }
  dlg.querySelector('.amx').onclick=()=>history.back();
  /* 背景（::backdrop の部分）を押しても閉じる */
  dlg.onclick=e=>{ if(e.target===dlg) history.back(); };
  dlg.oncancel=e=>{ e.preventDefault(); history.back(); };   // Esc も履歴を戻して閉じる
  bindDetail();
  const bd=dlg.querySelector('.ambody'); if(bd) bd.scrollTop=0;
}
function closeArtist(){
  const dlg=document.getElementById('amodal');
  if(dlg&&dlg.open) dlg.close();
  document.body.style.overflow='';
  aOpen=null; aPushed=false;
  if(aFrom&&document.body.contains(aFrom)){
    aFrom.focus&&aFrom.focus();
    aFrom.classList.add('back');                 // 戻ってきた場所を1.2秒だけ光らせる
    setTimeout(()=>aFrom&&aFrom.classList.remove('back'), 1200);
  }
  aFrom=null;
}
addEventListener('popstate', ()=>{ if(aOpen!=null) closeArtist(); });

/* 譲り合いから「この人のページを見る」で呼ばれる。
   連絡先そのものは渡さず、その人のページを開くところまで。
   連絡はページに載っているSNSからしてもらう。 */
window.__gotoArtist=function(uid){
  if(typeof go==='function') go('art');
  const a=allArtists().find(x=>String(x.id)===String(uid));
  if(!a){ if(window.GX&&GX.toast) GX.toast('この人はまだページを作っていません。'); return; }
  aFilter=''; renderArtists();
  setTimeout(()=>openArtist(a.id), 0);
};
function blank(){
  return {name:'', dept:ME.dept||'', grade:Number(ME.grade)||1, media:[],
          doing:'', want:'', sns:{instagram:'',x:'',tiktok:'',youtube:''},
          works:[], face:'', seed:Math.floor(Math.random()*9000)+1000, openTT:false};
}
function avatarOf(a){ return a.face || pattern(a.seed||1234, 96, 'face'); }
/* 一覧は正方形のタイル。顔写真より作品のほうが「誰か」が伝わるので、
   1枚目の作品があればそれを、無ければアイコンを面いっぱいに敷く。 */
/* 一覧のタイルは、まずその人のプロフィール写真。
   作品はページを開けば見られる。一覧で見分けたいのは「誰か」のほう。 */
function cardHTML(a){
  const w=(a.works||[])[0];
  const img = a.face || (w&&w.img) || pattern(a.seed||1234, 480, w?'work':'face');
  return `<div class="acard${String(aOpen)===String(a.id)?' on':''}" data-a="${a.id}" tabindex="0" role="button">
    <img class="acimg" src="${img}" alt="" loading="lazy" decoding="async">
    <div class="ainfo">
      <div class="an"><span class="ann">${esc(a.name||'（名前未設定）')}</span>${
        a.me?'<span class="ame">あなた</span>':''}${
        a.dummy?'<span class="adum">ダミー</span>':''}</div>
      <div class="ad">${esc(a.dept||'')}${a.grade?' '+a.grade+'年':''}</div>
    </div>
  </div>`;
}
function detailHTML(a){
  if(!a) return '';
  if(a.me && aEdit) return editHTML(a);
  const sns=Object.entries(a.sns||{}).filter(([,v])=>v);
  /* プロフィールは1本の文にした。見本データだけ「やっていること」と
     「探していること」に分かれているので、ここで1つに繋いで出す。 */
  const bio=[a.doing,a.want].filter(Boolean).join('　');
  return `<div class="adetail">
    <div class="ahead">
      <img class="aav big" src="${avatarOf(a)}" alt="">
      <div>
        <h3>${esc(a.name||'（名前未設定）')}</h3>
        <div class="ad">${esc(a.dept||'')}${a.grade?' '+a.grade+'年':''}
          ${a.dummy?'<span class="adum">ダミー</span>':''}</div>
        <div class="am">${(a.media||[]).map(m=>`<span>${esc(m)}</span>`).join('')}</div>
      </div>
      ${a.me?`<div class="aacts">
        <button class="btn" id="aedit">アカウントで編集</button></div>`:''}
    </div>
    ${bio?`<div class="asec"><p class="abio">${esc(bio)}</p></div>`:''}
    ${sns.length?`<div class="asec"><h4>SNS</h4>
      <div class="asns">${sns.map(([k,v])=>{
        const u=SNSURL[k]; if(!u) return '';
        return `<a class="sn" href="${u+encodeURIComponent(v)}" target="_blank"
                   rel="noopener noreferrer"><b>${k}</b>${esc(v)} <span class="snx">↗</span></a>`;
      }).join('')}</div>
</div>`:''}
    ${(a.works||[]).length?`<div class="asec"><h4>作品</h4>
      <div class="agal">${a.works.map(w=>`<figure>
        <img src="${w.img||pattern(w.seed||1,320,'work')}" alt="">
        <figcaption>${esc(w.t||'')}${w.y?` <span>${esc(w.y)}</span>`:''}</figcaption>
      </figure>`).join('')}</div>
      ${a.dummy?'<div class="anote">画像は生成したものです。</div>':''}</div>`:''}
  </div>`;
}
function editHTML(a){
  return `<div class="adetail edit">
    <h3>あなたのページ</h3>
    <div class="af">
      <label>名前・活動名<input id="e-name" value="${esc(a.name)}" maxlength="24"></label>
      <label>学科<select id="e-dept">${DEPTS.map(d=>
        `<option ${d===a.dept?'selected':''}>${esc(d||'選ぶ')}</option>`).join('')}</select></label>
      <label>学年<select id="e-grade">${[1,2,3,4].map(g=>
        `<option value="${g}" ${g===a.grade?'selected':''}>${g}年</option>`).join('')}</select></label>
    </div>
    <label class="afull">やっていること
      <textarea id="e-doing" maxlength="200" placeholder="例）陶芸をやっています。手を動かしながら考えるほうです。">${esc(a.doing)}</textarea></label>
    <label class="afull">いま探していること
      <textarea id="e-want" maxlength="200" placeholder="例）展示の手伝いをしてくれる人を探しています。">${esc(a.want)}</textarea></label>
    <label class="afull">扱っているもの（読点で区切る）
      <input id="e-media" value="${esc((a.media||[]).join('、'))}" placeholder="陶芸、映像"></label>
    <div class="af">
      ${['instagram','x','tiktok','youtube'].map(k=>
        `<label>${k}<input id="e-${k}" value="${esc((a.sns||{})[k]||'')}" placeholder="@なしで"></label>`).join('')}
    </div>
    <div class="af">
      <label>プロフィール写真<input type="file" id="e-face" accept="image/*"></label>
      <label>作品を足す<input type="file" id="e-work" accept="image/*"></label>
    </div>
    ${(a.works||[]).length?`<div class="agal small">${a.works.map((w,i)=>`<figure>
      <img src="${w.img||pattern(w.seed||1,160,'work')}" alt="">
      <input class="wt" data-i="${i}" value="${esc(w.t||'')}" placeholder="題名">
      <button class="wdel" data-i="${i}">消す</button></figure>`).join('')}</div>`:''}
    <label class="acheck"><input type="checkbox" id="e-open" ${a.openTT?'checked':''}>
      時間割を公開する</label>
    <div class="anote">いまは試作のため、書いた内容と写真はこのブラウザの中だけに保存されます。
      他の人には届きません。写真は長辺640pxに縮めて保存します。</div>
    <div class="aacts"><button class="btn o" id="asave">保存する</button>
      <button class="btn" id="acancel">やめる</button></div>
  </div>`;
}
function bindDetail(){
  const w=document.getElementById('p-art');
  const ed=document.getElementById('aedit');
  if(ed) ed.onclick=()=>{ if(typeof go==='function') go('acc'); };
  /* フォローは作っていない機能だった。押せるのに何も起きないボタンは置かない。 */
  const face=document.getElementById('e-face');
  if(face) face.onchange=e=>readImage(e.target.files[0],d=>{ME_ART.face=d;renderArtists();});
  const wk=document.getElementById('e-work');
  if(wk) wk.onchange=e=>readImage(e.target.files[0],d=>{
    (ME_ART.works=ME_ART.works||[]).push({t:'',y:'',img:d}); renderArtists();});
  w.querySelectorAll('.wdel').forEach(b=>b.onclick=()=>{
    ME_ART.works.splice(Number(b.dataset.i),1); renderArtists();});
  const save=document.getElementById('asave');
  if(save) save.onclick=()=>{
    const g=id=>document.getElementById(id);
    ME_ART.name=g('e-name').value.trim();
    ME_ART.dept=g('e-dept').value; ME_ART.grade=Number(g('e-grade').value);
    ME_ART.doing=g('e-doing').value.trim(); ME_ART.want=g('e-want').value.trim();
    ME_ART.media=g('e-media').value.split(/[、,]/).map(s=>s.trim()).filter(Boolean);
    ME_ART.sns={}; ['instagram','x','tiktok','youtube'].forEach(k=>{
      ME_ART.sns[k]=g('e-'+k).value.trim().replace(/^@/,'');});
    w.querySelectorAll('.wt').forEach(i=>{ ME_ART.works[Number(i.dataset.i)].t=i.value.trim(); });
    ME_ART.openTT=g('e-open').checked;
    if(!ME_ART.name){ alert('名前を入れてください。'); return; }
    if(SSg('geidai_me_artist_v1',ME_ART)){ aEdit=false; renderArtists(); }
  };
  const cx=document.getElementById('acancel');
  if(cx) cx.onclick=()=>{ ME_ART=LSg('geidai_me_artist_v1',null); aEdit=false;
    if(!ME_ART) aOpen=null;
    if(aOpen!=null) history.back(); else renderArtists(); };
}

/* ── 外から呼ぶ ─────────────────────────── */
window.renderTeachers=renderTeachers;
window.renderArtists=renderArtists;
window.bindTeacherSearch=()=>{
  let t;
  document.getElementById('tq').oninput=e=>{clearTimeout(t);
    t=setTimeout(()=>{tq=e.target.value;tshown=TSTEP;renderTeachers();},160);};
  document.getElementById('tsort').onchange=e=>{tsort=e.target.value;tshown=TSTEP;renderTeachers();};
};
window.peopleStats=()=>({教員:TEA.length, 架空の学生:DART.length,
  自分のページ:!!ME_ART});
})();
