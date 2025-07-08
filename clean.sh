#!/bin/bash

TARGET=${1:-all}
ENV=${2:-dev}

if [ "$ENV" = "dev" ]; then
  echo "環境: $ENV"
elif [ "$ENV" = "prod" ]; then
  echo "環境: $ENV"
else
  echo "無効な環境: $ENV"
  exit 1
fi

start_wallet() {
  echo "Starting Wallet Keycloak..."
  cd $WORKSPACE/keycloak-wallet
  chmod +x keycloak_manager.sh
  bash keycloak_manager.sh start $ENV
}

start_issuer() {
  echo "Starting Issuer Keycloak..."
  cd $WORKSPACE/keycloak-issuer
  chmod +x keycloak_manager.sh
  bash keycloak_manager.sh start $ENV
}

start_verifier() {
  echo "Starting Verifier Keycloak..."
  cd $WORKSPACE/keycloak-verifier
  chmod +x keycloak_manager.sh
  bash keycloak_manager.sh start $ENV
}

case "$TARGET" in
  wallet)
    start_wallet
    ;;
  issuer)
    start_issuer
    ;;
  verifier)
    start_verifier
    ;;
  all)
    start_wallet
    start_issuer
    start_verifier
    ;;
  *)
    echo "無効な対象: $TARGET"
    echo "使用例: $0 [wallet|issuer|verifier|all] [dev|prod]"
    exit 1
    ;;
esac

