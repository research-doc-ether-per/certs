
{
  "name": "waltid-custom-migration",
  "version": "1.0.0",
  "private": true,
  "description": "walt.id v0.15.1 to v1.0.0 PostgreSQL custom migration tool",
  "type": "commonjs",
  "main": "src/index.js",
  "scripts": {
    "db:init": "node src/index.js init",
    "migrate:dry-run": "node src/index.js migrate --dry-run",
    "migrate": "node src/index.js migrate",
    "verify": "node src/index.js verify",
    "check": "node --check src/index.js"
  },
  "engines": {
    "node": ">=22.0.0"
  },
  "dependencies": {
    "dotenv": "^16.4.5",
    "pg": "^8.13.1"
  }
}
