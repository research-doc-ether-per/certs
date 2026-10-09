# kc / vc で始まるコンテナ以外を確認
docker ps --format '{{.ID}} {{.Names}}' | awk '$2 !~ /^(kc|vc)/'

# kc / vc で始まるコンテナ以外を停止・削除
docker ps --format '{{.ID}} {{.Names}}' | awk '$2 !~ /^(kc|vc)/ {print $1}' | xargs -r docker rm -f


# 使用されていない Docker Image をすべて削除
# ※ コンテナから参照されている Image は削除されません
docker image prune -a


# wallet-api2 のビルド成果物を削除
./gradlew :waltid-services:waltid-wallet-api2:clean


# wallet-api2 の Docker Image を stable タグでビルド
./gradlew :waltid-services:waltid-wallet-api2:jibDockerBuild \
  -Djib.to.image=waltid/wallet-api2:stable


# wallet-api2 の Docker Image を確認
docker images | grep wallet-api2
