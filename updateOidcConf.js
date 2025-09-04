const { Pool } = require('pg')
const config = require('../config/waltid.json')
const log4js = require('log4js')
const logger = log4js.getLogger('walletDB')

// 設定値：リトライ回数と待機時間（ミリ秒）
const RETRY_MAX   = Number(config.DB?.retryMax ?? 2)       // 再接続の最大試行回数
const RETRY_DELAY = Number(config.DB?.retryDelay ?? 1000)  // 再試行間隔（ミリ秒）

/**
 * PostgreSQL接続プールの生成関数
 */
function createNewPool() {
  return new Pool({
    host: config.DB.host,
    port: config.DB.port,
    user: config.DB.user,
    password: config.DB.password,
    database: config.DB.database,
    max: config.DB.max,
    idleTimeoutMillis: config.DB.idleTimeoutMillis,
    ssl: config.DB.ssl,
  })
}

// 現在のプールインスタンス（初期化）
let pool = createNewPool()

/**
 * エラーメッセージから接続系エラーかどうかを判定
 */
function isConnectionError(error) {
  return (
    error.code === 'ECONNRESET' ||
    error.code === '57P01' || // admin shutdown
    error.message?.includes('Connection terminated unexpectedly') ||
    error.message?.includes('Connection refused') ||
    error.message?.includes('server closed the connection unexpectedly')
  )
}

/**
 * クエリを安全に実行する関数（接続エラー時に最大リトライ）
 *
 * @param {string} text - SQLクエリ
 * @param {Array<any>} params - パラメータ
 * @returns {Promise<import('pg').QueryResult>}
 */
async function safeQuery(text, params) {
  for (let attempt = 0; attempt <= RETRY_MAX; attempt++) {
    try {
      return await pool.query(text, params)
    } catch (error) {
      const label = `(${attempt + 1}/${RETRY_MAX + 1})`
      logger.error(`Query error ${label}: ${error.message}`)

      if (!isConnectionError(error)) {
        throw error
      }

      if (attempt < RETRY_MAX) {
        logger.warn(`Detected connection error. Recreating pool and retrying ${label}...`)

        try {
          await pool.end().catch(e => logger.warn(`pool.end() failed: ${e.message}`))
          pool = createNewPool()
          await new Promise(res => setTimeout(res, RETRY_DELAY))
        } catch (reconnectError) {
          logger.error(`Failed to recreate pool: ${reconnectError.message}`)
          throw reconnectError
        }
      } else {
        logger.error('Retry limit reached. Throwing error.')
        const finalError = new Error('WALLET DB Connection refused')
        finalError.code = 'WALLET_DB_CONNECTION_REFUSED'
        finalError.original = error
        throw finalError
      }
    }
  }
}

/**
 * connect() を使用するケース（トランザクション等）用に現在の pool を返す
 */
function getPool() {
  return pool
}

module.exports = {
  query: safeQuery,
  getPool,
}
