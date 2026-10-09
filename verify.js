./gradlew :waltid-applications:waltid-cli:installJvmDist


./waltid-applications/waltid-cli/build/install/waltid-jvm/bin/waltid did create --help


./waltid-applications/waltid-cli/build/install/waltid-jvm/bin/waltid \
  did create \
  -m web \
  --domain example.com \
  --path issuer \
  -o ~/workspaces/issuer/did.json
