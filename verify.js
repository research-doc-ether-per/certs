
const { Pool } = require('pg')
const log4js = require('log4js')
const config = require('./config')

const logger = log4js.getLogger('walletDB')

// アプリケーション全体で共有するPostgreSQL接続プール
// APIのライフサイクル中は同一のPoolを利用する
let internalPool = null

// APIが終了処理中であるかを示すフラグ
// shutdown中は新しいPoolを作成しない
let isShuttingDown = false

// ============================================================
// DEBUG確認用
// Poolが意図せず再作成されていないことを確認するための連番
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
  // 作成されたPoolを識別するためのID
  // 通常はAPI起動中にPool:1のみ存在することを想定する
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
  // Transaction等でpool.connect()が
  // どのPoolを使用しているか確認する
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
   * PostgreSQLとの新しいClient接続が確立された場合
   *
   * DB復旧後に、同一Poolから新しいClientが
   * 作成されたことを確認するためのDEBUGログ。
   */
  pool.on('connect', (client) => {
    logger.info(
      `[DEBUG][Pool:${pool.__poolId}] client connected`,
      {
        processId: client.processID,
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount,
      }
    )
  })

  /**
   * ClientがPoolから取得された場合
   *
   * 実際にどのClientが処理に利用されているかを
   * 確認するためのDEBUGログ。
   */
  pool.on('acquire', (client) => {
    logger.info(
      `[DEBUG][Pool:${pool.__poolId}] client acquired`,
      {
        processId: client.processID,
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount,
      }
    )
  })

  /**
   * ClientがPoolから削除された場合
   *
   * DB停止やネットワーク切断等により無効となったClientが、
   * Poolから実際に削除されたことを確認するためのDEBUGログ。
   */
  pool.on('remove', (client) => {
    logger.info(
      `[DEBUG][Pool:${pool.__poolId}] client removed`,
      {
        processId: client.processID,
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount,
      }
    )
  })

  /**
   * アイドル状態のClientで予期しないエラーが発生した場合
   *
   * DB停止やネットワーク切断等でClient接続が失われた場合でも、
   * Pool自体は破棄せず、そのまま利用を継続する。
   *
   * エラーとなったClientはpg側でPoolから除外され、
   * DB復旧後は同一Poolから新しいClientが作成される。
   */
  pool.on('error', (error, client) => {
    logger.error(
      `[DEBUG][Pool:${pool.__poolId}] pool client error occurred`,
      {
        processId: client?.processID,
        code: error.code,
        message: error.message,
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount,
      }
    )

    /**
     * DBの一時停止時には以下を実行しない。
     *
     * internalPool = null
     * pool.end()
     *
     * Poolを破棄すると、後続のgetPool()で新しいPoolが作成され、
     * 複数のPoolが同時に存在する可能性があるため。
     */
  })

  return pool
}

/**
 * PostgreSQL接続プールを取得する
 *
 * Poolが未作成の場合のみ新規作成する。
 * 通常はAPI起動時に作成された同一Poolを返却する。
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
    // 通常はAPI起動中に一度だけ出力される想定
    // ============================================================
    logger.info(
      '[DEBUG] internalPool is null. Creating new pool.'
    )

    internalPool = createNewPool()
  }

  // ============================================================
  // DEBUG確認用
  // 常に同じPoolが返却されていることを確認する
  // ============================================================
  logger.info(
    `[DEBUG] getPool -> Pool:${internalPool.__poolId}`
  )

  return internalPool
}

/**
 * 現在のPool状態をログ出力する
 *
 * DB停止前後でClient数がどのように変化するかを
 * 確認するためのDEBUG用メソッド。
 *
 * 確認完了後は削除またはコメントアウト可能。
 */
function logPoolStatus() {
  if (!internalPool) {
    logger.info('[DEBUG] walletDB pool is not initialized')
    return
  }

  logger.info(
    `[DEBUG][Pool:${internalPool.__poolId}] pool status`,
    {
      totalCount: internalPool.totalCount,
      idleCount: internalPool.idleCount,
      waitingCount: internalPool.waitingCount,
    }
  )
}

/**
 * API終了時にPostgreSQL接続プールを閉じる
 *
 * SIGINT / SIGTERM等によるAPI終了時のみ実行する。
 * DBの一時停止時には実行しない。
 */
async function close() {
  // 重複して終了処理を実行しない
  if (isShuttingDown) {
    return
  }

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
  // ============================================================
  logger.info(
    `[DEBUG][Pool:${pool.__poolId}] pool close started`,
    {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount,
    }
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
    /**
     * API終了時はPool自体が終了済みとなるため、
     * internalPoolの参照を解除する。
     */
    if (internalPool === pool) {
      internalPool = null
    }
  }
}

module.exports = {
  getPool,
  close,

  // DEBUG確認用
  // 確認完了後は削除またはコメントアウト可能
  logPoolStatus,
}
