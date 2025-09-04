// src/database/patchedPool.js
// -----------------------------------------------------
// PostgreSQL プールを拡張して、DB 一時停止時の自動再接続を共通化
// ・pool.query / pool.connect で「利用不可」を検知したら、その場で再接続を試行
// ・単一フライト（同時に 1 回だけ再接続）でスパイクを防止
// ・指数バックオフ + ジッター
// ・成功後は自動的に「利用可能」へ復帰
// -----------------------------------------------------
const { Pool } = require('pg');
const log4js = require('log4js');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// 共通ファクトリ
function createPatchedPool(config, name = 'db') {
  const logger = log4js.getLogger(`${name}Pool`);
  const pool = new Pool({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    max: config.max,
    idleTimeoutMillis: config.idleTimeoutMillis,
    ssl: config.ssl,
  });

  // 利用状態と再接続管理
  const state = {
    unavailable: false,          // true: 利用不可 / false: 利用可能
    reconnectPromise: null,      // 単一フライト用
    baseDelay: 1000,             // 初期遅延(ms)
    maxRetries: 5,               // 最大リトライ回数
  };

  // プールレベルのエラーで「利用不可」へ
  pool.on('error', (err) => {
    state.unavailable = true;
    logger.error(`[${name}] pool error -> mark unavailable:`, err.code || err.message);
  });

  // ---- 再接続処理（単一フライト + バックオフ）----
  async function ensureReconnected() {
    // 既に誰かが再接続中ならそれに相乗り
    if (state.reconnectPromise) return state.reconnectPromise;

    state.reconnectPromise = (async () => {
      let attempt = 0;
      while (attempt < state.maxRetries) {
        attempt += 1;
        // バックオフ + ジッター（0〜300ms）
        const delay = Math.min(state.baseDelay * 2 ** (attempt - 1), 8000) + Math.floor(Math.random() * 300);
        try {
          const client = await rawConnect(); // 実際に接続できるか検証
          client.release();
          // 成功したら利用可能へ復帰
          if (state.unavailable) logger.info(`[${name}] database reconnected (attempt ${attempt})`);
          state.unavailable = false;
          return true;
        } catch (err) {
          logger.warn(`[${name}] reconnect attempt ${attempt}/${state.maxRetries} failed:`, err.code || err.message);
          await sleep(delay);
        }
      }
      // 失敗のまま
      return false;
    })();

    try {
      return await state.reconnectPromise;
    } finally {
      // 完了したらクリア
      state.reconnectPromise = null;
    }
  }

  // ローの connect（Pool の生の connect）
  const rawConnect = pool.connect.bind(pool);

  // ---- pool.connect をラップ（「利用不可」ならその場で再接続）----
  const _connect = pool.connect.bind(pool);
  pool.connect = async () => {
    // 利用不可なら再接続を試みる
    if (state.unavailable) {
      const ok = await ensureReconnected();
      if (!ok) {
        const e = new Error(`[${name}] Database is temporarily unavailable`);
        e.code = 'DB_UNAVAILABLE';
        throw e;
      }
    }
    try {
      const client = await _connect();
      // client.query も同様にパッチ
      const _clientQuery = client.query.bind(client);
      client.query = async (...args) => {
        try {
          const res = await _clientQuery(...args);
          // クエリ成功をもって利用可能とみなす
          state.unavailable = false;
          return res;
        } catch (err) {
          // クエリ失敗で接続断を疑う → マークして再接続
          state.unavailable = true;
          throw wrapQueryError(err, name);
        }
      };
      return client;
    } catch (err) {
      // 取得自体が失敗 → 利用不可にして上位へ
      state.unavailable = true;
      throw wrapConnectError(err, name);
    }
  };

  // ---- pool.query をラップ（connect と同じ方針）----
  const _query = pool.query.bind(pool);
  pool.query = async (...args) => {
    if (state.unavailable) {
      const ok = await ensureReconnected();
      if (!ok) {
        const e = new Error(`[${name}] Database is temporarily unavailable`);
        e.code = 'DB_UNAVAILABLE';
        throw e;
      }
    }
    try {
      const res = await _query(...args);
      state.unavailable = false;
      return res;
    } catch (err) {
      state.unavailable = true;
      throw wrapQueryError(err, name);
    }
  };

  // エラー整形（英語・コード付き）
  function wrapQueryError(err, n) {
    const e = new Error(`[${n}] Query execution failed: ${err.message}`);
    e.code = 'DB_QUERY_ERROR';
    e.cause = err;
    return e;
  }
  function wrapConnectError(err, n) {
    const e = new Error(`[${n}] Failed to acquire a DB connection: ${err.message}`);
    e.code = 'DB_CONNECTION_ERROR';
    e.cause = err;
    return e;
  }

  // ヘルス確認（必要なら使う）
  pool.isUnavailable = () => state.unavailable;

  return pool;
}

module.exports = { createPatchedPool };
