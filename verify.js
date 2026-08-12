
const { Pool } = require('pg')
const log4js = require('log4js')
const config = require('./config')

const logger = log4js.getLogger('walletDB')

// 現在利用中のpg.Poolインスタンス
// nullの場合は未作成、または利用不可として破棄済み
let internalPool = null

// shutdown中は接続プールを再生成しない
let isShuttingDown = false

// ============================================================
// DEBUG確認用
// 接続プールが再作成されたかを識別するための連番
// 確認完了後は削除またはコメントアウト可能
// ============================================================
let poolSequence = 0

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
  })

  // ============================================================
  // DEBUG確認用
  // 作成されたPoolを識別するためのIDを付与する
  // 確認完了後は削除またはコメントアウト可能
  // ============================================================
  poolSequence += 1
  pool.__poolId = poolSequence

  logger.info(
    `[DEBUG][Pool:${pool.__poolId}] PostgreSQL connection pool created`
  )

  // ============================================================
  // DEBUG確認用
  // 通常のDB処理がどのPoolを使用しているか確認する
  // 確認完了後は削除またはコメントアウト可能
  // ============================================================
  const originalQuery = pool.query.bind(pool)

  pool.query = (...args) => {
    logger.info(
      `[DEBUG][Pool:${pool.__poolId}] query called`
    )

    return originalQuery(...args)
  }

  // ============================================================
  // DEBUG確認用
  // pool.connect()がどのPoolを使用しているか確認する
  // トランザクション等のClient取得処理を確認するために使用する
  // 確認完了後は削除またはコメントアウト可能
  // ============================================================
  const originalConnect = pool.connect.bind(pool)

  pool.connect = (...args) => {
    logger.info(
      `[DEBUG][Pool:${pool.__poolId}] connect called`
    )

    return originalConnect(...args)
  }

  /**
   * アイドル状態のクライアントで予期しないエラーが発生した場合、
   * 現在の接続プールを利用不可として扱う。
   */
  pool.on('error', (error) => {
    logger.error(
      `[DEBUG][Pool:${pool.__poolId}] pool error occurred`,
      {
        code: error.code,
        message: error.message,
      }
    )

    // shutdown中は再生成対象として扱わない
    if (isShuttingDown) {
      logger.warn(
        `[DEBUG][Pool:${pool.__poolId}] API is shutting down. Skip pool recreation.`
      )
      return
    }

    /**
     * エラーが発生したPoolが現在利用中のPoolの場合のみ、
     * internalPoolをnullにする。
     *
     * これにより、次回getPool()実行時に
     * 新しい接続プールが作成される。
     */
    if (internalPool === pool) {
      logger.warn(
        `[DEBUG][Pool:${pool.__poolId}] internalPool -> null`
      )

      internalPool = null
    }
  })

  return pool
}

/**
 * PostgreSQL接続プールを取得する
 *
 * 接続プールが存在しない場合は新規作成する。
 *
 * @returns {Pool} PostgreSQL接続プール
 */
function getPool() {
  if (isShuttingDown) {
    throw new Error('walletDB pool is shutting down')
  }

  if (!internalPool) {
    // ============================================================
    // DEBUG確認用
    // 新しいPoolが作成されるタイミングを確認する
    // 確認完了後は削除またはコメントアウト可能
    // ============================================================
    logger.info(
      '[DEBUG] internalPool is null. Creating new pool.'
    )

    internalPool = createNewPool()
  }

  // ============================================================
  // DEBUG確認用
  // getPool()がどのPoolを返却したか確認する
  // 確認完了後は削除またはコメントアウト可能
  // ============================================================
  logger.info(
    `[DEBUG] getPool -> Pool:${internalPool.__poolId}`
  )

  return internalPool
}

/**
 * PostgreSQL接続プールを終了する
 */
async function close() {
  // shutdown中にPoolを再生成しないようにする
  isShuttingDown = true

  if (!internalPool) {
    logger.info(
      'walletDB pool is already null or not initialized'
    )
    return
  }

  const pool = internalPool

  // ============================================================
  // DEBUG確認用
  // shutdown時にどのPoolを終了するか確認する
  // 確認完了後は削除またはコメントアウト可能
  // ============================================================
  logger.info(
    `[DEBUG][Pool:${pool.__poolId}] pool close started`
  )

  try {
    await pool.end()

    logger.info(
      `[DEBUG][Pool:${pool.__poolId}] pool closed`
    )
  } catch (error) {
    logger.warn(
      `[DEBUG][Pool:${pool.__poolId}] error while closing pool`,
      {
        code: error.code,
        message: error.message,
      }
    )
  } finally {
    if (internalPool === pool) {
      internalPool = null
    }
  }
}

module.exports = {
  getPool,
  close,
}
