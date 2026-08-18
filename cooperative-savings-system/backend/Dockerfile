# Multi-stage build for TERIMBERE CSAMS backend
FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /app

COPY pom.xml .
RUN mvn -B -q dependency:go-offline

COPY src ./src
RUN mvn -B -DskipTests package

FROM eclipse-temurin:21-jre-alpine AS runtime
WORKDIR /app

RUN addgroup -S csams && adduser -S csams -G csams
USER csams

COPY --from=build /app/target/csams-backend-*.jar /app/app.jar

ENV SPRING_PROFILES_ACTIVE=production
EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
