FROM eclipse-temurin:17-jre
WORKDIR /app

COPY build/libs/waltid-issuer-api-all.jar app.jar

EXPOSE 7002

ENTRYPOINT ["java", "-jar", "app.jar"]
