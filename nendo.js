/* ============================================================
   年度が変わったときのこと

   4月1日をまたいだら、学年をひとつ上げる。
   毎年ぜんぶの人に「学年を直してください」と言うのは、
   全員が同じ操作をするだけの手間で、こちらで分かることだから。

   ただし黙って上げない。上げたことは画面に出して、
   1回だけ「合っていますか」を見せる。休学・留年・早期修了があるので、
   こちらの計算が正しいとは限らない。

   4年生と修士2年・博士3年は、次が決まっていない。
     学部4年　→ 進学したか、しなかったかを聞く
     修了・卒業 → 進路のアンケートを1回だけ出す

   持つもの（すべて自分の端末。サーバには prefs として同期される）
     geidai_nendo_v1 = {y: 最後に見た年度, ask: 'promote'|'grad4'|'after'|null,
                        from: 上げる前の学年, done: [済ませた年度]}
   ============================================================ */
(function(){
"use strict";
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
const K='geidai_nendo_v1';
const LS=(k,d)=>{try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v);}catch(e){return d;}};
const SS=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}};

/* 日本の年度。1〜3月はまだ前の年度。 */
function nendo(d){ d=d||new Date(); const m=d.getMonth()+1;
  return d.getFullYear() - (m<4?1:0); }

/* 次の学年。行き止まりは null を返す。 */
const NEXT={'1':'2','2':'3','3':'4','M1':'M2','D1':'D2','D2':'D3'};
const LAST=['4','M2','D3'];

function state(){ return LS(K,{y:0,ask:null,from:'',done:[]}); }

/* 年度が変わっていたら学年を進める。画面を描く前に1回だけ走る。 */
function roll(){
  const me=LS('geidai_me_v1',{});
  const y=nendo(), st=state();
  if(!st.y){ st.y=y; SS(K,st); return; }      // 初回。何もしない
  if(st.y>=y) return;                          // 年度は変わっていない
  const g=String(me.grade||'');
  st.y=y;
  if(!g){ SS(K,st); return; }                  // 学年を入れていない人は触らない
  if(LAST.indexOf(g)>=0){
    /* 学部4年は「進学したか」、院の最終学年は「これからどうするか」。 */
    st.ask = g==='4' ? 'grad4' : 'after';
    st.from = g;
  }else if(NEXT[g]){
    me.grade = NEXT[g];
    SS('geidai_me_v1', me);
    try{ localStorage.removeItem('geidai_ttgrade_v1'); }catch(e){}
    st.ask='promote'; st.from=g;
  }
  SS(K,st);
}

/* 聞くことがあるときだけ出す。無ければ何も描かない。 */
function render(){
  const box=document.getElementById('nendo');
  if(!box) return;
  const st=state();
  if(!st.ask){ box.innerHTML=''; box.style.display='none'; return; }
  box.style.display='';
  const me=LS('geidai_me_v1',{});
  const gn=g=>/^[1-4]$/.test(String(g))?g+'年':String(g);

  if(st.ask==='promote'){
    box.innerHTML=`<div class="ndbox">
      <div class="ndt">${st.y}年度になりました</div>
      <p>学年を <b>${esc(gn(st.from))}</b> から <b>${esc(gn(me.grade))}</b> に進めました。</p>
      <div class="ndbtns">
        <!-- オレンジは大多数が押す側に。訂正は例外の道 -->
        <button class="btn o" data-nd="ok">これで合っています</button>
        <button class="btn" data-nd="fix">ちがう</button>
      </div></div>`;
  }else if(st.ask==='grad4'){
    box.innerHTML=`<div class="ndbox">
      <div class="ndt">${st.y}年度になりました</div>
      <p>学部4年でした。この4月からはどちらですか。</p>
      <div class="ndbtns">
        <button class="btn" data-nd="M1">大学院に進んだ</button>
        <button class="btn" data-nd="grad">卒業した</button>
        <button class="btn o" data-nd="stay">まだ学部4年</button>
      </div></div>`;
  }else{
    box.innerHTML=`<div class="ndbox">
      <div class="ndt">修了おめでとうございます</div>
      <p>これから何をするか、ひとことだけ教えてください。
        あとから来る人が「藝大を出た人はどこへ行くのか」を知る手がかりになります。
        学科と進路だけを出します。名前は出しません。</p>
      <div class="ndrow">
        <select id="ndkind">
          <option value="">選ぶ</option>
          <option>就職（企業など）</option><option>就職（教職）</option>
          <option>非常勤・自営</option><option>作家・演奏を続ける</option>
          <option>進学</option><option>留学</option><option>まだ決めていない</option>
        </select>
        <input id="ndwhere" placeholder="行き先（任意・書かなくていい）">
        <button class="btn o" data-nd="send">出す</button>
      </div>
      <button class="lnk" data-nd="skip">書かない</button></div>`;
  }

  box.querySelectorAll('[data-nd]').forEach(b=>b.onclick=()=>act(b.dataset.nd));
}

function clear(){ const st=state(); st.ask=null; st.from=''; SS(K,st); render(); }

function act(v){
  const me=LS('geidai_me_v1',{});
  if(v==='ok'||v==='skip'||v==='stay'){ clear(); return; }
  if(v==='fix'){ clear(); if(typeof go==='function') go('acc'); return; }
  if(v==='M1'||v==='grad'){
    me.grade = v==='M1' ? 'M1' : '';
    SS('geidai_me_v1', me);
    try{ localStorage.removeItem('geidai_ttgrade_v1'); }catch(e){}
    const st=state();
    st.ask = v==='grad' ? 'after' : null;   // 卒業ならそのままアンケートへ
    st.from='4'; SS(K,st); render();
    if(typeof window.__syncMe==='function') window.__syncMe();
    return;
  }
  if(v==='send'){
    const kind=(document.getElementById('ndkind')||{}).value||'';
    const where=((document.getElementById('ndwhere')||{}).value||'').trim();
    if(!kind){ if(window.GX&&GX.toast) GX.toast('どれか選んでください'); return; }
    const rec={dept:me.dept||'', grade:state().from, kind:kind, where:where.slice(0,60),
               y:state().y};
    if(window.GAPI && typeof GAPI.putPost==='function'){
      GAPI.putPost({board:'shinro', ...rec}).catch(()=>{});
    }
    const keep=LS('geidai_shinro_v1',[]); keep.push(rec); SS('geidai_shinro_v1',keep);
    if(window.GX&&GX.toast) GX.toast('ありがとうございます');
    clear();
  }
}

/* 動きを確かめるための入口。年度を1つ戻して、次の描画で進級を起こす。 */
window.__nendoTest=function(kind){
  const st=state(); st.y=nendo()-1; st.ask=null; SS(K,st);
  if(kind){ const me=LS('geidai_me_v1',{}); me.grade=kind; SS('geidai_me_v1',me); }
  roll(); render();
};
window.__nendoRoll=roll;
window.renderNendo=render;
roll();
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',render);
else render();
})();
