const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const errorMessagesPath = path.join(__dirname, "../config/errorMessages.json");

const docsDir = path.join(__dirname, "../docs");
const outputPath = path.join(docsDir, "error-responses.yaml");

if (!fs.existsSync(errorMessagesPath)) {
  console.error("errorMessages.json が見つかりません:", errorMessagesPath);
  process.exit(1);
}

if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
}

const errorMessages = JSON.parse(fs.readFileSync(errorMessagesPath, "utf8"));

const openApiFragment = {
  components: {
    schemas: {
      ErrorResponse: {
        type: "object",
        required: ["code", "message"],
        properties: {
          code: {
            type: "integer",
            format: "int32",
            description: "エラーコード"
          },
          message: {
            type: "string",
            description: "エラーメッセージ"
          },
          detail: {
            type: "string",
            nullable: true,
            description: "追加情報（存在する場合のみ）"
          }
        }
      }
    },
    responses: {}
  }
};

function normalizeCode(code) {
  if (typeof code === "number" && Number.isFinite(code)) return code;
  if (typeof code === "string") {
    const trimmed = code.trim();
    const parsed = Number.parseInt(trimmed, 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return code;
}

Object.entries(errorMessages).forEach(([errorKey, definition]) => {
  if (!definition || typeof definition !== "object") {
    console.warn("不正なエラー定義のためスキップします:", errorKey);
    return;
  }

  if (!definition.error || typeof definition.error !== "object") {
    console.warn("error が存在しないためスキップします:", errorKey);
    return;
  }

  const rawError = definition.error;

  const exampleValue = {
    ...rawError,
    code: normalizeCode(rawError.code)
  };

  openApiFragment.components.responses[errorKey] = {
    description: errorKey,
    content: {
      "application/json": {
        schema: {
          $ref: "#/components/schemas/ErrorResponse"
        },
        examples: {
          example: {
            value: exampleValue
          }
        }
      }
    }
  };
});

const yamlString = yaml.dump(openApiFragment, {
  noRefs: true,
  lineWidth: -1
});

fs.writeFileSync(outputPath, yamlString, "utf8");

console.log("error-responses.yaml を生成しました:");
console.log(outputPath);
