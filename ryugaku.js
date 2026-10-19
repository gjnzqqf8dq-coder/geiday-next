/* ============================================================
   留学タブ

   出どころ（2026-08-06 に実際のページを読んで書き起こした）
     ・GEIDAI×GLOBAL 藝大の留学制度について
       https://global.geidai.ac.jp/inter_program/study_abroad/g2/
     ・国際交流協定校・機関
       https://global.geidai.ac.jp/about/data/international_partners/
     ・奨学金支援
       https://global.geidai.ac.jp/inter_program/study_abroad/scholarships/

   守っていること
     ・締切と金額は「大学のページにそう書いてあった」ものだけを載せる。
       推測で埋めない。分からないものは「大学ページで確認」と書く。
     ・年度で必ず変わるので、いつ時点の情報かを画面に出す。
     ・応募の可否を判定しない。判定できるだけの情報が公開されていない。
   ============================================================ */
(function(){
"use strict";
/* 数値や真偽値が来ても落ちないように、必ず文字列にしてから置換する */
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
const ASOF='2026-08-06';

/* ── 制度 ───────────────────────────────── */
const SEIDO=[
  {t:'交換留学', lead:'大学どうしの協定を使って、相手校に授業料を払わずに行く。',
   rows:[['だれが','派遣先の大学が決めた条件を満たす人'],
         ['どのくらい','3か月以上、最長1年'],
         ['選ばれ方','学内選考（書類と面接）。原則、協定校ごとに1名'],
         ['相手校の授業料','原則いらない（一部の大学を除く）'],
         ['藝大の授業料','休学するなら払わない／在学のままなら払う'],
         ['窓口','所属の教務担当'] ],
   note:'枠が「協定校につき1名」なので、行きたい学校が決まっているなら早めに教務へ。'},
  {t:'一般留学', lead:'自分で相手校に申し込んで行く。大学の選考はない。',
   rows:[['だれが','制限なし'],
         ['どのくらい','自分次第（休学するなら2年以内）'],
         ['選ばれ方','なし。本人が直接その大学へ申請する'],
         ['費用','全額じぶん持ち'],
         ['窓口','学生課 国際交流係'] ],
   note:'留学すると卒業・修了の時期がうしろにずれることがある。'},
];

/* ── 協定校（大学のページの掲載順に沿って地域ごとに）── */
const PARTNERS=[
  {area:'アジア', n:29, list:[
    ['中国','中央美術学院／中央音楽学院／清華大学美術学院／上海音楽学院／中国美術学院／新疆芸術学院／敦煌研究院／広州美術学院／上海大学上海美術学院／浙江師範大学美術学院／湖北美術学院／西安美術学院'],
    ['台湾','国立台南芸術大学／国立台湾芸術大学／国立台北芸術大学／国立台湾師範大学'],
    ['韓国','ソウル大学校美術大学／ソウル大学校音楽大学／韓国芸術綜合学校／大邱大学校／韓国映画アカデミー／韓國傳統文化大學校'],
    ['タイ','シラパコーン大学／モンクット王工科大学ラートクラバン校'],
    ['そのほか','ベトナム美術大学／インドネシア芸術大学ジョグジャカルタ校／ラサール芸術大学（シンガポール）／ナショナル・インスティテュート・オブ・デザイン（インド）／ウズベキスタン国立音楽院'],
  ]},
  {area:'ヨーロッパ', n:44, list:[
    ['国ぐに','英国・ドイツ・フランス・イタリア・オーストリア・スイス・フィンランド・ノルウェー・デンマーク・ポーランド・ハンガリー・ギリシャ・スロバキア・エストニア・リヒテンシュタイン など'],
  ], more:'いちばん数が多い地域。学校名は大学のページの一覧で確認してください。'},
  {area:'中東', n:4, list:[
    ['トルコ','アナドール大学／ミマール・シナン美術大学'],
    ['イスラエル','ベツァルエル美術デザインアカデミー'],
    ['イラン','テヘラン芸術大学'],
  ]},
  {area:'オセアニア', n:3, list:[
    ['オーストラリア','シドニー大学／グリフィス大学／メルボルン大学'],
  ]},
  {area:'北米', n:1, list:[
    ['アメリカ','シカゴ美術館附属美術大学'],
  ], more:'北米は1校だけ。アメリカへ行きたいなら一般留学か、外部の奨学金を軸に考えることになる。'},
];

/* ── 奨学金。締切は大学のページに載っていた日付をそのまま ── */
const SCH_IN=[
  {t:'語学学習奨励奨学金', who:'在学中に語学検定でよいスコアを取った人',
   when:'随時', amount:'大学ページで確認'},
  {t:'海外留学支援奨学金', who:'学内で一定期間学んだ人',
   when:'2026/6/8〜7/17', note:'後期の募集は大学ページで確認', amount:'大学ページで確認'},
];
const SCH_UNI=[
  {t:'経団連国際教育交流財団 日本人大学院生奨学金', who:'大学院在籍／2027年度に留学開始予定',
   when:'2026/8/17〜8/27', amount:'年 500万円（最長2年）', hot:true},
  {t:'東京グローバル・パスポート', who:'日本国籍／28日〜3か月の留学',
   when:'2026/7/24〜10/15', amount:'東京都のページで確認', hot:true},
  {t:'石橋財団奨学金', who:'美術史に関わる研究をする人', when:'2026/8/3', amount:'財団ページで確認'},
  {t:'業務スーパージャパンドリーム財団 留学支援', who:'日本国籍／35歳以下／学部2年以上',
   when:'2026/7/1', amount:'財団ページで確認'},
  {t:'トビタテ！留学JAPAN', who:'留学計画は自由。芸術活動も対象',
   when:'2025/12/3〜2026/2/10', note:'例年12月〜2月。次は今年の冬', amount:'JASSOのページで確認'},
  {t:'JASSO 海外留学支援制度（大学院学位取得型）', who:'修士・博士の学位を取りに行く人',
   when:'2025/10/2', note:'例年10月はじめ。次は今年の秋', amount:'JASSOのページで確認'},
  {t:'堀田育英財団', who:'ヨーロッパで芸術文化を学ぶ人', when:'例年11/18ごろ', amount:'財団ページで確認'},
];
const SCH_SELF=[
  {t:'経団連グローバル人材育成スカラーシップ', who:'学部2年〜博士前期', when:'2026/8/4〜10/7', hot:true},
  {t:'中島記念国際交流財団', who:'30歳以下', when:'2026/8/1〜8/20', hot:true},
  {t:'渥美国際交流財団', who:'博士課程在籍', when:'2026/9/1〜9/20', hot:true},
  {t:'しのはら財団', who:'アメリカ・イギリス・カナダへの留学', when:'2026/9/18', hot:true},
  {t:'リクルートスカラシップ アート部門', who:'芸術分野', when:'2026/7/1〜9/15', hot:true},
  {t:'伊藤国際教育交流財団', who:'—', when:'2026/6/29〜8/26', hot:true},
  {t:'松下幸之助国際スカラシップ', who:'—', when:'2026/7/23'},
  {t:'重田教育財団', who:'—', when:'2026/5/1〜6/30'},
  {t:'フルブライト奨学金', who:'大学院生・教育職をめざす人', when:'2026/5/1'},
  {t:'福井県グローバル人材基金', who:'福井県出身／18〜35歳', when:'随時'},
];

/* いま応募できるか。日付が読み取れるものだけ判定する。
   読み取れないものを「受付中」に倒すと嘘になるので、そこは「大学ページで確認」。
   終わりの日付は「10/15」の形も「2026/2/10」の形も来る。 */
const TODAY=new Date(ASOF);
function status(when){
  const r=when.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})\s*[〜~]\s*(?:(\d{4})\/)?(\d{1,2})\/(\d{1,2})/);
  if(r){
    const a=new Date(+r[1],+r[2]-1,+r[3]);
    let b=new Date(+(r[4]||r[1]),+r[5]-1,+r[6]);
    if(b<a) b=new Date(+r[1]+1,+r[5]-1,+r[6]);   // 年をまたぐ募集
    if(TODAY<a) return {k:'soon', t:'これから'};
    if(TODAY<=b) return {k:'live', t:'受付中'};
    return {k:'past', t:'終了'};
  }
  const s=when.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/);
  if(s){ const d=new Date(+s[1],+s[2]-1,+s[3]);
    return TODAY<=d ? {k:'soon', t:'この日まで'} : {k:'past', t:'終了'}; }
  if(/随時/.test(when)) return {k:'live', t:'随時'};
  return {k:'past', t:'要確認'};
}

/* 締切が近いものほど上。終わったものは下へ。
   一覧の意味は「いま何に出せるか」なので、載っている順のままだと使えない。 */
const ORDER={live:0, soon:1, past:2};
function deadline(when){
  const m=when.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})\s*[〜~]\s*(?:(\d{4})\/)?(\d{1,2})\/(\d{1,2})/);
  if(m) return new Date(+(m[4]||m[1]), +m[5]-1, +m[6]).getTime();
  const s=when.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/);
  if(s) return new Date(+s[1], +s[2]-1, +s[3]).getTime();
  return Infinity;
}
function sortSch(list){
  return list.slice().sort((a,b)=>
    ORDER[status(a.when).k]-ORDER[status(b.when).k] || deadline(a.when)-deadline(b.when));
}

function schRow(x){
  const st=status(x.when);
  return `<div class="bitem">
    <span class="btag ${st.k}">${st.t}</span>
    <div class="bmain">
      <div class="bh">${esc(x.t)}</div>
      <div class="bs">${esc(x.who||'')}</div>
      <div class="bm">${esc(x.when)}${x.amount?'　／　'+esc(x.amount):''}</div>
      ${x.note?`<div class="bb">${esc(x.note)}</div>`:''}
    </div></div>`;
}

function render(){
  const el=document.getElementById('p-ry');
  el.innerHTML=`
    <div class="bhead">
      <div><h2>留学</h2>
        <p>藝大から海外へ出るための制度と、使えるお金。</p></div>
      <a class="btn o" href="https://global.geidai.ac.jp/inter_program/study_abroad/"
         target="_blank" rel="noopener noreferrer">GEIDAI×GLOBAL を開く</a>
    </div>

    <div class="rysec">
      <h3>2つのやり方</h3>
      <div class="rygrid">
        ${SEIDO.map(s=>`<div class="rycard">
          <h4>${esc(s.t)}</h4>
          <p class="rylead">${esc(s.lead)}</p>
          <dl>${s.rows.map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
          <div class="rynote">${esc(s.note)}</div>
        </div>`).join('')}
      </div>
    </div>

    <div class="rysec">
      <h3>協定校 ${PARTNERS.reduce((s,p)=>s+p.n,0)}校・機関</h3>
      <p class="bnote">交換留学で行けるのはこの中の学校です。地域のかたよりが大きいので、
        行きたい国が決まっているならまずここを見てください。</p>
      <div class="rybars">
        ${PARTNERS.map(p=>`<div class="rybar">
          <span class="ryba">${esc(p.area)}</span>
          <span class="rybb"><i style="width:${p.n/44*100}%"></i></span>
          <span class="rybn">${p.n}</span></div>`).join('')}
      </div>
      ${PARTNERS.map(p=>`<div class="ryarea">
        <h4>${esc(p.area)}　<span>${p.n}</span></h4>
        ${p.list.map(([c,names])=>`<div class="ryrow">
          <span class="ryc">${esc(c)}</span><span class="ryn">${esc(names)}</span></div>`).join('')}
        ${p.more?`<div class="rynote">${esc(p.more)}</div>`:''}
      </div>`).join('')}
    </div>

    <div class="rysec">
      <h3>お金</h3>
      <h4 class="rysub">藝大が出すもの</h4>
      <div class="blist">${sortSch(SCH_IN).map(schRow).join('')}</div>
      <h4 class="rysub">外部の団体（大学を通して応募する）</h4>
      <div class="blist">${sortSch(SCH_UNI).map(schRow).join('')}</div>
      <h4 class="rysub">外部の団体（自分で直接応募する）</h4>
      <div class="blist">${sortSch(SCH_SELF).map(schRow).join('')}</div>
    </div>

    <div class="rysec">
      <h3>どこに聞くか</h3>
      <ul class="minfo">
        <li><b>交換留学のこと</b> → 所属の教務担当</li>
        <li><b>それ以外・奨学金</b> → 学生課 国際交流係（上野キャンパス）</li>
        <li>〒110-8714 東京都台東区上野公園12-8</li>
      </ul>
    </div>

`;
}
window.renderRyugaku=render;
})();
