/* ============================================================
   サーバとのやりとり

   考え方
     いままで通り localStorage を「手元の写し」として使い続ける。
     サーバはその写しの置き場所が増えただけ、という形にする。

     こうする理由は2つ。
       1. サーバが落ちていても、通信が切れていても、画面が動かなくならない。
       2. サーバを立てる前でも後でも、同じコードが動く。
          （サーバが無いときは自動で「手元だけ」に切り替わる）

   同期のしかた
     ・入るとき: サーバの内容を取ってきて localStorage に流し込む。
     ・書いたとき: まず localStorage に書いて画面を更新し、
       そのあと裏でサーバへ送る。送れなくても画面は止めない。
     ・送れなかったものは queue に積み、次に通じたときにまとめて送る。
   ============================================================ */
(function () {
"use strict";

const BASE = '/api';
const QKEY = 'geiday_queue_v1';      // 送れなかったもの
const SKEY = 'geiday_server_v1';     // サーバが使えるかどうかの記憶

let online = null;                   // null=未確認 / true=使える / false=使えない
let me = null;                       // サーバ上の自分
let caps = { google:false, mail:false, dev:false };   // サーバで使える方式

const LS = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); }
                       catch (e) { return d; } };
const SS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; }
                       catch (e) { return false; } };

/* ── 通信 ────────────────────────────────
   サーバが無いときに毎回待たされると操作が重くなるので、
   一度「使えない」と分かったら、しばらく試さない。 */
let lastFail = 0;
const RETRY_AFTER = 30 * 1000;

async function call(path, opt) {
  if (online === false && Date.now() - lastFail < RETRY_AFTER)
    throw new Error('offline');
  const o = Object.assign({ credentials: 'same-origin', headers: {} }, opt || {});
  if (o.body && typeof o.body !== 'string') {
    o.headers['content-type'] = 'application/json';
    o.body = JSON.stringify(o.body);
  }
  let r;
  try {
    r = await fetch(BASE + path, o);
  } catch (e) {
    online = false; lastFail = Date.now(); SS(SKEY, false);
    throw new Error('offline');
  }
  /* 静的ホスティングだけの状態だと、/api/... は index.html が返ってくる。
     JSONでなければサーバは無いものとして扱う。 */
  const ct = r.headers.get('content-type') || '';
  if (!ct.includes('json')) {
    online = false; lastFail = Date.now(); SS(SKEY, false);
    throw new Error('offline');
  }
  online = true; SS(SKEY, true);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(j.error || '通信に失敗しました。'); e.status = r.status; e.body = j; throw e; }
  return j;
}

/* ── 送れなかったものを貯める ───────────────── */
function enqueue(item) {
  const q = LS(QKEY, []);
  q.push(Object.assign({ at: Date.now() }, item));
  SS(QKEY, q.slice(-200));           // 貯めすぎない
}
async function flush() {
  const q = LS(QKEY, []);
  if (!q.length) return { sent: 0, left: 0 };
  const left = [];
  let sent = 0;
  for (const it of q) {
    try { await call(it.path, { method: it.method, body: it.body }); sent++; }
    catch (e) {
      if (e.status === 401 || e.status === 403) {
        /* ログインし直せば通るものを捨てない。オフラインで書いた投稿が
           セッション切れの一瞬に全部消える、を防ぐ。 */
        left.push(it); continue;
      }
      if (e.status && e.status >= 400 && e.status < 500 && e.status !== 429) {
        /* 中身が悪くて弾かれたものは、何度送っても通らない。捨てる。 */
        continue;
      }
      left.push(it);
    }
  }
  SS(QKEY, left);
  return { sent, left: left.length };
}

/* 送る。通らなければ貯めておく。呼び出し側は待たなくてよい。 */
function push(path, method, body) {
  return call(path, { method, body })
    .catch(e => { if (e.message === 'offline' || (e.status && e.status >= 500))
                    enqueue({ path, method, body });
                  throw e; });
}

/* ── 入口 ───────────────────────────────── */
const API = {
  get online() { return online; },
  get me() { return me; },

  /* サーバが居るかを一度だけ確かめる。居なければ以後ずっと手元だけで動く。 */
  get caps() { return caps; },

  async boot() {
    try {
      try { const h = await call('/health', { method: 'GET' });
            caps = { google:!!h.google, mail:!!h.mail, dev:!!h.dev }; }
      catch (e) {}
      const r = await call('/me', { method: 'GET' });
      me = r.user || null;
      flush().catch(() => {});
      return { online: true, user: me };
    } catch (e) {
      me = null;
      return { online: false, user: null };
    }
  },

  /* ログイン（コードを送る → コードを確かめる） */
  sendCode: email => call('/auth/start',  { method: 'POST', body: { email } }),
  verify  : (email, code) => call('/auth/verify', { method: 'POST', body: { email, code } })
              .then(r => { me = r.user; return r; }),
  logout  : () => call('/auth/logout', { method: 'POST' }).then(r => { me = null; return r; }),

  saveMe  : patch => call('/me', { method: 'PUT', body: patch }).then(r => { me = r.user; return r; }),
  deleteMe: () => call('/me', { method: 'DELETE' }).then(r => { me = null; return r; }),

  reviews : () => call('/reviews', { method: 'GET' }),
  putReview: rv => push('/reviews', 'POST', rv),
  delReview: id => push('/reviews/' + encodeURIComponent(id), 'DELETE'),

  records : () => call('/records', { method: 'GET' }),
  putRecord: rec => push('/records', 'POST', rec),

  posts   : board => call('/posts' + (board ? '?board=' + encodeURIComponent(board) : ''), { method: 'GET' }),
  putPost : p => push('/posts', 'POST', p),
  donePost: (id, done) => push('/posts/' + encodeURIComponent(id), 'PATCH', { done }),
  delPost : id => push('/posts/' + encodeURIComponent(id), 'DELETE'),

  artists : () => call('/artists', { method: 'GET' }),
  report  : r => push('/report', 'POST', r),
  contact : m => call('/contact', { method: 'POST', body: m }),
  admin   : () => call('/admin', { method: 'GET' }),

  flush,
  /* 前回サーバが使えたかどうか。画面の出し分けに使う */
  wasOnline: () => LS(SKEY, false),
  queued: () => LS(QKEY, []).length,
};

window.GAPI = API;

/* 通信が戻ったら、貯めていたぶんを送る */
addEventListener('online', () => { online = null; lastFail = 0; flush().catch(() => {}); });
})();
