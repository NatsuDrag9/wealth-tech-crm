# ==========================================
# Stage 1: Build React Application
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install all dependencies including devDependencies (needed for Vite build)
RUN npm ci --legacy-peer-deps

# Copy application source and configuration
COPY tsconfig*.json vite.config.ts index.html ./
COPY src ./src

# Build arguments for dual backend endpoints and default selection
ARG VITE_JAVA_API_BASE_URL=/java-wtc-api/v1
ARG VITE_NODEJS_API_BASE_URL=/nodejs-wtc-api/v1
ARG VITE_DEFAULT_BACKEND=nodejs

ENV VITE_JAVA_API_BASE_URL=$VITE_JAVA_API_BASE_URL
ENV VITE_NODEJS_API_BASE_URL=$VITE_NODEJS_API_BASE_URL
ENV VITE_DEFAULT_BACKEND=$VITE_DEFAULT_BACKEND

# Compile React TypeScript app to static assets in dist/
RUN npm run build

# ==========================================
# Stage 2: Serve with Nginx Alpine
# ==========================================
FROM nginx:alpine AS runner

# Remove default Nginx welcome website
RUN rm -rf /usr/share/nginx/html/*

# Copy compiled static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration with dual backend reverse proxy & SPA fallback
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose HTTP port
EXPOSE 80

# Run Nginx in foreground (PID 1)
CMD ["nginx", "-g", "daemon off;"]