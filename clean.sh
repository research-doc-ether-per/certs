
############################################
# ④ OSS 依存関係の管理
# 理由：
# ・npm install は実行タイミングによって依存が変わる可能性がある
# ・lockfile 通りに確実に依存関係を固定するため npm ci を使用
# ・issuer-web は next を dependencies に含めているため、
#   本番実行に不要な devDependencies はインストールしない
############################################
RUN cd ./issuer-web \
  && npm ci --omit=dev \
  && npm run build \
  && npm cache clean --force
