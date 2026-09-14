## Stage 1: Build stage
FROM eclipse-temurin:17-jdk-alpine AS builder

WORKDIR /app

# Copy the depedency manager
COPY .mvn .mvn
COPY mvnw pom.xml ./

# Ensure maven wrapper has executeable permissions
RUN chmod +x ./mvnw

# Pre-fetch dependencies (offline cache layer)
# Note: " || true" prevents build failure if optional plugin dependencies differ
RUN ./mvnw dependency:go-offline -B || true

# Copy application source code
COPY src ./src

# Package the application JAR skipping tests (tests should be run in CI pipeline)
RUN ./mvnw clean package -DskipTests -B

## Stage 2: Production JRE 17 Runtime
FROM eclipse-temurin:17-jre-alpine AS runner
Read(~/Desktop/Rohit/Personal/Online_Project_Uploads/...odules/customer/controller/ClientController.java)
● Read(~/Desktop/Rohit/Personal/Online_Project_Uploads/...odules/customer/controller/ClientController.java)
● Read(~/Desktop/Rohit/Personal/Online_Project_Uploads/.../crm/modules/auth/controller/AuthController.java)
● Read(~/Desktop/Rohit/Personal/Online_Project_Uploads/.../crm/modules/auth/controller/AuthController.java)
● Find(Find SecurityConfig in backend-java)
● Read(~/Desktop/Rohit/Personal/Online_Project...thtech/crm/security/SecurityConfig.java) (ctrl+o to expand)
⢿  Reading file...
WORKDIR /app

# Security best practice: Create a non-root group and user
RUN addgroup -S spring && adduser -S spring -G spring

# Copy the built jar from the builder stage
COPY --from=builder /app/target/*.jar app.jar

# Ensure owndership belongs to spring user
RUN chown spring:spring app.jar

# Switch to non-root user
USER spring:spring

# Expose Spring Boot's configured port
EXPOSE 8080

# Configure container-aware JVM memory options and run JAR                                            
ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]   