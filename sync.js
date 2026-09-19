/* ============================================================
   サーバと手元の写しを合わせる

   何を同期するか
     ・自分だけのもの（時間割・お気に入り・タグ・見ている学年）
         → users.prefs に丸ごと1つのJSONで置く。行を増やさない。
     ・みんなで見るもの（口コミ・履修記録・掲示板・展示・譲り合い・公募）
         → 行で置く。他人のぶんを集計して見せる必要があるため。

   ダミーの扱い
     判断は**画面ごと・板ごと**に行う。全体で一括して止めない。
     一括にすると、譲り合いに1件入っただけで展示も講評も空になる（実際そうなった）。

   失敗したときの態度
     取れなければ、手元の写しをそのまま使う。画面は止めない。
   ============================================================ */
(function () {
"use strict";

const LS = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); }
                       catch (e) { return d; } };
const SS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; }
                       catch (e) { return false; } };

/* 自分だけのもの。これらは users.prefs に入れてサーバへ持っていく。 */
const MINE = [
  'geidai_tt_v1',        // 時間割
  'geidai_favs_v1',      // お気に入り
  'geidai_tags_v1',      // タグ
  'geidai_ttgrade_v1',   // いま見ている学年
  'geidai_me_v1',        // 所属
  'geidai_nendo_v1',     // 年度の進級をどこまで済ませたか
];

/* サーバから来た共有データの置き場所。手元の投稿とは分けて持つ。 */
const SRV = 'geiday_srv_v1';

function myPrefs() {
  const o = {};
  for (const k of MINE) { const v = localStorage.getItem(k); if (v != null) o[k] = v; }
  return o;
}
/* サーバに置いてある自分の設定を、この端末に流し込む */
window.__applyPrefs = function (prefs) {
  if (!prefs || typeof prefs !== 'object') return;
  let changed = false;
  for (const k of MINE) {
    if (typeof prefs[k] === 'string' && prefs[k] !== localStorage.getItem(k)) {
      try { localStorage.setItem(k, prefs[k]); changed = true; } catch (e) {}
    }
  }
  if (changed && typeof window.__reloadStores === 'function') window.__reloadStores();
};

/* 設定が変わったら、少し待ってからまとめて送る。
   1文字打つたびに送ると、Workers の1日のリクエスト数を無駄に食う。 */
let th = null;
window.__pushPrefs = function () {
  clearTimeout(th);
  th = setTimeout(() => {
    /* ログインしていない人の分まで送らない。全部401で弾かれるだけの
       リクエストが、時間割を触るたびに無料枠を削っていた。 */
    if (!window.GAPI || GAPI.online === false || !GAPI.me) return;
    GAPI.saveMe({ prefs: myPrefs() }).catch(() => {});
  }, 2500);
};

/* localStorage への書き込みを見張って、自分のものが変わったら送る。
   各所に push を書き足して回ると、必ずどこかを書き忘れる。 */
const _set = localStorage.setItem.bind(localStorage);
localStorage.setItem = function (k, v) {
  _set(k, v);
  if (MINE.indexOf(k) >= 0) window.__pushPrefs();
};

/* ── 共有データを取ってくる ───────────────── */
async function pullAll() {
  if (!window.GAPI) return;
  const box = LS(SRV, {});
  const jobs = [
    GAPI.reviews().then(r => { box.reviews = r.reviews || []; }).catch(() => {}),
    GAPI.records().then(r => { box.records = r.records || []; }).catch(() => {}),
    GAPI.posts().then(r => { box.posts = r.posts || []; }).catch(() => {}),
    GAPI.artists().then(r => { box.artists = r.artists || []; }).catch(() => {}),
  ];
  await Promise.all(jobs);
  box.at = Date.now();
  SS(SRV, box);

  /* ここで全体のダミーを止めない。
     譲り合いに1件入っただけで展示や講評のダミーまで消えてしまう。
     ダミーを出すかどうかは、それぞれの画面が自分のデータだけを見て決める。 */

  if (typeof window.__reloadStores === 'function') window.__reloadStores();
  return box;
}
window.pullAll = pullAll;

/* 画面側から「サーバにある共有データ」を読むための入口。
   サーバが無ければ空の配列を返すので、呼び出し側は分岐しなくてよい。 */
window.SRVDATA = {
  reviews: () => LS(SRV, {}).reviews || [],
  records: () => LS(SRV, {}).records || [],
  posts:   b => (LS(SRV, {}).posts || []).filter(p => !b || p.board === b),
  artists: () => LS(SRV, {}).artists || [],
  at:      () => LS(SRV, {}).at || 0,
  clear:   () => SS(SRV, {}),
  /* 消す・終わった を写しへ即反映する。次の pullAll を待つと、
     押した直後の再描画で古い写しが勝って「消えない」ように見える。 */
  removePost: id => { const b = LS(SRV, {}); if (!b.posts) return;
    b.posts = b.posts.filter(p => String(p.id) !== String(id)); SS(SRV, b); },
  patchPost: (id, patch) => { const b = LS(SRV, {}); if (!b.posts) return;
    b.posts = b.posts.map(p => String(p.id) === String(id) ? { ...p, ...patch } : p);
    SS(SRV, b); },
};
})();
