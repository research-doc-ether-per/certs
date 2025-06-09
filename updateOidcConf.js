#!/usr/bin/env node
import fs from "fs";
import path from "path";
import os from "os";

// --- 配置区：硬编码你的代理地址 ---
const HTTP_PROXY  = "http://proxy.co.jp:18080";
const HTTPS_PROXY = "http://proxy.co.jp:18080";

// 构造 GRADLE_OPTS
const httpUrl  = new URL(HTTP_PROXY);
const httpsUrl = new URL(HTTPS_PROXY);
const GRADLE_OPTS = [
  `-Dhttp.proxyHost=${httpUrl.hostname}`,
  `-Dhttp.proxyPort=${httpUrl.port}`,
  `-Dhttps.proxyHost=${httpsUrl.hostname}`,
  `-Dhttps.proxyPort=${httpsUrl.port}`
].join(" ");

// 原始列表，支持 "~/…" 或者相对路径
const rawDockerfiles = [
  "Dockerfile",
  "~/work/waltid/issuer-api/Dockerfile",
  "~/work/waltid/verifier-api/Dockerfile",
  "~/work/waltid/wallet-api/Dockerfile",
  "serviceA/Dockerfile"
];

// 展开 "~/" 为家目录，其它按当前目录解析
const dockerfiles = rawDockerfiles.map(p => {
  if (p.startsWith("~/")) {
    return path.join(os.homedir(), p.slice(2));
  }
  return path.resolve(process.cwd(), p);
});

/**
 * 对单个 Dockerfile 注入代理行
 * @param {string} dockerfilePath
 */
function injectProxy(dockerfilePath) {
  const content = fs.readFileSync(dockerfilePath, "utf8");
  const lines = content.split(/\r?\n/);

  // 基础的 proxy ENV 行（无 GRADLE_OPTS）
  const baseProxyLines = [
    `ENV HTTP_PROXY=${HTTP_PROXY}`,
    `ENV HTTPS_PROXY=${HTTPS_PROXY}`,
    `ENV http_proxy=${HTTP_PROXY}`,
    `ENV https_proxy=${HTTPS_PROXY}`
  ];

  // 如果路径包含 issuer-api/verifier-api/wallet-api，就加上 GRADLE_OPTS
  const needsGradleOpts = /issuer-api|verifier-api|wallet-api/.test(dockerfilePath);
  const proxyLines = needsGradleOpts
    ? [...baseProxyLines, `ENV GRADLE_OPTS="${GRADLE_OPTS}"`]
    : baseProxyLines;

  const out = [];
  for (const line of lines) {
    out.push(line);
    if (/^\s*FROM\b/.test(line)) {
      proxyLines.forEach(l => out.push(l));
    }
  }

  fs.writeFileSync(dockerfilePath, out.join("\n"), "utf8");
  console.log(`✓ Processed ${dockerfilePath} (add GRADLE_OPTS: ${needsGradleOpts})`);
}

// 遍历处理
dockerfiles.forEach(filePath => {
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  File not found, skip: ${filePath}`);
    return;
  }
  injectProxy(filePath);
});
