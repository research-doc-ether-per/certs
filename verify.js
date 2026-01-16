// src/middlewares/commonMonitoringFinal.js

/**
 * 成功とみなす HTTP ステータス（性能ログ出力対象）
 * @type {Set<number>}
 */
const SUCCESS_STATUS_FOR_LATENCY = new Set([200, 201, 204]);

/**
 * JSON 文字列化（失敗時は安全な文字列を返す）
 * @param {any} obj - 文字列化対象
 * @returns {string} JSON文字列
 */
function safeJsonStringify(obj) {
  try {
    return JSON.stringify(obj);
  } catch {
    return "[unserializable]";
  }
}

/**
 * ISO8601（ミリ秒）形式の日時文字列を生成
 * @param {number} ms - epoch ミリ秒
 * @returns {string} ISO8601 文字列
 */
function isoWithMs(ms) {
  return new Date(ms).toISOString();
}

/**
 * 文字列を指定長で切り詰める
 * @param {string} str - 対象文字列
 * @param {number} max - 最大長
 * @returns {string} 切り詰め後の文字列
 */
function truncate(str, max = 8000) {
  if (typeof str !== "string") str = String(str ?? "");
  return str.length > max ? str.slice(0, max) + "...(truncated)" : str;
}

/**
 * フルURL（クエリ含む）を生成
 * @param {import("express").Request} req - Express Request
 * @returns {string} フルURL
 */
function buildFullUrl(req) {
  return `${req.protocol}://${req.get("host")}${req.originalUrl}`;
}

/**
 * 共通監視ログ Middleware を生成
 *
 * 【仕様】
 * - REQUEST / RESPONSE / LATENCY を出力（JSON文字列）
 * - 監視処理でのエラーは業務処理に影響させない（例外は握りつぶす）
 * - introspect がある API は finish 時に req.kcUser から sub/azp を取得
 * - BILLING（料金算出情報登録）はログに詳細を出さず、成否のみを出力
 *
 * @param {Object} params - パラメータ
 * @param {Object} params.logger - logger（info / warn / debug を想定）
 * @param {Function} [params.registerAccessInfo] - 料金算出情報登録関数（非同期可）
 * @param {number} [params.maxReqBodyLen] - REQUEST.body の最大長
 * @param {number} [params.maxDetailLen] - RESPONSE.detail の最大長
 * @returns {import("express").RequestHandler} Express Middleware
 */
function createCommonMonitoringMiddleware({
  logger,
  registerAccessInfo,
  maxReqBodyLen = 4000,
  maxDetailLen = 8000,
}) {
  if (!logger || typeof logger.info !== "function") {
    throw new Error("logger.info is required");
  }

  /**
   * warn 出力（warn 自体の失敗も無視）
   * @param {string} message - warn メッセージ
   * @returns {void}
   */
  function warnMessageSafe(message) {
    try {
      if (typeof logger.warn === "function") {
        logger.warn(message);
      } else {
        logger.info(message);
      }
    } catch {
      // ignore
    }
  }

  /**
   * debug 出力（debug 自体の失敗も無視）
   * @param {string} message - debug メッセージ
   * @returns {void}
   */
  function debugMessageSafe(message) {
    try {
      if (typeof logger.debug === "function") {
        logger.debug(message);
      }
    } catch {
      // ignore
    }
  }

  /**
   * 監視処理エラー用 warn ログ（JSON）
   * @param {Object} args - 引数
   * @param {string} args.stage - 発生箇所（REQUEST/RESPONSE/LATENCY/MIDDLEWARE）
   * @param {import("express").Request} args.req - Request
   * @param {import("express").Response} args.res - Response
   * @param {Error} args.err - エラー
   * @param {Object} [args.extra] - 追加情報
   * @returns {void}
   */
  function warnMonitoring(stage, req, res, err, extra) {
    try {
      const payload = {
        key: "MONITORING_WARN",
        stage,
        method: req?.method,
        url: (() => {
          try {
            return buildFullUrl(req);
          } catch {
            return req?.originalUrl ?? "";
          }
        })(),
        status: res?.statusCode,
        message: truncate(err?.message ?? String(err ?? ""), 500),
        code: err?.code,
        datetime: isoWithMs(Date.now()),
        ...extra,
      };
      warnMessageSafe(safeJsonStringify(payload));
    } catch {
      // ignore
    }
  }

  /**
   * Express Middleware 本体
   * @param {import("express").Request} req - Request
   * @param {import("express").Response} res - Response
   * @param {import("express").NextFunction} next - Next
   * @returns {void}
   */
  return function commonMonitoring(req, res, next) {
    try {
      const startMs = Date.now();
      const url = buildFullUrl(req);

      // ===== REQUEST ログ（受信時）=====
      try {
        const bodyStr =
          req.body === undefined
            ? ""
            : truncate(safeJsonStringify(req.body), maxReqBodyLen);

        logger.info(
          safeJsonStringify({
            key: "REQUEST",
            url,
            userId: null, // introspect 無し API を考慮（必要なら後段仕様で補完）
            body: bodyStr,
            datetime: isoWithMs(startMs),
          })
        );
      } catch (err) {
        warnMonitoring("REQUEST", req, res, err);
      }

      // ===== RESPONSE 内容キャプチャ =====
      // ※ 204 は body が無い想定のため、detail が空でも問題なし
      let captured = false;
      let detail = "";

      const origJson = res.json?.bind(res);
      const origSend = res.send?.bind(res);
      const origEnd = res.end?.bind(res);

      if (origJson) {
        res.json = (body) => {
          try {
            if (!captured) {
              captured = true;
              detail = truncate(
                typeof body === "string" ? body : safeJsonStringify(body),
                maxDetailLen
              );
            }
          } catch (err) {
            warnMonitoring("RESPONSE", req, res, err, { note: "capture_json_failed" });
          }
          return origJson(body);
        };
      }

      if (origSend) {
        res.send = (body) => {
          try {
            if (!captured) {
              captured = true;
              detail = truncate(
                typeof body === "string" ? body : safeJsonStringify(body),
                maxDetailLen
              );
            }
          } catch (err) {
            warnMonitoring("RESPONSE", req, res, err, { note: "capture_send_failed" });
          }
          return origSend(body);
        };
      }

      // 204 などで res.end() が直接呼ばれるケースに備える
      if (origEnd) {
        res.end = (chunk, encoding, cb) => {
          try {
            if (!captured && chunk != null) {
              captured = true;
              detail = truncate(String(chunk), maxDetailLen);
            }
          } catch (err) {
            warnMonitoring("RESPONSE", req, res, err, { note: "capture_end_failed" });
          }
          return origEnd(chunk, encoding, cb);
        };
      }

      // ===== finish イベント（送信完了後）=====
      res.on("finish", () => {
        const endMs = Date.now();
        const latency = endMs - startMs;

        // introspect 実施済み API のみ値が入る
        const userId = req.kcUser?.sub ?? null;
        const service = req.kcUser?.azp ?? null;

        // RESPONSE ログ（エラー時も出力）
        try {
          logger.info(
            safeJsonStringify({
              key: "RESPONSE",
              url,
              userId,
              status: res.statusCode,
              detail: captured ? detail : "",
              datetime: isoWithMs(endMs),
            })
          );
        } catch (err) {
          warnMonitoring("RESPONSE", req, res, err);
        }

        // LATENCY ログ（成功時のみ：200/201/204）
        try {
          if (SUCCESS_STATUS_FOR_LATENCY.has(res.statusCode)) {
            logger.info(
              safeJsonStringify({
                key: "LATENCY",
                url,
                start: isoWithMs(startMs),
                end: isoWithMs(endMs),
                latency,
              })
            );
          }
        } catch (err) {
          warnMonitoring("LATENCY", req, res, err);
        }

        // ===== BILLING（料金算出情報登録）=====
        // ・詳細データはログに出さない
        // ・成功時：debug
        // ・失敗時：warn
        // ・業務処理は継続
        if (typeof registerAccessInfo === "function") {
          const accessInfo = { url, user_id: userId, service, receive: startMs };

          try {
            Promise.resolve(registerAccessInfo(accessInfo))
              .then(() => {
                debugMessageSafe("billing insert successful");
              })
              .catch(() => {
                warnMessageSafe("billing insert failed");
              });
          } catch {
            warnMessageSafe("billing insert failed");
          }
        }
      });
    } catch (err) {
      // Middleware 自体の例外も無視（warn のみ）
      warnMonitoring("MIDDLEWARE", req, res, err);
    }

    return next();
  };
}

module.exports = { createCommonMonitoringMiddleware };

