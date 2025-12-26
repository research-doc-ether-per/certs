### 2. cosign を使ったフロー（ローカル環境）

※ 本フローは **ローカル環境（image を registry に push しない）** 前提です。  
※ cosign は **local mode（registry 非アクセス）** で動作します。

```bash
# スクリプトに実行権限を付与
cd ~/workspace/cloudcredentialservice/
chmod +x ./docker/issuer-api/docker_manager.sh

# 基本形式
# ./docker/issuer-api/docker_manager.sh <command> <IMAGE_TAG>

# 1) ビルド（image 作成 + digest を記録）
cd ~/workspace/cloudcredentialservice/
MODE=local ./docker/issuer-api/docker_manager.sh build 20251226

#   - cloud-issuer-api:20251226 を build
#   - image digest を ./security/cosign/image.digest に記録

# 2) 署名（ローカル image を cosign で署名）
cd ~/workspace/cloudcredentialservice/
MODE=local ./docker/issuer-api/docker_manager.sh sign 20251226

#   - registry（docker.io）へはアクセスしない
#   - transparency log（Rekor）への upload も行わない
#   - cloud-issuer-api:20251226（tag）を対象に署名

# 3) 検証（起動前に署名を検証）
cd ~/workspace/cloudcredentialservice/
MODE=local ./docker/issuer-api/docker_manager.sh verify 20251226

#   - cosign.pub を使用して署名を検証
#   - 検証に失敗した場合は起動しないことを推奨

# 4) 起動（検証 OK の image のみ起動）
cd ~/workspace/cloudcredentialservice/
MODE=local ./docker/issuer-api/docker_manager.sh start-verified 20251226

# 5) 再起動（同一 tag を再利用する場合）
cd ~/workspace/cloudcredentialservice/
MODE=local ./docker/issuer-api/docker_manager.sh restart 20251226

# 6) 停止
cd ~/workspace/cloudcredentialservice/
MODE=local ./docker/issuer-api/docker_manager.sh stop 20251226

# 7) 初期化（volume 含めて削除 → 再起動）
cd ~/workspace/cloudcredentialservice/
MODE=local ./docker/issuer-api/docker_manager.sh init 20251226

# 8) コンテナ削除（停止 + volume 削除）
cd ~/workspace/cloudcredentialservice/
MODE=local ./docker/issuer-api/docker_manager.sh clear 20251226

# 9) コンテナに shell で入る
cd ~/workspace/cloudcredentialservice/
MODE=local ./docker/issuer-api/docker_manager.sh access 20251226

# 10) ログ確認（コンテナ名指定の方が安定）
docker logs -f cloud-issuer-api
