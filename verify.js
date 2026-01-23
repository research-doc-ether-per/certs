const fs = require("fs");
const path = require("path");
const swaggerAutogen = require("swagger-autogen")();
const doc = require("./template");


const docsDir = path.join(__dirname, "../docs");

const outputFile = path.join(docsDir, "swagger.json");

const endpointsFiles = [
  path.join(__dirname, "../app.js"),
];

if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
  // eslint-disable-next-line no-console
  console.log("✔ created docs directory:", docsDir);
}

swaggerAutogen(outputFile, endpointsFiles, doc).then(() => {
  // eslint-disable-next-line no-console
  console.log("✔ swagger.json generated:", outputFile);
});
