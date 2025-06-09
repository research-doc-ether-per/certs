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

// 要处理的 Dockerfile 列表（支持 "~/…" 或相对路径）
const rawDockerfiles = [
  "Dockerfile",
  "~/work/waltid/issuer-api/Dockerfile",
  "~/work/waltid/verifier-api/Dockerfile",
  "~/work/waltid/wallet-api/Dockerfile",
  "serviceA/Dockerfile"
];

// 展开 "~/" 并解析路径
const dockerfiles = rawDockerfiles.map(p =>
  p.startsWith("~/")
    ? path.join(os.homedir(), p.slice(2))
    : path.resolve(process.cwd(), p)
);

function injectProxy(dockerfilePath) {
  const content = fs.readFileSync(dockerfilePath, "utf8");
  const lines = content.split(/\r?\n/);

  // 基础的 proxy ENV 行
  const baseProxyLines = [
    `ENV HTTP_PROXY=${HTTP_PROXY}`,
    `ENV HTTPS_PROXY=${HTTPS_PROXY}`,
    `ENV http_proxy=${HTTP_PROXY}`,
    `ENV https_proxy=${HTTPS_PROXY}`
  ];

  // 检查路径里是否包含关键字，决定是否需要 GRADLE_OPTS
  const needsGradleOpts = /issuer-api|verifier-api|wallet-api/.test(dockerfilePath);
  const proxyLines = needsGradleOpts
    ? [...baseProxyLines, `ENV GRADLE_OPTS="${GRADLE_OPTS}"`]
    : baseProxyLines;

  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    out.push(line);

    if (/^\s*FROM\b/.test(line)) {
      // 在原文件里看一下，紧跟的几行是否已包含第一个 proxyLines[0]
      const segment = lines.slice(i + 1, i + 1 + proxyLines.length);
      const already = segment.some(l => l.trim() === proxyLines[0]);

      if (already) {
        console.log(`ℹ️  Skip injecting into ${dockerfilePath} at line ${i + 1}, already present.`);
      } else {
        proxyLines.forEach(l => out.push(l));
        console.log(`✓ Injected proxy${needsGradleOpts ? "+GRADLE_OPTS" : ""} into ${dockerfilePath} at line ${i + 1}`);
      }
    }
  }

  fs.writeFileSync(dockerfilePath, out.join("\n"), "utf8");
}

// 批量处理
dockerfiles.forEach(filePath => {
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  File not found, skip: ${filePath}`);
    return;
  }
  injectProxy(filePath);
});
