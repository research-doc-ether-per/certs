const log4js = require('log4js')
const { Pool } = require('pg')
const config = require('../../config/walletDB.json')

const logger = log4js.getLogger('walletDB')

// アプリケーション全体で共有するPostgreSQL接続プール
let internalPool = null

// APIが終了処理中であるかを示すフラグ
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
   * アイドル状態のクライアントで予期しないエラーが発生した場合、
   * エラー内容のみをログに出力する。
   *
   * エラーが発生したクライアントはpg側で接続プールから除外されるため、
   * 接続プール自体は破棄せず、そのまま再利用する。
   */
  pool.on('error', (error) => {
    logger.error('walletDB pool idle client error:', {
      code: error.code,
      message: error.message,
      stack: error.stack,
    })
  })

  logger.info('walletDB pool created')

  return pool
}

/**
 * PostgreSQL接続プールを取得する
 *
 * 接続プールが未作成の場合のみ新規作成する。
 *
 * @returns {Pool} PostgreSQL接続プール
 */
function getPool() {
  if (isShuttingDown) {
    throw new Error('walletDB pool is shutting down')
  }

  if (!internalPool) {
    internalPool = createNewPool()
  }

  return internalPool
}

/**
 * API終了時にPostgreSQL接続プールを閉じる
 */
async function close() {
  // すでに終了処理中の場合は重複して処理しない
  if (isShuttingDown) {
    return
  }

  isShuttingDown = true

  // 接続プールが未作成の場合は何もしない
  if (!internalPool) {
    logger.info('walletDB pool is not initialized')
    return
  }

  const pool = internalPool
  internalPool = null

  try {
    await pool.end()

    logger.info('walletDB pool closed successfully')
  } catch (error) {
    logger.warn('Failed to close walletDB pool:', {
      code: error.code,
      message: error.message,
    })
  }
}

module.exports = {
  getPool,
  close,
}
