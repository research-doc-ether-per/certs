const { Pool } = require('pg')
const config = require('../config/waltid.json')
const log4js = require('log4js')
const logger = log4js.getLogger('waltidDB')

// 設定値：再接続の最大回数と待機時間（ミリ秒）
const RETRY_MAX = Number(config.DB?.retryMax ?? 2)
const RETRY_DELAY = Number(config.DB?.retryDelay ?? 1000)

/**
 * 接続プールを作成する関数
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

// 現在の pg.Pool インスタンス（更新可能）
let internalPool = createNewPool()

/**
 * 接続系エラーかどうかを判定する関数
 */
function isConnectionError(error) {
  return (
    error.code === 'ECONNRESET' ||
    error.code === '57P01' ||
    error.message?.includes('Connection terminated unexpectedly') ||
    error.message?.includes('Connection refused') ||
    error.message?.includes('server closed the connection unexpectedly')
  )
}

/**
 * 自動再接続付きのカスタム query 関数
 */
async function customQuery(text, params) {
  for (let attempt = 0; attempt <= RETRY_MAX; attempt++) {
    try {
      return await Pool.prototype.query.call(internalPool, text, params)
    } catch (error) {
      const label = `(${attempt + 1}/${RETRY_MAX + 1})`
      logger.error(`Query error ${label}: ${error.message}`)

      if (!isConnectionError(error)) {
        throw error
      }

      if (attempt < RETRY_MAX) {
        logger.warn(`Connection error detected. Recreating pool and retrying ${label}...`)

        try {
          await internalPool.end().catch(e =>
            logger.warn(`Failed to close old pool: ${e.message}`)
          )
          internalPool = createNewPool()
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY))
        } catch (reconnectError) {
          logger.error(`Failed to recreate pool: ${reconnectError.message}`)
          throw reconnectError
        }
      } else {
        logger.error('Retry limit reached. Throwing WALTID_DB_CONNECTION_REFUSED error.')
        const finalError = new Error('WALTID DB Connection refused')
        finalError.code = 'WALTID_DB_CONNECTION_REFUSED'
        finalError.original = error
        throw finalError
      }
    }
  }
}

/**
 * getPool() - query を上書きし、他のすべては internalPool のままにする
 */
function getPool() {
  return Object.assign(Object.create(internalPool), {
    query: customQuery,
  })
}

module.exports = {
  getPool,
}
