# Stage 1: Build the React frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Build the Spring Boot backend
FROM maven:3.8.5-openjdk-17 AS backend-builder
WORKDIR /backend
COPY backend/pom.xml ./
COPY backend/src ./src
# Copy compiled frontend assets from Stage 1 into backend's static assets directory
COPY --from=frontend-builder /frontend/dist ./src/main/resources/static
# Package the Spring Boot app into a JAR file
RUN mvn clean package -DskipTests

# Stage 3: Run the packaged Spring Boot application
FROM openjdk:17-jdk-slim
WORKDIR /app
COPY --from=backend-builder /backend/target/*.jar app.jar
# Expose port 8080 (default, overridden dynamically in production by the PORT env variable)
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
