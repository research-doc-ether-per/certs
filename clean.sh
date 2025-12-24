# Next の build は devDependencies を使う構成も多いので、
# まずは lockfile 通りに全部入れて build し、
# 最後に不要な devDependencies を落とす
RUN cd ./issuer-web \
  && npm ci \
  && npm run build \
  && npm prune --omit=dev \
  && npm cache clean --force
