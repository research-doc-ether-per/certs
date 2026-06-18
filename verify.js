docker build -f waltid-services/waltid-verifier-api2/Dockerfile --no-cache -t waltid/verifier-api2:latest .

./gradlew :waltid-services:waltid-verifier-api2:jibDockerBuild
