const buildErrorExampleFromErrorMessages = (errorMessages, errorKey) => {
  logger.debug("buildErrorExampleFromErrorMessages start");
  try {
    if (!errorMessages || typeof errorMessages !== "object") return null;

    const def = errorMessages[errorKey];
    if (!def || typeof def !== "object") return null;

    const statusNum = def.status;
    const statusStr = statusNum !== undefined && statusNum !== null ? String(statusNum) : null;

    const err = def.error || {};
    const code = err.code;
    const message = err.message;

    if (code === undefined || code === null || !message) {
      return statusStr ? { status: statusStr, exampleValue: null } : null;
    }

    const exampleValue = { code, message };
    return { status: statusStr, exampleValue };
  } finally {
    logger.debug("buildErrorExampleFromErrorMessages end");
  }
};

const isHealthCheckError = (k) => String(k || "") === "HealthCheckError";


const applyErrorResponses = (op, errorKeys, errorMessages) => {
  logger.debug("applyErrorResponses start");
  try {
    if (!op || !Array.isArray(errorKeys) || errorKeys.length === 0) return;
    if (!op.responses || typeof op.responses !== "object") op.responses = {};

    const isHealthCheckError = (k) => String(k || "") === "HealthCheckError";

    const byStatus = new Map();
    for (const k of errorKeys) {
      const errorKey = toStrOrNull(k);
      if (!errorKey) continue;

      const built = buildErrorExampleFromErrorMessages(errorMessages, errorKey);
      if (!built || !built.status || !built.exampleValue) continue;

      const status = built.status;
      if (!byStatus.has(status)) byStatus.set(status, []);
      byStatus.get(status).push({ errorKey, exampleValue: built.exampleValue });
    }

    for (const [status, items] of byStatus.entries()) {
      if (!op.responses[status]) {
        op.responses[status] = { description: `Error ${status}` };
      }
      const res = op.responses[status];

      res.content = res.content || {};
      res.content["application/json"] = res.content["application/json"] || {};

      const hasHealth = items.some((it) => isHealthCheckError(it.errorKey));
      res.content["application/json"].schema = {
        $ref: hasHealth ? "#/components/schemas/HealthCheckErrorEnvelope" : "#/components/schemas/ErrorResponse",
      };

      const examples = {};
      for (const it of items) {
        const v = isHealthCheckError(it.errorKey)
          ? {
              error: {
                code: it.exampleValue.code,
                message: it.exampleValue.message,
                details: [
                  {
                    code: 500004,
                    message: "[CloudWallet] health check waltid wallet api error.",
                    detail: "~~~~（エラー内容）",
                  },
                ],
              },
            }
          : it.exampleValue;

        examples[it.errorKey] = { value: v };
      }
      res.content["application/json"].examples = examples;
    }
  } finally {
    logger.debug("applyErrorResponses end");
  }
};



const ensureErrorResponseSchema = (openapi) => {
  logger.debug("ensureErrorResponseSchema start");
  try {
    if (!openapi.components) openapi.components = {};
    if (!openapi.components.schemas) openapi.components.schemas = {};

    // ErrorResponse: 共通
    openapi.components.schemas.ErrorResponse = {
      type: "object",
      required: ["code", "message"],
      properties: {
        code: { type: "integer", format: "int32", description: "エラーコード" },
        message: { type: "string", description: "エラーメッセージ" },
      },
    };

    // HealthCheck 用 schemas（details 必須）
    if (!openapi.components.schemas.HealthCheckErrorDetail) {
      openapi.components.schemas.HealthCheckErrorDetail = {
        type: "object",
        required: ["code", "message", "detail"],
        properties: {
          code: { type: "integer", format: "int32", description: "エラーコード（詳細）" },
          message: { type: "string", description: "エラーメッセージ（詳細）" },
          detail: { type: "string", description: "エラー内容" },
        },
      };
    }

    if (!openapi.components.schemas.HealthCheckErrorResponse) {
      openapi.components.schemas.HealthCheckErrorResponse = {
        type: "object",
        required: ["code", "message", "details"],
        properties: {
          code: { type: "integer", format: "int32", description: "エラーコード" },
          message: { type: "string", description: "エラーメッセージ" },
          details: {
            type: "array",
            description: "ヘルスチェックの詳細エラー",
            items: { $ref: "#/components/schemas/HealthCheckErrorDetail" },
          },
        },
      };
    }

    if (!openapi.components.schemas.HealthCheckErrorEnvelope) {
      openapi.components.schemas.HealthCheckErrorEnvelope = {
        type: "object",
        required: ["error"],
        properties: {
          error: { $ref: "#/components/schemas/HealthCheckErrorResponse" },
        },
      };
    }
  } finally {
    logger.debug("ensureErrorResponseSchema end");
  }
};

