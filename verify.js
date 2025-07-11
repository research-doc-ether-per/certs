
{
  "host": "localhost",
  "port": 5433,
  "user": "myuser",
  "password": "mypassword",
  "database": "mydb",
  "max": 10,
  "idleTimeoutMillis": 30000
}

// src/db/index.js
const { Pool } = require('pg');
// configフォルダのJSONから接続情報を読み込む
const config = require('../../config/db.json');
const log4js = require('log4js');
const logger = log4js.getLogger('dbPool');

/**
 * PostgreSQL接続プールの作成
 * 設定は config/db.json から読み込まれる
 */
const pool = new Pool({
  host:     config.host,
  port:     config.port,
  user:     config.user,
  password: config.password,
  database: config.database,
  max:      config.max,
  idleTimeoutMillis: config.idleTimeoutMillis,
});

// プール上の予期せぬエラーをハンドリング
pool.on('error', (error) => {
  logger.error('Unexpected PostgreSQL client error:', error);
  process.exit(-1);
});

module.exports = pool;

const pool = require('../db');
const log4js = require('log4js');
const logger = log4js.getLogger('postgresService');

/**
 * スネークケースのキーをキャメルケースに変換するユーティリティ
 * @param {string} str - スネークケース文字列
 * @returns {string} キャメルケース文字列
 */
function toCamel(str) {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

/**
 * オブジェクトの全キーをキャメルケースに変換
 * @param {Object} row - 変換対象の行オブジェクト
 * @returns {Object} キーがキャメルケースに変換された新しいオブジェクト
 */
function mapRow(row) {
  const result = {};
  for (const key in row) {
    result[toCamel(key)] = row[key];
  }
  return result;
}

/**
 * WHERE句を構築するユーティリティ
 * @param {Object} conditions - 検索条件オブジェクト（{ column: value }）
 * @returns {{ clause: string, values: any[] }}
 *   clause: WHERE句文字列
 *   values: バインドパラメータ配列
 */
function buildWhere(conditions = {}) {
  const keys = Object.keys(conditions);
  if (!keys.length) return { clause: '', values: [] };
  const parts = keys.map((col, i) => `"${col}" = $${i + 1}`);
  return {
    clause: `WHERE ${parts.join(' AND ')}`,
    values: keys.map(k => conditions[k]),
  };
}

/**
 * SELECT操作
 * @param {Pool|Client} client - Poolまたはトランザクション用Client
 * @param {string} table - テーブル名
 * @param {Object} [conditions={}] - WHERE条件オブジェクト
 * @param {string} [orderBy=''] - ORDER BY句
 * @param {number} [limit] - LIMIT句
 * @param {number} [offset] - OFFSET句
 * @returns {Promise<Object[]>} キーをキャメルケースに変換した行の配列
 */
async function select(client, table, conditions = {}, orderBy = '', limit, offset) {
  logger.debug('*** select start ***');
  try {
    const { clause, values } = buildWhere(conditions);
    let sql = `SELECT * FROM "${table}" ${clause}`;
    if (orderBy) sql += ` ORDER BY ${orderBy}`;
    if (typeof limit === 'number') sql += ` LIMIT ${limit}`;
    if (typeof offset === 'number') sql += ` OFFSET ${offset}`;
    const res = await client.query(sql, values);
    return res.rows.map(mapRow);
  } catch (error) {
    logger.error('select error:', error.message);
    throw error;
  } finally {
    logger.debug('*** select end ***');
  }
}

/**
 * INSERT操作
 * @param {Pool|Client} client - Poolまたはトランザクション用Client
 * @param {string} table - テーブル名
 * @param {Object} data - 挿入データオブジェクト
 * @returns {Promise<Object>} キャメルケースに変換した挿入後の行データ
 */
async function insert(client, table, data) {
  logger.debug('*** insert start ***');
  try {
    const cols = Object.keys(data).map(c => `"${c}"`);
    const vals = Object.values(data);
    const placeholders = vals.map((_, i) => `$${i + 1}`);
    const sql = `
      INSERT INTO "${table}"(${cols.join(',')})
      VALUES(${placeholders.join(',')})
      RETURNING *
    `;
    const res = await client.query(sql, vals);
    return mapRow(res.rows[0]);
  } catch (error) {
    logger.error('insert error:', error.message);
    throw error;
  } finally {
    logger.debug('*** insert end ***');
  }
}

/**
 * UPDATE操作
 * @param {Pool|Client} client - Poolまたはトランザクション用Client
 * @param {string} table - テーブル名
 * @param {Object} data - 更新データオブジェクト
 * @param {Object} conditions - WHERE条件オブジェクト
 * @returns {Promise<Object>} キャメルケースに変換した更新後の行データ
 */
async function update(client, table, data, conditions) {
  logger.debug('*** update start ***');
  try {
    const cols = Object.keys(data);
    const vals = Object.values(data);
    const sets = cols.map((c, i) => `"${c}" = $${i + 1}`);
    const { clause, values: whereVals } = buildWhere(conditions);
    const sql = `
      UPDATE "${table}"
      SET ${sets.join(',')}
      ${clause}
      RETURNING *
    `;
    const res = await client.query(sql, [...vals, ...whereVals]);
    return mapRow(res.rows[0]);
  } catch (error) {
    logger.error('update error:', error.message);
    throw error;
  } finally {
    logger.debug('*** update end ***');
  }
}

/**
 * DELETE操作
 * @param {Pool|Client} client - Poolまたはトランザクション用Client
 * @param {string} table - テーブル名
 * @param {Object} conditions - WHERE条件オブジェクト
 * @returns {Promise<{deleted: boolean}>} 削除結果オブジェクト
 */
async function remove(client, table, conditions) {
  logger.debug('*** remove start ***');
  try {
    const { clause, values } = buildWhere(conditions);
    const sql = `DELETE FROM "${table}" ${clause}`;
    await client.query(sql, values);
    return { deleted: true };
  } catch (error) {
    logger.error('remove error:', error.message);
    throw error;
  } finally {
    logger.debug('*** remove end ***');
  }
}

/**
 * COUNT操作
 * @param {Pool|Client} client - Poolまたはトランザクション用Client
 * @param {string} table - テーブル名
 * @param {Object} [conditions={}] - WHERE条件オブジェクト
 * @returns {Promise<number>} 条件に一致する行数
 */
async function count(client, table, conditions = {}) {
  logger.debug('*** count start ***');
  try {
    const { clause, values } = buildWhere(conditions);
    const sql = `SELECT COUNT(*)::int AS cnt FROM "${table}" ${clause}`;
    const res = await client.query(sql, values);
    return res.rows[0].cnt;
  } catch (error) {
    logger.error('count error:', error.message);
    throw error;
  } finally {
    logger.debug('*** count end ***');
  }
}

/**
 * EXISTSチェック
 * @param {Pool|Client} client - Poolまたはトランザクション用Client
 * @param {string} table - テーブル名
 * @param {Object} [conditions={}] - WHERE条件オブジェクト
 * @returns {Promise<boolean>} 条件に一致する行が存在するか
 */
async function exists(client, table, conditions = {}) {
  logger.debug('*** exists start ***');
  try {
    const { clause, values } = buildWhere(conditions);
    const sql = `SELECT EXISTS(SELECT 1 FROM "${table}" ${clause}) AS ok`;
    const res = await client.query(sql, values);
    return res.rows[0].ok;
  } catch (error) {
    logger.error('exists error:', error.message);
    throw error;
  } finally {
    logger.debug('*** exists end ***');
  }
}

/**
 * トランザクション実行ラッパー
 * @param {function(client: import('pg').PoolClient): Promise<any>} fn - トランザクション内で実行する関数
 * @returns {Promise<any>} ユーザ関数の戻り値
 */
async function withTransaction(fn) {
  logger.debug('*** transaction start ***');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('transaction error:', error.message);
    throw error;
  } finally {
    client.release();
    logger.debug('*** transaction end ***');
  }
}

module.exports = {
  // 通常操作：poolを自動使用し、キーをキャメルケースで返却
  select:      (table, cond, orderBy, limit, offset) => select(pool, table, cond, orderBy, limit, offset),
  insert:      (table, data)    => insert(pool, table, data),
  update:      (table, data, cond) => update(pool, table, data, cond),
  remove:      (table, cond)    => remove(pool, table, cond),
  count:       (table, cond)    => count(pool, table, cond),
  exists:      (table, cond)    => exists(pool, table, cond),
  // トランザクション操作
  withTransaction,
  // トランザクション内部で直接使用
  _select: select,
  _insert: insert,
  _update: update,
  _remove: remove,
  _count: count,
  _exists: exists,
};
