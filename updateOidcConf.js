
/**
 * PostgreSQL プールを拡張してエラー処理を統一
 * @param {import('pg').Pool} pool - PostgreSQL プールインスタンス
 * @param {string} name - ログ用プール名
 */
function patchPool(pool, name = 'walletDB') {
  // DB の利用状態（true: 利用不可 / false: 利用可能）
  const state = { unavailable: false };

  /**
   * プールでエラーが発生した場合の処理
   * - DB を「利用不可状態」に設定
   */
  function markUnavailable(err) {
    state.unavailable = true;
    logger.error(`[${name}] Database error, switching to unavailable state:`, err && (err.code || err.message));
  }

  /**
   * クエリが成功した場合、DB を「利用可能状態」に復帰
   */
  function restoreAvailability() {
    if (state.unavailable) {
      logger.info(`[${name}] Database connection restored, marked as available`);
    }
    state.unavailable = false;
  }

  // プールレベルのエラーを監視
  pool.on('error', markUnavailable);

  // pool.query をラップ
  const _query = pool.query.bind(pool);
  pool.query = async (...args) => {
    if (state.unavailable) {
      const e = new Error(`[${name}] Database is temporarily unavailable`);
      e.code = 'DB_UNAVAILABLE';
      throw e;
    }
    try {
      const res = await _query(...args);
      restoreAvailability();
      return res;
    } catch (err) {
      const e = new Error(`[${name}] Query execution failed: ${err.message}`);
      e.code = 'DB_QUERY_ERROR';
      e.cause = err;
      throw e;
    }
  };

  // pool.connect をラップし、client.query も同様にパッチ
  const _connect = pool.connect.bind(pool);
  pool.connect = async () => {
    const client = await _connect();
    const _clientQuery = client.query.bind(client);

    client.query = async (...args) => {
      if (state.unavailable) {
        const e = new Error(`[${name}] Database is temporarily unavailable`);
        e.code = 'DB_UNAVAILABLE';
        throw e;
      }
      try {
        const res = await _clientQuery(...args);
        restoreAvailability();
        return res;
      } catch (err) {
        const e = new Error(`[${name}] Query execution failed: ${err.message}`);
        e.code = 'DB_QUERY_ERROR';
        e.cause = err;
        throw e;
      }
    };

    return client;
  };

  // ヘルスチェック用：DB が利用可能かどうかを返す
  pool.isUnavailable = () => state.unavailable;
}

// PostgreSQL プールを作成
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

// パッチ適用
patchPool(pool, 'walletDB');

module.exports = pool;
