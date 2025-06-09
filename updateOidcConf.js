#!/usr/bin/env node
import fs from "fs";
import path from "path";

// --- 配置区：硬编码你的代理地址和 GRADLE_OPTS ---
const HTTP_PROXY = "http://proxy.co.jp:18080";
const HTTPS_PROXY = "http://proxy.co.jp:18080";

// 从 HTTP_PROXY/HTTPS_PROXY 提取 host 和 port
const httpUrl = new URL(HTTP_PROXY);
const httpsUrl = new URL(HTTPS_PROXY);
const GRADLE_OPTS = [
  `-Dhttp.proxyHost=${httpUrl.hostname}`,
  `-Dhttp.proxyPort=${httpUrl.port}`,
  `-Dhttps.proxyHost=${httpsUrl.hostname}`,
  `-Dhttps.proxyPort=${httpsUrl.port}`
].join(" ");

// 你要处理的所有 Dockerfile 路径列表（相对或绝对都可以）
const dockerfiles = [
  "Dockerfile",
  "serviceA/Dockerfile",
  "serviceB/Dockerfile.prod"
];

function injectProxyAndGradleOpts(dockerfilePath) {
  // 1. 读取原始 Dockerfile
  const content = fs.readFileSync(dockerfilePath, "utf-8");
  const lines = content.split(/\r?\n/);

  // 2. 构造要插入的 ENV 行
  const proxyEnvLines = [
    `ENV HTTP_PROXY=${HTTP_PROXY}`,
    `ENV HTTPS_PROXY=${HTTPS_PROXY}`,
    `ENV http_proxy=${HTTP_PROXY}`,
    `ENV https_proxy=${HTTPS_PROXY}`,
    `ENV GRADLE_OPTS="${GRADLE_OPTS}"`
  ];

  // 3. 遍历每一行，遇到 FROM 就插入
  const out = [];
  for (const line of lines) {
    out.push(line);
    if (/^\s*FROM\b/.test(line)) {
      proxyEnvLines.forEach(l => out.push(l));
    }
  }

  // 4. 写回同一个文件
  fs.writeFileSync(dockerfilePath, out.join("\n"), "utf-8");
  console.log(`✓ Injected proxy+GRADLE_OPTS into ${dockerfilePath}`);
}

// 5. 对数组中每个文件执行注入
dockerfiles.forEach(file => {
  const fullPath = path.resolve(process.cwd(), file);
  if (!fs.existsSync(fullPath)) {
    console.warn(`⚠️  文件不存在，跳过：${fullPath}`);
    return;
  }
  injectProxyAndGradleOpts(fullPath);
});
