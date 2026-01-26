/**
 * gen-openapi-auto.js
 *
 * 目的:
 * - config（tools/swagger/config/*.json）を読み込み
 * - API 実装（endpointsFiles）を元に OpenAPI を自動生成し
 * - outputPath に openapi_auto.yaml を出力する
 *
 * 動作:
 * - swagger-autogen がインストールされている場合: ルート解析して paths を生成
 * - swagger-autogen が無い場合: 最低限の OpenAPI 骨組み（paths: {}）を生成
 */

const fs = require("fs");
const path = require("path");
const os = require("os");
const YAML = require("yaml");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

/**
 * "~" をホームディレクトリに展開する
 */
function expandHome(p) {
  if (!p || typeof p !== "string") return p;
  if (p === "~") return os.homedir();
  if (p.startsWith("~/") || p.startsWith("~\\")) {
    return path.join(os.homedir(), p.slice(2));
  }
  return p;
}

/**
 * 相対パスを tools/swagger/ 基準で解決する
 * - config 内のパスが相対の場合、tools/swagger からの相対として扱う
 */
function resolveFromSwaggerRoot(swaggerRootDir, p) {
  const expanded = expandHome(p);
  if (!expanded) return expanded;
  if (path.isAbsolute(expanded)) return expanded;
  return path.resolve(swaggerRootDir, expanded);
}

/**
 * endpointsFiles は string でも array でも受け付ける
 */
function normalizeEndpointsFiles(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean);
  return [v].filter(Boolean);
}

/**
 * OpenAPI のベース骨組み（paths は後で埋める）
 */
function buildBaseOpenApi(config) {
  return {
    openapi: "3.0.3",
    info: {
      title: config.title || "API",
      description: config.description || "",
      version: config.version || "1.0.0"
    },
    servers: [
      {
        url: config.url || "http://localhost",
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
    },
    paths: {}
  };
}

/**
 * swagger-autogen があれば使用する（任意依存）
 * - 返り値: 生成された OpenAPI オブジェクト
 */
async function generateWithSwaggerAutogen(openapiBase, endpointsFilesAbs, tempJsonOutAbs) {
  let swaggerAutogen;
  try {
    swaggerAutogen = require("swagger-autogen");
  } catch (e) {
    return null;
  }

  // swagger-autogen は関数を返すケースが多い: swaggerAutogen(options)(outputFile, endpoints, doc)
  const gen = swaggerAutogen({ openapi: openapiBase.openapi });

  // JSON に出力させる（後で読み込んで YAML に変換）
  await gen(tempJsonOutAbs, endpointsFilesAbs, openapiBase);

  // 生成された JSON を読み込む
  const generated = readJson(tempJsonOutAbs);
  return generated;
}

async function main() {
  // scripts/ から見た tools/swagger ルート
  const swaggerRootDir = path.resolve(__dirname, "..");

  // configPath: 引数があればそれを使う。なければデフォルト
  const configPathArg = process.argv[2];
  const configPathAbs = configPathArg
    ? path.resolve(process.cwd(), configPathArg)
    : path.resolve(swaggerRootDir, "config", "wallet-api.json");

  if (!fs.existsSync(configPathAbs)) {
    console.error("config が見つかりません:", configPathAbs);
    process.exit(1);
  }

  const configRaw = readJson(configPathAbs);

  // outputPath / endpointsFiles を解決
  const outputDirAbs = resolveFromSwaggerRoot(swaggerRootDir, configRaw.outputPath);
  if (!outputDirAbs) {
    console.error("config.outputPath が未設定です");
    process.exit(1);
  }
  ensureDir(outputDirAbs);

  const endpointsFiles = normalizeEndpointsFiles(configRaw.endpointsFiles);
  const endpointsFilesAbs = endpointsFiles.map((p) => resolveFromSwaggerRoot(swaggerRootDir, p));

  // 出力ファイル名（確定）
  const outYamlPathAbs = path.join(outputDirAbs, "openapi_auto.yaml");

  // base openapi
  const openapiBase = buildBaseOpenApi(configRaw);

  // swagger-autogen が利用可能なら paths を生成
  // temp 出力（json）
  const tempJsonOutAbs = path.join(outputDirAbs, ".openapi_auto.tmp.json");

  let finalOpenApi = null;

  if (endpointsFilesAbs.length > 0) {
    // endpointsFiles の存在チェック（無い場合は骨組み生成にフォールバック）
    const missing = endpointsFilesAbs.filter((p) => !fs.existsSync(p));
    if (missing.length > 0) {
      console.warn("endpointsFiles が見つからないため、paths は空で生成します:");
      for (const m of missing) console.warn(" -", m);
    } else {
      const generated = await generateWithSwaggerAutogen(openapiBase, endpointsFilesAbs, tempJsonOutAbs);
      if (generated) {
        finalOpenApi = generated;
      } else {
        console.warn("swagger-autogen が未インストールのため、paths は空で生成します。");
      }
    }
  } else {
    console.warn("config.endpointsFiles が未設定のため、paths は空で生成します。");
  }

  // swagger-autogen が使えなかった場合はベースのみ
  if (!finalOpenApi) {
    finalOpenApi = openapiBase;
  } else {
    // 生成物に securitySchemes が無い場合もあるため、最低限は補完する
    finalOpenApi.components = finalOpenApi.components || {};
    finalOpenApi.components.securitySchemes = finalOpenApi.components.securitySchemes || openapiBase.components.securitySchemes;

    // servers/info が欠けることもあるので補完
    finalOpenApi.info = finalOpenApi.info || openapiBase.info;
    finalOpenApi.servers = finalOpenApi.servers || openapiBase.servers;
  }

  // YAML 出力
  const yamlText = YAML.stringify(finalOpenApi);
  fs.writeFileSync(outYamlPathAbs, yamlText, "utf8");

  // temp json を削除（存在する場合）
  if (fs.existsSync(tempJsonOutAbs)) {
    try {
      fs.unlinkSync(tempJsonOutAbs);
    } catch (_) {
      // 削除失敗しても致命ではない
    }
  }

  console.log(outYamlPathAbs);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
