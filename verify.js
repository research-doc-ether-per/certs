// wallet2-persistence-change.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// waltid-identity-1.0.0 のルートディレクトリ
const ROOT_DIR = path.resolve(__dirname, "..");

const CONFIG_FILES = [
  path.join(
    ROOT_DIR,
    "docker-compose/wallet-api2/config/wallet2-persistence.conf"
  ),
  path.join(
    ROOT_DIR,
    "waltid-services/waltid-wallet-api2/config/wallet2-persistence.conf"
  ),
];

const POSTGRES_CONFIG = `jdbcUrl = "jdbc:postgresql://\${POSTGRES_DB_HOST}:5432/\${DB_NAME}"
driverClassName = "org.postgresql.Driver"
username = "\${DB_USERNAME}"
password = "\${DB_PASSWORD}"
maximumPoolSize = 10
minimumIdle = 2
`;

const SQLITE_CONFIG = `jdbcUrl = "jdbc:sqlite:data/wallet2.db"
driverClassName = "org.sqlite.JDBC"
`;

/**
 * Wallet2 Persistence の設定を変更する。
 *
 * @param {"postgres" | "sqlite"} type 保存方式
 */
const changePersistence = (type) => {
  console.debug("=== changePersistence start ===");

  try {
    let config;

    switch (type) {
      case "postgres":
        config = POSTGRES_CONFIG;
        break;

      case "sqlite":
        config = SQLITE_CONFIG;
        break;

      default:
        throw new Error(
          `Unsupported persistence type: ${type}. Use "postgres" or "sqlite".`
        );
    }

    for (const configFile of CONFIG_FILES) {
      if (!fs.existsSync(configFile)) {
        throw new Error(`Config file not found: ${configFile}`);
      }

      fs.writeFileSync(configFile, config, "utf8");

      console.log(`Updated: ${configFile}`);
    }

    console.log(`Wallet2 persistence changed to: ${type}`);
  } catch (error) {
    console.error("error.message: ", error.message);
    console.error("error.stack: ", error.stack);
    throw error;
  } finally {
    console.debug("=== changePersistence end ===");
  }
};

const main = () => {
  const type = process.argv[2];

  if (!type) {
    console.error(
      "Usage: node wallet2-persistence-change.js <postgres|sqlite>"
    );
    process.exit(1);
  }

  changePersistence(type);
};

main();
