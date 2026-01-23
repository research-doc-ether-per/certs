const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const errorMessagesPath = path.join(
  __dirname,
  "../config/errorMessages.json"
);

const outputPath = path.join(
  __dirname,
  "../docs/generated-error-responses.yaml"
);

if (!fs.existsSync(errorMessagesPath)) {
  console.error("❌ errorMessages.json not found:", errorMessagesPath);
  process.exit(1);
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
          code: { type: "string" },
          message: { type: "string" },
          detail: { type: "string", nullable: true }
        }
      }
    },
    responses: {}
  }
};

Object.entries(errorMessages).forEach(([name, def]) => {
  if (!def || !def.error) {
    console.warn(`⚠️ skip invalid error definition: ${name}`);
    return;
  }

  const { code, message } = def.error;

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

const yamlStr = yaml.dump(openApiFragment, {
  noRefs: true,
  lineWidth: -1
});

fs.writeFileSync(outputPath, yamlStr, "utf8");

console.log("✅ Swagger error responses generated:");
console.log("   →", outputPath);
