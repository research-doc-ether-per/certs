function extractStatusFromCode(code) {
  if (code === null || code === undefined) return null;

  const str = String(code).trim();
  if (str.length < 3) return null;

  const status = Number.parseInt(str.slice(0, 3), 10);
  if (Number.isNaN(status)) return null;

  return status;
}

Object.entries(errorMessages).forEach(([name, definition]) => {
  if (!definition || !definition.error) {
    console.warn("不正なエラー定義のためスキップします:", name);
    return;
  }

  const { code, message } = definition.error;
  const status = extractStatusFromCode(code);

  openApiFragment.components.responses[name] = {
    description: name,
    content: {
      "application/json": {
        schema: {
          $ref: "#/components/schemas/ErrorResponse"
        },
        examples: {
          example: {
            value: {
              status,
              data: {
                code,
                message
              }
            }
          }
        }
      }
    }
  };
});
