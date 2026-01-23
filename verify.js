// generate-error-responses.js

const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const errorMessagesPath = path.join(
  __dirname,
  "../config/errorMessages.json"
);

const docsDir = path.join(__dirname, "../docs");
const outputPath = path.join(docsDir, "error-responses.yaml");

if (!fs.existsSync(errorMessagesPath)) {
  console.error("errorMessages.json が見つかりません:", errorMessagesPath);
  process.exit(1);
}

if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
}

const errorMessages = JSON.parse(
  fs.readFileSync(errorMessagesPath, "utf8")
);

const openApiFragment = {
  components: {
    schemas: {
      ErrorResponse: {
        type: "object",
        required: ["code", "message"],
        properties: {
          code: {
            type: "string",
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

Object.entries(errorMessages).forEach(([name, definition]) => {
  if (!definition || !definition.error) {
    console.warn("不正なエラー定義のためスキップします:", name);
    return;
  }

  const { code, message } = definition.error;

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
              code,
              message
            }
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

