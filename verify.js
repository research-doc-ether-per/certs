IMAGE_TAG="stable"

if [[ "$VERSION" == "0.21.0" || "$VERSION" == "1.0.0" ]]; then
    if [[ "$METHOD" == "gradle" ]]; then
        # Gradle (Jib) でビルド
        ./gradlew $PROXY_OPTS \
          ":waltid-services:waltid-$svc:clean" \
          ":waltid-services:waltid-$svc:jibDockerBuild" \
          --no-build-cache \
          --rerun-tasks \
          -Djib.to.image="waltid/$svc:$IMAGE_TAG"
    else
        # Dockerfile でビルド
        BUILD_ARGS=""
        if [[ -n "$P_HOST" ]]; then
            BUILD_ARGS="--build-arg http_proxy=http://$P_HOST:$P_PORT --build-arg https_proxy=http://$P_HOST:$P_PORT"
        fi

        docker build $BUILD_ARGS \
          -f "waltid-services/waltid-$svc/Dockerfile" \
          --no-cache \
          -t "waltid/$svc:$VERSION" .
    fi
else
    docker compose build "$svc" --no-cache
fi
