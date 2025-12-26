# スクリプトに実行権限を付与
cd ~/workspace/cloudcredentialservice/
chmod +x ./docker/issuer-api/docker_manager.sh

# --- 事前準備（初回のみ）---------------------------------
# cosign が入っていることを確認
cosign version

# cosign key-pair を生成（初回のみ）
# ※秘密鍵 cosign.key は git 管理外にしてください
mkdir -p ./security/cosign
cosign generate-key-pair --output-key-prefix ./security/cosign/cosign

# （任意）秘密鍵を commit しないようにする
# echo "security/cosign/cosign.key" >> .gitignore
# echo "security/cosign/image.digest" >> .gitignore
# ---------------------------------------------------------

# 例：image_tag（任意。指定しない場合はスクリプト側の仕様に従う）
cd ~/workspace/cloudcredentialservice/
IMAGE_TAG=2051226

# 1) ビルド（digest を記録）
cd ~/workspace/cloudcredentialservice/
./docker/issuer-api/docker_manager.sh build ${IMAGE_TAG}

# 2) 署名（digest 単位で署名）
cd ~/workspace/cloudcredentialservice/
./docker/issuer-api/docker_manager.sh sign ${IMAGE_TAG}

# 3) 検証（起動前に verify）
cd ~/workspace/cloudcredentialservice/
./docker/issuer-api/docker_manager.sh verify ${IMAGE_TAG}

# 4) 起動（検証OKの digest 固定で起動）
cd ~/workspace/cloudcredentialservice/
./docker/issuer-api/docker_manager.sh start-verified ${IMAGE_TAG}

# 再起動（検証済み digest 固定で再起動したい場合）
cd ~/workspace/cloudcredentialservice/
./docker/issuer-api/docker_manager.sh restart ${IMAGE_TAG}

# 停止
cd ~/workspace/cloudcredentialservice/
./docker/issuer-api/docker_manager.sh stop ${IMAGE_TAG}

# 初期化（volume 含めて削除→起動）
cd ~/workspace/cloudcredentialservice/
./docker/issuer-api/docker_manager.sh init ${IMAGE_TAG}

# コンテナ削除
cd ~/workspace/cloudcredentialservice/
./docker/issuer-api/docker_manager.sh clear ${IMAGE_TAG}

# コンテナに shell で入る
cd ~/workspace/cloudcredentialservice/
./docker/issuer-api/docker_manager.sh access ${IMAGE_TAG}

# ログ確認（コンテナ名で追うのが安定）
docker logs -f cloud-issuer-api

コンテナ内で実行されるアプリケーションユーザー（UID:10001）に所有権を付与します

Docker コンテナは非 root ユーザーで動作するため、書き込み権限が必須です
ホスト側の操作ユーザー（例：ubuntu）に対して読み取り・ディレクトリ参照権限を追加します
