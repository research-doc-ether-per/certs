const { Pool } = require('pg')
const config = require('../config/waltid.json')
const log4js = require('log4js')
const logger = log4js.getLogger('waltidDB')

const RETRY_MAX   = Number(config.DB?.retryMax ?? 2)
const RETRY_DELAY = Number(config.DB?.retryDelay ?? 1000)

/**
 * 接続プールを生成
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

// 初期プール
let pool = createNewPool()

// 接続エラー判定
function isConnectionError(error) {
  return (
    error.code === 'ECONNRESET' ||
    error.code === '57P01' ||
    error.message?.includes('Connection terminated unexpectedly') ||
    error.message?.includes('Connection refused') ||
    error.message?.includes('server closed the connection unexpectedly')
  )
}

// 自動再接続付き query の差し替え（インスタンスに直接上書き）
pool.query = async function (text, params) {
  for (let attempt = 0; attempt <= RETRY_MAX; attempt++) {
    try {
      return await Pool.prototype.query.call(this, text, params)
    } catch (error) {
      const label = `(${attempt + 1}/${RETRY_MAX + 1})`
      logger.error(`Query error ${label}: ${error.message}`)

      if (!isConnectionError(error)) throw error

      if (attempt < RETRY_MAX) {
        logger.warn(`Connection error detected. Recreating pool and retrying ${label}...`)
        try {
          await pool.end().catch(e => logger.warn(`Failed to end old pool: ${e.message}`))
          pool = createNewPool()
          // 新プールにも再帰的に query を上書き
          pool.query = arguments.callee.bind(pool)
          await new Promise(res => setTimeout(res, RETRY_DELAY))
        } catch (reconnectError) {
          logger.error(`Failed to recreate pool: ${reconnectError.message}`)
          throw reconnectError
        }
      } else {
        logger.error('Retry limit reached. Throwing WALLET_DB_CONNECTION_REFUSED error.')
        const finalError = new Error('WALTID DB Connection refused')
        finalError.code = 'WALTID_DB_CONNECTION_REFUSED'
        finalError.original = error
        throw finalError
      }
    }
  }
}

// 必要なら connect() も暴露（トランザクション用）
function getPool() {
  return pool
}

module.exports = {
  query: pool.query,
  getPool,
}
