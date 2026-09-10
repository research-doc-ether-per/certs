find waltid-services/waltid-wallet-api2 -iname "*Dockerfile*" -o -iname "Dockerfile"
./gradlew :waltid-services:waltid-wallet-api2:tasks | grep -i docker
