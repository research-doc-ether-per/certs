npm i swagger-autogen swagger-ui-express yamljs js-yaml
{
  "scripts": {
    "dev": "node app.js",
    "start": "node app.js",

    "swagger:gen": "node swagger/swagger-autogen.js",
    "swagger:yaml": "node swagger/json-to-yaml.js",
    "swagger": "npm run swagger:gen && npm run swagger:yaml"
  }
}
// services/issuer-api/swagger/template.js
module.exports = {
  openapi: "3.0.3",
  info: {
    title: "Issuer API",
    description: "Issuer service API documentation",
    version: "1.0.0"
  },
  servers: [
    {
      url: "http://localhost:6002",
      description: "Local"
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT"
      }
    }
  }
};

// services/issuer-api/swagger/swagger-autogen.js
const swaggerAutogen = require("swagger-autogen")();
const path = require("path");
const doc = require("./template");

const outputFile = path.join(__dirname, "../docs/swagger.json");

const endpointsFiles = [path.join(__dirname, "../app.js")];

swaggerAutogen(outputFile, endpointsFiles, doc).then(() => {
  console.log("✔ swagger.json generated:", outputFile);
});


// services/issuer-api/swagger/json-to-yaml.js
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const jsonPath = path.join(__dirname, "../docs/swagger.json");
const yamlPath = path.join(__dirname, "../docs/swagger.yaml");

if (!fs.existsSync(jsonPath)) {
  // eslint-disable-next-line no-console
  console.error("✖ swagger.json not found. Run `npm run swagger:gen` first.");
  process.exit(1);
}

const json = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
const yamlStr = yaml.dump(json, {
  noRefs: true,
  lineWidth: -1
});

fs.writeFileSync(yamlPath, yamlStr, "utf8");

// eslint-disable-next-line no-console
console.log("✔ swagger.yaml generated:", yamlPath);

const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");

// --- Swagger Docs ---
const swaggerPath = path.join(__dirname, "docs/swagger.yaml");

if (require("fs").existsSync(swaggerPath)) {
  const swaggerDoc = YAML.load(swaggerPath);
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDoc));
  app.get("/docs.json", (req, res) => res.json(swaggerDoc));
} else {
  logger && logger.warn
    ? logger.warn("swagger.yaml not found. Run `npm run swagger` to generate docs.")
    : console.warn("swagger.yaml not found. Run `npm run swagger` to generate docs.");
}


