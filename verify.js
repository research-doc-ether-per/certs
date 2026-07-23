
const { Pool } = require('pg')
const log4js = require('log4js')
const config = require('./config')

const logger = log4js.getLogger('walletDB')

// 現在利用中の pg.Pool インスタンス
// null の場合は未作成、または利用不可として破棄済み
let internalPool = null

// shutdown 中は接続プールを再生成しない
let isShuttingDown = false

/**
 * PostgreSQL接続プールを新規作成する
 *
 * @returns {Pool} PostgreSQL接続プール
 */
function createNewPool() {
  const pool = new Pool({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    max: config.max,
    connectionTimeoutMillis: config.connectionTimeoutMillis,
    idleTimeoutMillis: config.idleTimeoutMillis,
    ssl: config.ssl,
  })

  /**
   * idle connection の切断など、
   * Pool内部で発生したエラーを処理する
   */
  pool.on('error', (error) => {
    logger.error('walletDB Pool internal error detected:', error)

    if (isShuttingDown) {
      logger.warn('walletDB is shutting down. Skip pool invalidation.')
      return
    }

    /*
     * 現在使用中のPoolと同じ場合のみ無効化する。
     * 次回のgetPool()呼び出し時に新しいPoolを作成する。
     *
     * errorイベント内ではpool.end()を呼び出さない。
     */
    if (internalPool === pool) {
      internalPool = null
      logger.warn('walletDB pool marked as stale after internal error.')
    }
  })

  return pool
}

/**
 * Poolが存在しない場合は新規作成して返す
 *
 * @returns {Pool} PostgreSQL接続プール
 */
function ensurePool() {
  if (isShuttingDown) {
    throw new Error('walletDB is shutting down')
  }

  if (!internalPool) {
    internalPool = createNewPool()
    logger.info('walletDB pool created.')
  }

  return internalPool
}

/**
 * 既存実装との互換性を保つため、Poolを返す
 *
 * @returns {Pool} PostgreSQL接続プール
 */
function getPool() {
  return ensurePool()
}

/**
 * アプリ終了時のshutdown処理
 */
async function close() {
  if (isShuttingDown) {
    logger.info('walletDB shutdown is already in progress.')
    return
  }

  isShuttingDown = true

  const pool = internalPool
  internalPool = null

  if (!pool) {
    logger.info('walletDB pool is already null or not initialized.')
    return
  }

  try {
    await pool.end()
    logger.info('walletDB pool closed successfully.')
  } catch (error) {
    logger.warn('walletDB error while closing pool:', error)
  }
}

module.exports = {
  getPool,
  close,
}
