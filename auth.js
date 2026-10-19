/* ============================================================
   ログインと利用規約

   いまの状態
     サーバがまだ無いので、**この端末の中だけ**で動く。
     パスワードは平文で持たず SHA-256 のハッシュだけを保存する
     （サーバに移したときと同じ形にしておくため）。
     ただしブラウザに置いてある以上、これは安全ではない。
     本番は Cloudflare Workers 側でハッシュし、ソルトを付ける。

   サーバに移すときの形（決定済み）
     Cloudflare Pages（静的・帯域無制限）＋ D1（DB）＋ Workers（API）。
     R2 は使わない。無料枠を超えると**停止せず自動課金される**唯一の製品のため。
     画像は Pages の静的アセットに含める。1人8枚まで（長辺640px・品質0.8）。
       実測：1枚 中央値41KB／平均52KB。1500人×8枚×60KB = 737MB で1GB枠に25%の余裕。

   規約に入れてある法的な要点（すべて一次資料で確認済み）
     ・消費者契約法2条2項は「事業者」に営利性を要件としていない。
       法人格のない学生団体も「その他の団体」として事業者に当たる。
       よって「一切責任を負いません」型の全部免責は8条1項で無効。
       「軽過失に限り上限◯円」＋重過失除外の明記、という形にしてある。
     ・個人情報保護法21条2項。Web登録フォームでの取得は
       「本人から直接書面に記載された個人情報を取得する場合」に当たり、
       事後の公表では足りず**登録画面上での事前明示**が要る。だから
       登録画面に利用目的を直接書いてある。
     ・27条（第三者提供）を避けるため、譲り合いで連絡先を相手に渡さない設計にしてある。
     ・古物営業法は、無償・手数料ゼロ・競り形式を採らない限り許可も届出も不要
       （警察庁通達 令和6年8月14日 丙生企発第272号）。
   ============================================================ */
(function(){
"use strict";
/* 数値や真偽値が来ても落ちないように、必ず文字列にしてから置換する */
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
const LSg=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d;}catch(e){return d;}};
const SSg=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true;}catch(e){return false;}};

const AKEY='geiday_account_v1', SKEY='geiday_session_v1';
let ACC = LSg(AKEY, null);        // {email, hash, dept, grade, agreedAt, at}
let SESSION = LSg(SKEY, null);    // {email, at}

async function sha256(t){
  const b=new TextEncoder().encode(t);
  const h=await crypto.subtle.digest('SHA-256', b);
  return [...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
const isGeidai = e => /@([a-z0-9-]+\.)*geidai\.ac\.jp$/i.test((e||'').trim());
const okMail   = e => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((e||'').trim());

/* ── 規約本文 ────────────────────────────── */
const TERMS = `
<h4>GEIDAY 利用規約</h4>
<p class="tdate">2026年8月版・試作</p>

<div class="tlead"><b>はじめにお読みください。</b>
このサイトが表示する授業・時間割・建物・公募・留学などの情報は、
大学や主催者が公開しているものを機械的に集めたもので、
<b>100%正確とはかぎりません</b>。古くなっていることも、取りこぼしもあります。
アーティスト欄の内容は、本人が自分で書いたものです。
<b>最終的な確認は、必ず大学の公式ホームページ・履修便覧・教務窓口、
および主催者の公式ページでお願いします。</b></div>

<h5>1. これは何か</h5>
<p>GEIDAY（以下「本サービス」）は、東京藝術大学の学生有志が運営する、学内向けの情報プラットフォームです。
大学の公式サービスではありません。運営は学生団体 GEIDAY（以下「当団体」）が行います。</p>

<h5>2. 使える人</h5>
<p>東京藝術大学の学生・教職員を対象とします。登録には有効なメールアドレスが必要です。</p>

<h5>3. 書き込みについて</h5>
<p>次のものは書かないでください。見つけた場合は予告なく削除します。</p>
<ul>
<li>特定の個人（教員・学生・職員を含む）の人格を否定する内容、私生活に関する内容</li>
<li>他人の氏名・連絡先・住所など、本人が公開していない情報</li>
<li>他のサイトや出版物の文章・画像の無断転載</li>
<li>売買の勧誘、金銭のやりとりを伴う取引の呼びかけ</li>
<li>法令に違反する内容、公序良俗に反する内容</li>
</ul>
<p>授業や場所についての評価は、<b>授業・場所そのものについて</b>書いてください。
担当する個人への評価としては書かないでください。</p>

<h5>4. 譲り合いについて</h5>
<p>譲り合いは<b>無償のやりとりに限ります</b>。当団体は手数料を一切受け取らず、
個別の取引には関与しません。取引の内容・受け渡し・品物の状態については、
当事者どうしで確認してください。</p>

<h5>5. 掲載情報について</h5>
<p>本サービスが表示する授業情報・建物情報・公募情報は、大学および主催者が公開している情報を
機械的に集めたものです。<b>正確性・最新性を保証しません。</b>
履修の判断は履修便覧と教務窓口で、応募の判断は主催者の公式ページで、必ず確認してください。</p>

<h5>6. 責任の範囲</h5>
<p>当団体は、本サービスの提供にあたり相当の注意を払いますが、
本サービスの利用によって利用者に生じた損害について、
<b>当団体に故意または重大な過失がある場合を除き</b>、
<b>損害賠償の額は 10,000 円を上限</b>とします。</p>
<p>当団体に故意または重大な過失がある場合には、この制限は適用されません。</p>

<h5>7. 停止・変更</h5>
<p>本サービスは試作段階にあり、予告なく内容の変更・停止・データの消去を行うことがあります。
運営は学生の任意によるものであり、継続を保証しません。</p>

<h5>8. 削除の求め</h5>
<p>自分の権利が侵害されていると考える書き込みがある場合、下記の連絡先までご連絡ください。
確認のうえ、必要な対応をとります。発信者に対して意見を照会する場合があります。</p>

<h5>9. 準拠法</h5>
<p>本規約は日本法に準拠します。</p>

<h5>10. 連絡先</h5>
<p>学生団体 GEIDAY（東京藝術大学）<br>
連絡先：本サービス内の問い合わせ、または GEIDAY の公開連絡先まで</p>
`;

const PRIVACY = `
<h4>プライバシーポリシー</h4>

<h5>1. 取得する情報</h5>
<ul>
<li>メールアドレス</li>
<li>学部・研究科／学科・専攻／学年</li>
<li>あなたが登録した時間割・お気に入り・口コミ・履修記録・プロフィール・書き込み</li>
<li>プロフィールに登録した画像</li>
</ul>

<h5>2. 何に使うか（利用目的）</h5>
<p>取得した情報は、次の目的にのみ使います。</p>
<ul>
<li>本サービスへのログインと、あなたの登録内容の保存・表示</li>
<li>学科・学年ごとの履修傾向を<b>統計として</b>表示すること
（個人が特定できない形に集計したうえで表示します）</li>
<li>不適切な書き込みへの対応</li>
<li>本サービスからの連絡</li>
</ul>
<p>これ以外の目的には使いません。広告目的での利用、外部への販売は行いません。</p>

<h5>3. 第三者への提供</h5>
<p>法令に基づく場合を除き、あなたの情報を第三者に提供しません。
譲り合いが成立した場合も、<b>連絡先を相手に渡すことはしません</b>。
やりとりは本サービス内のメッセージで行ってください。</p>

<h5>4. 公開される範囲</h5>
<p>次のものは、あなたが公開を選んだ場合にのみ、他の利用者から見えます。</p>
<ul>
<li>プロフィール（名前・学科・学年・活動・SNS・作品画像）</li>
<li>時間割（「公開する」を選んだ場合のみ）</li>
</ul>
<p>口コミは、学科と学年だけが表示され、メールアドレスや氏名は表示されません。</p>

<h5>5. 保存と削除</h5>
<p>アカウントを削除すると、あなたの登録内容は削除されます。
ただし、すでに統計として集計されたもの（個人が特定できないもの）は残ります。</p>

<h5>6. 安全管理</h5>
<p>パスワードはハッシュ化して保存し、そのままの形では保持しません。
通信は暗号化します。</p>

<h5>7. 問い合わせ</h5>
<p>ご自身の情報の開示・訂正・削除を求める場合は、本サービス内の問い合わせからご連絡ください。</p>
`;

/* 普段の画面から外した断り書きは、全部ここに集める。
   予防線を毎日の画面に置くと、使うたびに読まされて邪魔になる。
   知りたい人が1回だけ開く場所を1つ作って、そこへ寄せる。 */
const ABOUT = `
<h4>情報の出どころ</h4>

<h5>1. GEIDAY とは</h5>
<p>東京藝術大学の学生有志が運営する、学内向けの情報プラットフォームです。
大学の公式サービスではありません。</p>

<h5>2. できること・できないこと</h5>
<ul>
<li>時間割を組み、学生どうしの口コミを見る場所です。</li>
<li>履修できるかどうかの表示は、シラバスの特記事項からの<b>自動判定</b>です。大学の公式見解ではありません。</li>
<li><b>最終判断は履修便覧と教務窓口で</b>お願いします。</li>
</ul>

<h5>3. 卒業単位の判定について</h5>
<ul>
<li>判定の根拠は<b>美術学部履修案内 令和8年度（2026）だけ</b>です。</li>
<li>他科・他専攻の専門科目は、履修が認められても卒業要件単位になりません（P.4「授業科目の区分」）。</li>
<li>共通科目（教養・外国語・保健体育・専門基礎）は科・専攻を問わず開設され、卒業要件に算入されます（P.4）。</li>
<li>大学院レベルの科目は、美術学部の教育課程表に載っていないため学部の卒業要件単位になりません（P.2「Ⅰ．卒業要件単位」）。</li>
<li>音楽学部・音楽研究科・映像研究科・国際芸術創造研究科は、授業は載っていますが<b>卒業要件の判定はしていません</b>（「要確認」と表示します）。所属の履修便覧で確かめてください。</li>
</ul>

<h5>4. 時間割に出てこない授業があるのはなぜか</h5>
<ul>
<li>公開シラバスに曜日・時限が載っているのは、2026年度 4206件のうち 358件だけです。</li>
<li>工芸・油画・日本画などの実技科目は、終日の工房作業でコマに割り当てられていないため、曜日・時限が設定されていません。</li>
<li>これらは「さがす」から「時間割に足す」で、時間割の上にある<b>「曜日が決まっていない科目」</b>の枠に入れられます。</li>
<li>正確な曜日は履修便覧と授業時間割表で確かめてください。</li>
</ul>

<h5>5. 情報の出どころ（授業・教員）</h5>
<ul>
<li>授業の基本情報：東京藝術大学 教務システム CampusPlan の公開シラバス</li>
<li>詳細に出る「シラバス：」の引用元：同シラバスの「特記事項」欄および「時間割に関する注意事項」欄</li>
<li>教員一覧：同シラバスの担当教員欄（2022〜2026年度）。大学が公開している担当科目だけを載せており、評価や人物についての書き込みは置きません。</li>
<li>内容・評価方法・授業計画は、各授業の詳細から公式シラバスを開いて確認してください。</li>
</ul>

<h5>6. 地図の出どころ</h5>
<ul>
<li>建物の輪郭・高さ・階数：Project PLATEAU 3D都市モデル 台東区2024年度（国土交通省）メッシュ53394661 ／ CityGML LOD0外周線＋measuredHeight ／ CC BY 4.0</li>
<li>地面・道・緑・門：© OpenStreetMap contributors（ODbL）</li>
<li>上野以外の校地（取手・千住・横浜）：OpenStreetMap</li>
<li>建物の名称：東京藝術大学「上野校地案内図」2026年6月版</li>
<li>各階に何があるか：学生便覧2026「建物・教室等一覧」＋芸術情報センター 無線LAN AP一覧</li>
<li>一覧であって平面図ではないため、部屋の位置や広さは分かりません。階数の一部は推定値です。</li>
</ul>

<h5>7. 校地の住所</h5>
<ul>
<li>上野：〒110-8714 東京都台東区上野公園12-8</li>
<li>取手：〒302-0001 茨城県取手市小文間5000（JR取手駅 東口からバス）</li>
<li>千住：〒120-0034 東京都足立区千住1-25-1（北千住駅 徒歩8分）</li>
<li>横浜（馬車道）：〒231-0005 神奈川県横浜市中区本町4-44（馬車道駅 直結）</li>
</ul>

<h5>8. 書き込みのきまり</h5>
<ul>
<li>口コミは学生個人の主観です。</li>
<li>授業や場所<b>そのもの</b>について書いてください。担当する個人への評価としては書かないでください。</li>
<li>教員個人への人格的な批判、私生活への言及、個人が特定できる話は投稿しないでください。見つけた場合は予告なく削除します。</li>
<li>詳しくは利用規約3条をご覧ください。</li>
</ul>

<h5>9. 保存先</h5>
<p>ログインしていれば、内容はサーバに保存され、どの端末からでも同じものが出ます。
ログインしていないときは、開いている端末のブラウザの中にだけ残ります。</p>
`;

/* 公式サイト（geide1111.studio.site）の内容にそろえた紹介。
   なぜこれをやっているのか、を最初に置く。 */
const WHOWE = `
<h4>GEIDAY について</h4>

<h5>藝大を、可視化する。</h5>
<p>「Geiday」は、東京藝術大学の美術学部生によって運営される、
藝大生や受験生に向けて大学や制作に関する情報を発信するためのメディアです。
情報不足に陥りやすい藝大生活や藝大受験を支援し、
ひとりひとりの作家性・可能性の最大化を目指します。</p>

<h5>なぜこれを作っているか</h5>
<p>藝大には、調べても出てこない情報が多すぎます。
どの授業が自分の科で取れるのか。工房はいつ空いているのか。
先輩は何を取っていたのか。どこで何が展示されているのか。
どれも、知っている人には当たり前で、知らない人には一生わからないままです。</p>
<p>その差は、たまたま誰と知り合ったかで決まってしまいます。
それを、入学した日から全員が同じだけ見られるようにしたい、というのがこのサイトです。</p>

<h5>このプラットフォームでできること</h5>
<ul>
<li><b>さがす・時間割</b>　公開シラバスの全4206件から、自分の所属で取れるものを絞って組む</li>
<li><b>口コミ</b>　学科と学年つきで、実際に受けた人の話を読む</li>
<li><b>校内地図</b>　建物の中に何階まで何があるかを見る</li>
<li><b>アーティスト</b>　学内の人が何を作っているかを知る</li>
<li><b>予約・展示・講評・譲り合い・公募・留学</b>　散らばっている情報を1か所に</li>
</ul>

<h5>だれが運営しているか</h5>
<p>東京藝術大学美術学部の学生有志です。<b>大学の公式サービスではありません。</b>
メンバーはおもに藝大デザイン科の学生で構成されています。
履修登録、機材・施設、受験、就活の話など、
学生や受験生が本当に必要としている情報を、学生目線でお届けします。</p>

<h5>連絡先</h5>
<p>知りたいことや、書いてほしい記事があれば、お気軽にご質問ください。
運営メンバーも随時募集中です。<br>
gggeideza@gmail.com<br>
<a href="https://geide1111.studio.site/" target="_blank" rel="noopener noreferrer">geide1111.studio.site</a></p>
`;

/* 出す文書は2つだけにした。
   ・GEIDAY について … なぜやっているか ＋ 情報の出どころ（旧「このサイトについて」を合流）
   ・きまり           … 利用規約 ＋ プライバシーポリシー
   プライバシーは、見出しを分けたうえで同じページに置いている。
   個人情報保護法21条2項が求めるのは「利用目的を事前に明示すること」で、
   別ファイルであることまでは求めていない。見出しで分かれていれば足りる。 */
const DOC = { about:(WHOWE + ABOUT), rules:(TERMS + PRIVACY) };

/* ── 画面 ────────────────────────────────── */
let showDoc=null;
/* 問い合わせの書きかけ。画面は説明ページの開閉や所属の変更で描き直されるので、
   input の中身をここに預けておかないと、書いている途中で黙って消える。 */
let cDraft={sub:'',body:''};


/* SNSの入力を、どう書かれても同じIDに揃える。
   IDだけ書く人、@付きで書く人、自分のページのURLを丸ごと貼る人がいる。
   どれでも通るようにしておかないと、リンクが壊れたまま公開される。

     kouki_9898
     @kouki_9898
     https://www.instagram.com/kouki_9898/
     instagram.com/kouki_9898?igsh=abc
     https://x.com/geiday_
     https://www.tiktok.com/@geiday
   → いずれも  kouki_9898 / geiday_ / geiday                       */
function snsId(v){
  let s = String(v||'').trim();
  if(!s) return '';
  s = s.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
  /* URLとして貼られていたら、ドメインを落として最初の区切りまでを取る */
  if(/^(instagram\.com|x\.com|twitter\.com|tiktok\.com|youtube\.com)\//i.test(s)){
    s = s.split('/').slice(1).join('/');
  }
  s = s.split(/[?#]/)[0];              // ?igsh=... のような追跡パラメータを捨てる
  s = s.split('/').filter(Boolean)[0] || '';   // 末尾スラッシュや下層パスを落とす
  return s.replace(/^@/, '').slice(0, 40);
}

/* ── 所属 ────────────────────────────────
   ヘッダのセレクトを外したので、所属を決めるのはここだけになった。
   ログインしていなくても使える。所属は「このサイトの半分を動かすスイッチ」で、
   ログインの有無とは別の話だから。

   選んだ瞬間に効かせる。「保存」を押させない。押し忘れたまま
   「取れない授業が消えない」と思われるほうが損。 */
/* 所属は、はじめる画面ではなくプロフィールの中で聞く。
   初めて来た人に見せる順番は「入る」→「名乗る」であって、
   入る前に学部を選ばせると、まだ何も見ていない人に作業をさせることになる。
   ほかの入力欄と同じ見た目で、3つを1行に並べる。 */
function meFields(){
  const O = (typeof window.__meOptions==='function') ? window.__meOptions() : null;
  const M = (typeof ME!=='undefined') ? ME : {fac:'',dept:'',grade:''};
  if(!O) return '';
  const gname = O.gname || (g=>g);
  const cur = k => (ACC && ACC[k]) || M[k] || '';
  const opt=(arr,c,lab,fmt)=>arr.map(v=>
    `<option value="${esc(v)}"${String(v)===String(c||'')?' selected':''}>${esc(v?(fmt?fmt(v):v):lab)}</option>`).join('');
  return `<div class="pme">
    <label>学部・研究科<select id="me-fac">${opt(O.FACULTIES,cur('fac'),'選ぶ')}</select></label>
    <label>学科・専攻<select id="me-dept">${opt(O.DEPTS,cur('dept'),'選ぶ')}</select></label>
    <label>学年<select id="me-grade">${opt(O.GRADES,cur('grade'),'選ぶ',gname)}</select></label>
  </div>`;
}
/* 所属を変えたら、見出しに出ている「メール／学科 学年」の行だけ直す。
   画面ごと描き直すと、書きかけのプロフィール文が消える。 */
function paintMeNow(){
  const p=document.querySelector('#p-acc .bhead p');
  if(!p || !ACC) return;
  const M=(typeof ME!=='undefined')?ME:{dept:'',grade:''};
  const dept=ACC.dept||M.dept||'', grade=ACC.grade||M.grade||'';
  p.innerHTML=`${esc(ACC.email)}　${esc(dept)}${
    grade?' '+(typeof gname==='function'?gname(grade):grade+'年'):''}
    ${isGeidai(ACC.email)?'<span class="okmail">学内メール</span>':''}`;
}
function bindMe(){
  [['me-fac','fac'],['me-dept','dept'],['me-grade','grade']].forEach(([id,k])=>{
    const el=document.getElementById(id); if(!el) return;
    el.onchange=e=>{
      if(typeof window.__setMe==='function') window.__setMe({[k]:e.target.value});
      /* ここまでは「サイトの設定」だけを直していた。
         だがアーティストのページに出る学科・学年はアカウント側（ACC）を見る。
         片方しか書いていなかったので、デザイン科3年と選んでも
         自分のカードには何も出ないままだった。両方に書く。 */
      if(ACC){
        if(k==='fac')   ACC.fac=e.target.value;
        if(k==='dept')  ACC.dept=e.target.value;
        if(k==='grade') ACC.grade=e.target.value;
        SSg(AKEY,ACC);
        if(typeof GAPI!=='undefined' && SESSION && !ACC.localOnly){
          GAPI.saveMe({ fac:ACC.fac||'', dept:ACC.dept||'', grade:ACC.grade||'' })
              .catch(()=>{});
        }
        if(typeof renderArtists==='function' && document.getElementById('p-art')) renderArtists();
      }
      /* ここで render() を呼ぶと、同じ画面にある書きかけの
         プロフィールや問い合わせ文が消える。見出しの1行だけ書き換える。 */
      paintMeNow();
    };
  });
}

function render(){
  const el=document.getElementById('p-acc');
  if(!el) return;
  if(SESSION && ACC){
    const P = ACC.profile || {};
    el.innerHTML=`
      <div class="bhead"><div><h2>アカウント</h2>
        <p>${esc(ACC.email)}　${esc(ACC.dept||'')}${ACC.grade?' '+(typeof gname==='function'?gname(ACC.grade):ACC.grade+'年'):''}
          ${isGeidai(ACC.email)?'<span class="okmail">学内メール</span>':''}</p></div>
        <button class="btn" id="a-out">ログアウト</button>
      </div>

      <!-- プロフィールは、所属のブロックと同じ「青い面」の作りに揃える。
           聞くことも減らした。扱っているもの／やっていること／探していることの
           3つは、書く人にとっては同じ話なので、1つの文にまとめた（200字）。 -->
      <div class="mesec pprof">
        <b class="menow">プロフィール</b>
        <label class="pshow"><input type="checkbox" id="pf-pub" ${P.pub?'checked':''}>
          アーティスト欄に表示する</label>
      </div>

      <div class="psec">
        <div class="pgrid">
          <div class="pav">
            <img id="pf-avimg" src="${P.face||blankAvatar()}" alt="">
            <label class="pbtn" id="pf-facebtn">画像を選ぶ
              <input type="file" id="pf-face" accept="image/*" hidden></label>
            <button class="plink" id="pf-faceclr" style="${P.face?'':'display:none'}">消す</button>
          </div>
          <div class="pfields">
            <label>表示名<input id="pf-name" maxlength="24" value="${esc(P.name||'')}"
              placeholder="本名でなくてかまいません"></label>
            ${meFields()}
            <label>プロフィール
              <textarea id="pf-doing" maxlength="200"
                placeholder="何を作っているか、いま何を探しているか。">${esc(P.doing||'')}</textarea>
              <span class="pcount" id="c-doing"></span></label>
            <div class="psns">
              <label>Instagram<input id="pf-ig" maxlength="40" value="${esc(P.ig||'')}" placeholder="IDでもURLでも"></label>
              <label>X<input id="pf-x" maxlength="40" value="${esc(P.x||'')}" placeholder="IDでもURLでも"></label>
              <label>TikTok<input id="pf-tt" maxlength="40" value="${esc(P.tt||'')}" placeholder="IDでもURLでも"></label>
            </div>
          </div>
        </div>

        <div class="pworks">
          <div class="pwh">作品　<span id="pf-wcount"></span></div>
          <div class="pwgrid" id="pf-wgrid"></div>
        </div>

        <div class="aacts"><button class="btn o" id="pf-save">保存する</button>
          <span class="psaved ok" id="pf-saved">保存済み</span></div>
      </div>

      <div class="psec">
        <h3>データの管理</h3>
        <div class="aacts">
          <button class="btn" id="a-admin">管理画面をひらく</button>
          <button class="btn" id="a-del">アカウントを消す</button>
        </div>
      </div>

      <div class="psec">
        <h3>運営に連絡する</h3>
        <div class="cform">
          <label>件名<input id="c-sub" maxlength="60" value="${esc(cDraft.sub)}"
            placeholder="例）このページの表示がおかしい"></label>
          <label class="cfull">内容
            <textarea id="c-body" maxlength="2000"
              placeholder="困っていること、直してほしいところ、載せてほしい情報など。&#10;返事はご登録のメールアドレスにお送りします。">${esc(cDraft.body)}</textarea></label>
          <div class="aacts"><button class="btn o" id="c-go">送る</button>
            <span class="psaved" id="c-st"></span></div>
        </div>
      </div>

      <div class="docs">
        <button class="tbtn" data-doc="about">GEIDAY について</button>
        <button class="tbtn" data-doc="rules">利用規約・プライバシー</button>
      </div>
      ${showDoc?`<div class="docbody">${DOC[showDoc]||''}</div>`:''}`;

    bindProfile();
    document.getElementById('a-out').onclick=async()=>{
      try{ await GAPI.logout(); }catch(e){}
      SESSION=null; SSg(SKEY,null); render(); paint();
    };
    document.getElementById('a-del').onclick=async()=>{
      if(!confirm('アカウントと、保存した内容をすべて消します。取り消せません。よろしいですか？')) return;
      try{ await GAPI.deleteMe(); }catch(e){}
      ACC=null; SESSION=null; SSg(AKEY,null); SSg(SKEY,null); render(); paint();
      toast('アカウントを消しました。');
    };
    document.getElementById('a-admin').onclick=()=>openAdmin();

    const cs0=document.getElementById('c-sub'), cb0=document.getElementById('c-body');
    if(cs0) cs0.addEventListener('input',()=>{ cDraft.sub=cs0.value; });
    if(cb0) cb0.addEventListener('input',()=>{ cDraft.body=cb0.value; });
    const cg=document.getElementById('c-go');
    if(cg) cg.onclick=async()=>{
      const sub=document.getElementById('c-sub').value.trim();
      const body=document.getElementById('c-body').value.trim();
      if(!body){ toast('内容を書いてください。','err');
                 document.getElementById('c-body').focus(); return; }
      busy(cg,true,'送っています…');
      try{
        await GAPI.contact({subject:sub, body});
        cDraft={sub:'',body:''};
        document.getElementById('c-sub').value='';
        document.getElementById('c-body').value='';
        document.getElementById('c-st').textContent='送りました';
        document.getElementById('c-st').className='psaved ok';
        toast('運営に送りました。');
      }catch(e){
        toast(e.message==='offline'
          ? 'サーバにつながりません。しばらくしてからお試しください。'
          : (e.message||'送れませんでした。'), 'err');
      }finally{ busy(cg,false); }
    };
  } else {
    /* ログインはボタン1つ。
       6桁コードの入力はやめた。理由は2つある。
         1. 藝大のメールは全部Google（MXが ASPMX.L.GOOGLE.COM）。
            全員すでにアカウントを持っているので、コードを待たせる意味がない。
         2. 無料のメール送信では、差出人が知らないドメインに書き換えられ、
            一定の割合で届かない。届かなければ入れない。
       操作は少ないほどいい。 */
    const off = (typeof GAPI!=='undefined') && GAPI.online===false;
    el.innerHTML=`
      <div class="alogin">
        <h2>はじめる</h2>

        <!-- ここに置くのは入口の1つだけ。学部・学科・学年は入ったあと、
             プロフィールの中で聞く。 -->
        ${off ? `<div class="aoff">
          <b>いまサーバにつながっていません。</b>
          書いたものはこの端末に残り、つながったときに送られます。</div>`
        : `<div class="asub">
             <p>藝大のメールアドレスで入れます。</p>
             <a class="gbtn" href="/api/auth/google/start">
               <svg viewBox="0 0 48 48" width="19" height="19" aria-hidden="true">
                 <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-2.8-.4-4.1H24v7.4h12.1c-.2 1.9-1.6 4.9-4.5 6.9l-.1.3 6.5 5 .5.1c4.1-3.8 6.6-9.5 6.6-15.6"/>
                 <path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.3l-6.9-5.4c-1.9 1.3-4.4 2.2-7.6 2.2-5.8 0-10.7-3.8-12.5-9.1l-.3.1-6.7 5.2-.1.3C7.9 41.1 15.3 46 24 46"/>
                 <path fill="#FBBC05" d="M11.5 28.4c-.5-1.4-.7-2.9-.7-4.4s.3-3 .7-4.4v-.3l-6.8-5.3-.2.1C2.9 17 2 20.4 2 24s.9 7 2.5 9.9z"/>
                 <path fill="#EA4335" d="M24 9.5c4.1 0 6.9 1.8 8.5 3.3l6.2-6C34.9 3.4 29.9 1 24 1 15.3 1 7.9 5.9 4.5 13.1l7 5.4C13.3 13.3 18.2 9.5 24 9.5"/>
               </svg>
               藝大アカウントで入る
             </a>
           </div>`}

        <p class="afine">
          <button class="lnk" data-doc="about">GEIDAY について</button><button
            class="lnk" data-doc="rules">利用規約・プライバシー</button>
        </p>

        ${showDoc?`<div class="docbody">${DOC[showDoc]||''}</div>`:''}
      </div>`;
  }
  bindMe();
  document.querySelectorAll('#p-acc [data-doc]').forEach(b=>b.onclick=e=>{
    e.preventDefault();
    showDoc = showDoc===b.dataset.doc ? null : b.dataset.doc;
    render();
    const d=document.querySelector('.docbody'); if(d) d.scrollIntoView({block:'nearest'});
  });
}

/* 所属をサイト全体の設定に反映する。
   ここで画面のセレクトも書き換えないと、登録で「デザイン 3年」と
   答えたのにヘッダの所属が空のまま、という食い違いが残る。 */
function applyMe(dept, grade){
  if(typeof ME==='undefined') return;
  ME.dept=dept; ME.grade=String(grade); ME.fac=ME.fac||'美術学部';
  try{ localStorage.setItem('geidai_me_v1', JSON.stringify(ME)); }catch(e){}
  if(typeof window.__syncMe==='function') window.__syncMe();
}

/* ヘッダにログイン中の表示は置かなくなった（ヘッダはロゴだけ）。
   ログインしているかどうかはアカウントのタブを開けば分かる。
   外から呼ばれるので、名前だけ残して何もしない。 */
function paint(){
  /* 帯のログインボタンの出し入れだけ。入っていれば消える。 */
  if(typeof window.__paintLogin==='function') window.__paintLogin();
}


/* ── プロフィール ──────────────────────────
   画像の取り込みで前は次のことをしていて、それが遅さの原因だった。
     FileReader.readAsDataURL でファイル全体を base64 の文字列にする
     → 8MBの写真が約11MBの文字列になる
     → その文字列を new Image() の src にして、もう一度デコードさせる
   いまは URL.createObjectURL でファイルをそのまま参照し、
   createImageBitmap（無ければ Image）でデコードする。文字列化は一度もしない。
   ============================================================ */
const MAXSRC = 8*1024*1024;

function blankAvatar(){
  return 'data:image/svg+xml;utf8,'+encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill=\"#EAF0FB\"/>'+
    '<circle cx="50" cy="40" r="17" fill=\"#C9D3E8\"/><path d="M18 92a32 32 0 0 1 64 0z" fill=\"#C9D3E8\"/></svg>');
}
function toast(msg, kind){
  let t=document.getElementById('gtoast');
  if(!t){ t=document.createElement('div'); t.id='gtoast'; document.body.appendChild(t); }
  t.className='gtoast '+(kind||'')+' show';
  t.textContent=msg;
  clearTimeout(t._h);
  t._h=setTimeout(()=>{ t.classList.remove('show'); }, kind==='err'?4200:2200);
}
function busy(el, on, label){
  if(!el) return;
  if(on){ el.dataset.prev=el.dataset.prev||el.innerHTML;
    el.classList.add('isbusy'); el.innerHTML='<span class="spin"></span>'+(label||'処理しています…'); }
  else { el.classList.remove('isbusy'); if(el.dataset.prev){ el.innerHTML=el.dataset.prev; delete el.dataset.prev; } }
}

/* ファイル → 長辺640pxのJPEG(dataURL)。重い処理は1回だけ。 */
/* 用途で縮め方を変える。
   顔       … 一覧の主役なので今の質のまま（長辺640・q0.8）
   作品     … 拡大表示は無い。出る幅は最大でも300px程度なので、
              長辺480・q0.55 まで落とす。1枚 70〜90KB → 15〜25KB。
   掲示板   … 品物や展示の写真。中間（長辺640・q0.65）。 */
const SHRINK = {
  face: {max:640, q:0.8},
  work: {max:480, q:0.55},
  post: {max:640, q:0.65},
};
async function shrink(file, kind){
  const K = SHRINK[kind] || SHRINK.face;
  return shrinkTo(file, K.max, K.q);
}
async function shrinkTo(file, MAXPX, Q){
  if(!/^image\//.test(file.type) && !/\.(jpe?g|png|webp|heic|gif)$/i.test(file.name||''))
    throw new Error('画像ファイルを選んでください。');
  if(file.size > MAXSRC)
    throw new Error(`画像が大きすぎます（${(file.size/1048576).toFixed(1)}MB）。8MB以下にしてください。`);

  let bmp=null, url=null;
  try{
    if('createImageBitmap' in window){
      bmp = await createImageBitmap(file);          // 文字列を作らずに直接デコード
    } else {
      url = URL.createObjectURL(file);
      bmp = await new Promise((res,rej)=>{
        const im=new Image(); im.onload=()=>res(im);
        im.onerror=()=>rej(new Error('この画像は読めませんでした。')); im.src=url;
      });
    }
    const w = bmp.width||bmp.naturalWidth, h = bmp.height||bmp.naturalHeight;
    if(!w||!h) throw new Error('この画像は読めませんでした。');
    const sc=Math.min(1, MAXPX/Math.max(w,h));
    const c=document.createElement('canvas');
    c.width=Math.max(1,Math.round(w*sc)); c.height=Math.max(1,Math.round(h*sc));
    const x=c.getContext('2d');
    x.imageSmoothingEnabled=true; x.imageSmoothingQuality='high';  // 既定のlowだと2割大きくなる
    x.drawImage(bmp,0,0,c.width,c.height);
    return c.toDataURL('image/jpeg',Q);
  } finally {
    if(bmp && bmp.close) bmp.close();
    if(url) URL.revokeObjectURL(url);
  }
}

/* 保存はここだけ。容量あふれを握りつぶさない。 */
function persist(){
  try{ localStorage.setItem(AKEY, JSON.stringify(ACC)); return true; }
  catch(e){
    toast('保存できませんでした。画像の枚数を減らしてください。','err');
    return false;
  }
}

function bindProfile(){
  const P = ACC.profile = ACC.profile || {};
  const g=id=>document.getElementById(id);

  /* 文字数カウンタ */
  const cnt=(src,dst,max)=>{ const e=g(src),d=g(dst);
    if(!e||!d) return; const f=()=>{ d.textContent=`${e.value.length}／${max}`;
      d.classList.toggle('over', e.value.length>=max); }; e.addEventListener('input',f); f(); };
  cnt('pf-doing','c-doing',200);

  /* 文字の欄は打つたびに自動保存する。押し忘れで消えるのが一番困る。 */
  const auto=['pf-name','pf-doing','pf-ig','pf-x','pf-tt'];
  let th=null;
  auto.forEach(id=>{ const e=g(id); if(!e) return;
    e.addEventListener('input',()=>{ clearTimeout(th); markDirty();
      th=setTimeout(()=>collect(true), 700); }); });

  /* 表示トグルは押した瞬間に保存する。タブを移ると消えるのを防ぐ。 */
  const pub=g('pf-pub');
  if(pub) pub.addEventListener('change',()=>{
    if(pub.checked && !g('pf-name').value.trim()){
      pub.checked=false; toast('表示するには、まず表示名を入れてください。','err'); return; }
    collect(true);
    toast(pub.checked?'アーティスト欄に表示します':'アーティスト欄から外しました');
    if(typeof renderArtists==='function') renderArtists();
  });

  /* プロフィール画像 */
  const face=g('pf-face');
  if(face) face.addEventListener('change', async e=>{
    const f=e.target.files[0]; e.target.value='';
    if(!f) return;
    const lab=g('pf-facebtn'); busy(lab,true,'読み込み中…');
    try{
      const d=await shrink(f);
      P.face=d;
      const img=g('pf-avimg'); if(img) img.src=d;          // 画面だけ差し替える。全部を描き直さない
      collect(true); toast('プロフィール画像を保存しました');
      const clr=g('pf-faceclr'); if(clr) clr.style.display='';
    }catch(err){ toast(err.message,'err'); }
    finally{ busy(lab,false); }
  });
  const fc=g('pf-faceclr');
  if(fc) fc.addEventListener('click',()=>{
    P.face=''; const img=g('pf-avimg'); if(img) img.src=blankAvatar();
    fc.style.display='none'; collect(true); toast('プロフィール画像を消しました');
  });

  /* 作品画像 */
  const w=g('pf-work');
  if(w) w.addEventListener('change', async e=>{
    const f=e.target.files[0]; e.target.value='';
    if(!f) return;
    if((P.works||[]).length>=3){ toast('作品は3枚までです。','err'); return; }
    const lab=g('pf-workbtn'); busy(lab,true,'読み込み中…');
    try{
      const d=await shrink(f,'work');
      (P.works=P.works||[]).push({t:'',img:d});
      if(collect(true)){ toast('作品を追加しました'); renderWorks(); }
      else { P.works.pop(); }
    }catch(err){ toast(err.message,'err'); }
    finally{ busy(lab,false); }
  });
  renderWorks();
  const sv=g('pf-save');
  if(sv) sv.addEventListener('click',()=>{ if(collect(false)) toast('プロフィールを保存しました'); });
}

/* 作品の並びだけを描き直す */
function renderWorks(){
  const P=ACC.profile||{}, box=document.getElementById('pf-wgrid');
  if(!box) return;
  box.innerHTML = (P.works||[]).map((w,i)=>`<figure>
      <img src="${w.img}" alt="">
      <input class="pwt" data-i="${i}" maxlength="24" value="${esc(w.t||'')}" placeholder="題名">
      <button class="plink pwdel" data-i="${i}">消す</button></figure>`).join('')
    + ((P.works||[]).length<3
      ? `<label class="pwadd" id="pf-workbtn">＋ 作品を追加
          <input type="file" id="pf-work" accept="image/*" hidden></label>` : '');
  const c=document.getElementById('pf-wcount');
  if(c) c.textContent=`${(P.works||[]).length}／3枚`;
  box.querySelectorAll('.pwdel').forEach(b=>b.onclick=()=>{
    P.works.splice(Number(b.dataset.i),1); collect(true); renderWorks(); toast('作品を消しました'); });
  box.querySelectorAll('.pwt').forEach(i=>i.addEventListener('input',()=>{
    if(P.works[Number(i.dataset.i)]) P.works[Number(i.dataset.i)].t=i.value.trim();
    markDirty(); clearTimeout(renderWorks._t);
    renderWorks._t=setTimeout(()=>collect(true),700); }));
  /* 追加ボタンを付け直したので、changeを繋ぎ直す */
  const w=document.getElementById('pf-work');
  if(w){
    const face=document.getElementById('pf-face');
    w.addEventListener('change', async e=>{
      const f=e.target.files[0]; e.target.value=''; if(!f) return;
      const lab=document.getElementById('pf-workbtn'); busy(lab,true,'読み込み中…');
      try{
        const d=await shrink(f,'work');
        (P.works=P.works||[]).push({t:'',img:d});
        if(collect(true)){ toast('作品を追加しました'); renderWorks(); } else { P.works.pop(); }
      }catch(err){ toast(err.message,'err'); } finally{ busy(lab,false); }
    });
  }
}

let dirty=false;
function markDirty(){
  dirty=true;
  const s=document.getElementById('pf-saved');
  if(s){ s.textContent='未保存'; s.className='psaved dirty'; }
}
/* 画面の値を ACC に集めて保存する。silent なら控えめに知らせる。 */
function collect(silent){
  const P = ACC.profile = ACC.profile || {};
  const g=id=>document.getElementById(id);
  if(g('pf-name')){
    P.name=g('pf-name').value.trim();
    /* 扱っているもの・やっていること・探していることは1つの文にまとめた。
       古い保存に media/want が残っていても、表示は doing だけを見る。 */
    P.doing=g('pf-doing').value.trim();
    P.ig=snsId(g('pf-ig').value);
    P.x =snsId(g('pf-x').value);
    P.tt=snsId(g('pf-tt').value);
    P.pub=!!(g('pf-pub')&&g('pf-pub').checked);
  }
  if(P.pub && !P.name){ P.pub=false; if(g('pf-pub')) g('pf-pub').checked=false; }
  if(!persist()) return false;
  dirty=false;
  /* サーバにも送る。届かなければ api.js が貯めて、次に通じたときに送る。 */
  if(typeof GAPI!=='undefined' && SESSION && !(ACC&&ACC.localOnly)){
    clearTimeout(collect._t);
    collect._t=setTimeout(()=>{
      /* 所属はサイトの設定（ME）を控えとして使う。空で送ると、
         サーバに入っている学科・学年をこちらから消してしまう。 */
      const M=(typeof ME!=='undefined')?ME:{fac:'',dept:'',grade:''};
      GAPI.saveMe({ fac:ACC.fac||M.fac||'',
                    dept:ACC.dept||M.dept||'', grade:ACC.grade||M.grade||'',
                    profile:ACC.profile||{} }).catch(()=>{});
    }, 1200);
  }
  const s=g('pf-saved');
  if(s){ s.textContent=silent?'保存済み':'保存しました'; s.className='psaved ok';
    clearTimeout(s._h); s._h=setTimeout(()=>{ if(!dirty){ s.textContent='保存済み'; } },2400); }
  if(typeof renderArtists==='function' && document.getElementById('p-art')) renderArtists();
  return true;
}
/* 離れる前に取りこぼしを拾う */
window.addEventListener('beforeunload',()=>{ if(dirty) collect(true); });

/* ── 管理画面 ────────────────────────────
   保存されている内容を1枚のHTMLにまとめて別窓で開く。
   本番でサーバに載せたら、ここが運営側の管理画面になる。 */
const STORES=[
  ['geiday_account_v1','アカウントとプロフィール'],
  ['geidai_me_v1','所属の設定'],
  ['geidai_ttgrade_v1','いま見ている学年'],
  ['geidai_tt_v1','時間割'],
  ['geidai_favs_v1','お気に入り'],
  ['geidai_reviews_v2','自分が書いた口コミ'],
  ['geidai_records_v1','自分が登録した履修記録'],
  ['geidai_board_v1','建物への書き込み'],
  ['geidai_exhib_v1','展示の投稿'],
  ['geidai_kouhyo_v1','講評の投稿'],
  ['geidai_give_v1','譲り合いの投稿'],
  ['geidai_kobo_v1','公募の投稿'],
  ['geidai_follow_v1','フォロー'],
];
function snapshot(){
  const rows=[];
  for(const [k,label] of STORES){
    const raw=localStorage.getItem(k);
    let v=null; try{ v=raw?JSON.parse(raw):null; }catch(e){ v=raw; }
    let n=0;
    if(Array.isArray(v)) n=v.length;
    else if(v && typeof v==='object'){
      const vals=Object.values(v);
      n = vals.length && vals.every(Array.isArray) ? vals.reduce((s,a)=>s+a.length,0) : Object.keys(v).length;
    } else if(v!=null) n=1;
    rows.push({key:k,label,n,size:raw?raw.length:0,value:v});
  }
  return rows;
}
function openAdmin(){
  const rows=snapshot();
  const total=rows.reduce((s,r)=>s+r.size,0);
  const cell=v=>{
    if(v==null) return '<span class="z">—</span>';
    let t=JSON.stringify(v,null,1);
    /* 画像のデータURLは長すぎるので畳む */
    t=t.replace(/"data:image\/[a-z+]+;base64,[^"]{40,}"/g,'"（画像データ）"');
    return '<pre>'+t.replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]))+'</pre>';
  };
  const html=`<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8">
<title>GEIDAY 管理画面</title><style>
.srv{margin-top:34px;border-top:2px solid #093FB4;padding-top:20px}
.srv h2{color:#093FB4;font-size:18px;margin-bottom:12px}
.srv h3{font-size:14px;margin:22px 0 8px;color:#333}
.cards{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:8px}
.cards .c{border:1px solid #C9D3E8;border-radius:4px;padding:9px 15px;font-size:11px;color:#4A5668}
.cards .c b{display:block;font-size:21px;color:#093FB4;font-variant-numeric:tabular-nums}
.cards .c.hot{border-color:#FF5035} .cards .c.hot b{color:#FF5035}
.srv table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:6px}
.srv th{text-align:left;background:#F4F7FD;color:#4A5668;font-size:10.5px;
  padding:6px 8px;border-bottom:1px solid #C9D3E8;white-space:nowrap}
.srv td{padding:6px 8px;border-bottom:1px solid #EAF0FB;vertical-align:top;line-height:1.7}
.srv tr.done{opacity:.45}
.srv .z{color:#616B7B}

:root{--paper:#FFFFFF;--ink:#093FB4;--orange:#FF5035;--rule:#C9D3E8;--sub:#4A5668;--faint:#616B7B;--card:#fff;--text:#1A1A1A}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--paper);color:var(--ink);font-family:"Hiragino Kaku Gothic ProN","Yu Gothic",sans-serif;
  font-size:13px;line-height:1.7;padding:26px 30px 60px;font-feature-settings:"palt"}
h1{font-size:21px;font-weight:700;letter-spacing:.08em}
.sub{font-size:11.5px;color:var(--faint);margin:4px 0 18px}
.sum{display:flex;gap:26px;flex-wrap:wrap;border:1px solid var(--rule);background:var(--card);
  padding:14px 18px;border-radius:3px;margin-bottom:18px}
.sum div span{display:block;font-size:10px;letter-spacing:.18em;color:var(--faint);font-weight:800}
.sum div b{font-size:22px;color:var(--orange);font-variant-numeric:tabular-nums}
.acts{display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap}
button{font:inherit;font-size:12px;border:1px solid var(--ink);background:var(--card);color:var(--ink);
  padding:6px 14px;border-radius:2px;cursor:pointer}
button:hover{background:var(--ink);color:var(--paper)}
section{border:1px solid var(--rule);background:var(--card);border-radius:3px;margin-bottom:11px}
h2{font-size:13.5px;font-weight:700;padding:11px 16px;display:flex;gap:12px;align-items:baseline;
  cursor:pointer;justify-content:space-between}
h2 em{font-style:normal;font-size:10.5px;color:var(--faint);font-family:SFMono-Regular,Menlo,monospace}
h2 .b{font-size:11.5px;color:var(--orange);font-variant-numeric:tabular-nums;font-weight:700}
.body{padding:0 16px 14px;display:none}
section.open .body{display:block}
section.zero h2{opacity:.45}
pre{background:var(--paper);border:1px solid var(--rule);border-radius:2px;padding:10px 12px;
  font-size:11px;line-height:1.65;overflow-x:auto;max-height:420px;white-space:pre-wrap;
  word-break:break-all;font-family:SFMono-Regular,Menlo,monospace}
.z{color:var(--faint)}
.note{font-size:10.5px;color:var(--faint);line-height:1.9;margin-top:20px;border-top:1px solid var(--rule);
  padding-top:12px}
</style></head><body>
<h1>GEIDAY 管理画面</h1>
<div class="sub">この端末（ブラウザ）に保存されている内容をそのまま出しています。
生成日時 ${new Date().toLocaleString('ja-JP')}</div>
<div class="sum">
  <div><span>種類</span><b>${rows.filter(r=>r.n).length}</b></div>
  <div><span>件数の合計</span><b>${rows.reduce((s,r)=>s+r.n,0)}</b></div>
  <div><span>容量</span><b>${(total/1024).toFixed(1)}<small style="font-size:12px"> KB</small></b></div>
  <div><span>アカウント</span><b style="font-size:14px">${rows[0].value?rows[0].value.email:'未登録'}</b></div>
</div>
<div class="acts">
  <button onclick="document.querySelectorAll('section').forEach(s=>s.classList.add('open'))">全部ひらく</button>
  <button onclick="document.querySelectorAll('section').forEach(s=>s.classList.remove('open'))">全部とじる</button>
  <button onclick="dl('json')">JSONで書き出す</button>
  <button onclick="dl('csv')">CSVで書き出す</button>
</div>
${rows.map(r=>`<section class="${r.n?'':'zero'}">
  <h2 onclick="this.parentNode.classList.toggle('open')">
    <span>${r.label}<em>　${r.key}</em></span>
    <span class="b">${r.n?r.n+'件':'なし'}　${r.size?(r.size/1024).toFixed(1)+' KB':''}</span></h2>
  <div class="body">${cell(r.value)}</div></section>`).join('')}
<div class="note">
これは試作段階の画面です。いまはこの端末の中のデータだけを見ています。<br>
サーバ（Cloudflare Pages＋D1＋Workers）に載せたら、ここが運営側の管理画面になります。<br>
画像のデータは長いので「（画像データ）」と畳んで表示しています。書き出したファイルには入っています。
</div>
<script>
const DATA=${JSON.stringify(Object.fromEntries(rows.map(r=>[r.key,r.value])))};
const ROWS=${JSON.stringify(rows.map(r=>({key:r.key,label:r.label,n:r.n,size:r.size})))};
function dl(kind){
  let blob,name;
  if(kind==='json'){ blob=new Blob([JSON.stringify(DATA,null,1)],{type:'application/json'}); name='geiday_data.json'; }
  else{
    const rs=[['項目','キー','件数','容量(byte)','中身']];
    ROWS.forEach(r=>rs.push([r.label,r.key,r.n,r.size,JSON.stringify(DATA[r.key])]));
    const csv='\uFEFF'+rs.map(r=>r.map(c=>'"'+String(c==null?'':c).replace(/"/g,'""')+'"').join(',')).join('\r\n');
    blob=new Blob([csv],{type:'text/csv'}); name='geiday_data.csv';
  }
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),4000);
}
document.querySelector('section').classList.add('open');
<\/script>
<div id="srv" class="srv"><h2>サーバ</h2><p class="z">読み込んでいます…</p></div>
</body></html>`;
  const w=window.open('','geiday_admin');
  if(!w){ toast('別窓を開けませんでした。ポップアップの許可を確認してください。','err'); return; }
  w.document.open(); w.document.write(html); w.document.close();

  /* サーバがあれば、加入している人と運営あての連絡も出す。
     ここは運営（ADMIN_EMAILS に入っている人）だけが取れる。 */
  GAPI.admin().then(r=>{
    const esc2=x=>String(x==null?'':x).replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]));
    const d=new Date(0);
    const dt=t=>{ if(!t) return '—'; d.setTime(t);
      return d.toLocaleString('ja-JP',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}); };
    const st=r.stats||{};
    const users=(r.users||[]).map(u=>`<tr>
        <td>${esc2(u.email)}</td><td>${esc2(u.name||'')}</td>
        <td>${esc2(u.dept||'')} ${esc2(u.grade||'')}</td>
        <td>${u.pub?'公開':'—'}</td>
        <td>${dt(u.created_at)}</td><td>${dt(u.last_seen)}</td></tr>`).join('');
    const msgs=(r.messages||[]).map(m0=>`<tr class="${m0.handled?'done':''}">
        <td>${dt(m0.created_at)}</td><td>${esc2(m0.kind)}</td>
        <td>${esc2(m0.email||'')}</td>
        <td><b>${esc2(m0.target_id||'')}</b><br>${esc2(m0.reason||'').replace(/\n/g,'<br>')}</td></tr>`).join('');
    const el=w.document.getElementById('srv');
    if(!el) return;
    el.innerHTML=`
      <h2>サーバ</h2>
      <div class="cards">
        <div class="c"><b>${st.users||0}</b>人</div>
        <div class="c"><b>${st.reviews||0}</b>口コミ</div>
        <div class="c"><b>${st.posts||0}</b>投稿</div>
        <div class="c"><b>${st.records||0}</b>履修記録</div>
        <div class="c${st.open?' hot':''}"><b>${st.open||0}</b>未対応の連絡</div>
        <div class="c"><b>${st.today||0}</b>今日のメール</div>
      </div>
      <h3>運営あての連絡・通報（${(r.messages||[]).length}）</h3>
      <table><thead><tr><th>日時</th><th>種類</th><th>差出人</th><th>内容</th></tr></thead>
        <tbody>${msgs||'<tr><td colspan="4">まだありません</td></tr>'}</tbody></table>
      <h3>加入しているアカウント（${(r.users||[]).length}）</h3>
      <table><thead><tr><th>メール</th><th>表示名</th><th>所属</th><th>公開</th>
        <th>登録</th><th>最後に来た</th></tr></thead>
        <tbody>${users||'<tr><td colspan="6">まだありません</td></tr>'}</tbody></table>`;
  }).catch(e=>{
    const el=w.document.getElementById('srv');
    if(el) el.innerHTML='<h2>サーバ</h2><p class="z">'+
      (e.message==='offline' ? 'サーバにつながっていません。この端末の内容だけ出しています。'
        : '運営のアカウントで入ると、加入者と連絡の一覧が出ます。')+'</p>';
  });
}
window.openAdmin=openAdmin;

window.myProfile=()=>{
  if(!SESSION||!ACC||!ACC.profile||!ACC.profile.pub) return null;
  const P=ACC.profile;
  /* id はサーバ上の自分と同じものを名乗る。0 を名乗っていた頃は、
     サーバから返ってきた自分(UUID)を別人と数えて、ページが2つに見えた。
     所属はアカウント側を正とし、そこが空ならサイトの設定（ME）を使う。 */
  const M=(typeof ME!=='undefined')?ME:{dept:'',grade:''};
  return {id:ACC.id||0, me:true, name:P.name,
          dept:ACC.dept||M.dept||'', grade:Number(ACC.grade||M.grade||0),
          media:P.media||[], doing:P.doing||'', want:P.want||'',
          sns:{instagram:P.ig||'', x:P.x||'', tiktok:P.tt||'', youtube:''},
          works:(P.works||[]).map(w=>({t:w.t,y:'',img:w.img})),
          face:P.face||'', seed:1234, openTT:!!P.openTT};
};

window.renderAccount=render;
window.paintAccount=paint;
window.isLoggedIn=()=>!!SESSION;
/* 掲示板が「自分の投稿か」を見比べるためのアカウントid。未ログインは空。 */
window.myUid=()=>(SESSION&&ACC&&ACC.id)?String(ACC.id):'';
window.accountEmail=()=>SESSION?SESSION.email:'';
window.GEIDAY_TERMS=TERMS;
window.GEIDAY_PRIVACY=PRIVACY;

/* 画像の縮小・トースト・ボタンのスピナーは、掲示板側でも同じものを使う。
   同じ処理を2箇所に書くと、片方だけ直したときに挙動がずれる。 */
window.GX={ shrink, toast, busy };

/* ── 起動 ────────────────────────────────
   サーバが居るかを確かめ、居ればサーバ側の自分を正とする。
   ここで localStorage を上書きするのは、別の端末で入ったときに
   「古い写しが残っていて、新しい内容が見えない」のを避けるため。 */
async function boot(){
  const r = await GAPI.boot();
  if(r.online && r.user){
    ACC = ACC || {};
    /* id はアカウントの本体。アーティスト欄で「サーバにある自分」と
       「この端末の自分」を同一人物だと見分ける唯一の鍵になる。 */
    ACC.id=r.user.id;
    ACC.email=r.user.email; ACC.dept=r.user.dept; ACC.grade=r.user.grade;
    ACC.agreedAt=r.user.agreedAt; ACC.profile=r.user.profile||{};
    SSg(AKEY,ACC);
    SESSION={email:r.user.email, at:Date.now()}; SSg(SKEY,SESSION);
    if(r.user.dept) applyMe(r.user.dept, r.user.grade);
    if(r.user.prefs && typeof window.__applyPrefs==='function') window.__applyPrefs(r.user.prefs);
  } else if(r.online && !r.user){
    /* サーバは居るが、この端末はログインしていない。
       手元に残っている「入っているつもり」の印は消す。 */
    if(SESSION && !(ACC && ACC.localOnly)){ SESSION=null; SSg(SKEY,null); }
  }
  render(); paint();
  if(typeof pullAll==='function') pullAll();
}
/* Googleから戻ってきたときの知らせ。URLに残ると再読込のたびに出るので消す。 */
function loginNotice(){
  const q=new URLSearchParams(location.search).get('login');
  if(!q) return;
  const msg={ new:'登録できました。', ok:'おかえりなさい。',
    cancel:'ログインをやめました。',
    state:'時間がかかりすぎたようです。もう一度お試しください。',
    token:'Googleとのやりとりに失敗しました。もう一度お試しください。',
    claim:'確認できませんでした。もう一度お試しください。',
    domain:'藝大のGoogleアカウント（@geidai.ac.jp）で入ってください。' }[q];
  if(msg) toast(msg, (q==='new'||q==='ok')?'':'err');
  if(q==='new'||q==='ok') go('acc');
  const u=new URL(location.href); u.searchParams.delete('login');
  history.replaceState(null,'',u.pathname+(u.search||'')+u.hash);
}
/* 画面のあちこちから「説明」を開く。footer・地図・時間割から呼ばれる。 */
window.openAbout = ()=>{
  showDoc='about';
  if(typeof go==='function') go('acc');
  render();
  const d=document.querySelector('.docbody');
  if(d) d.scrollIntoView({block:'start'});
};

if(document.readyState==='loading')
  addEventListener('DOMContentLoaded',()=>boot().then(loginNotice));
else boot().then(loginNotice);
})();
