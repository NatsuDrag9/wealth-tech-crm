## Stage 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests first to leverage Docker layer caching
COPY package*.json ./

# Install all dependencies
RUN npm ci

# Copy source code and configuration files
COPY tsconfig.json ./
COPY src ./src

# Compile Typescript into dist/
RUN npm run build


## Stage 2: Production Runtime Stage
FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Copy package manigests and install ONLY production dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled JS output from the builder stage
COPY --from=builder /app/dist ./dist

# Create uploads directory and set permissions for security (non-root)
RUN mkdir -p uploads && chown -R node:node uploads

# Switch to the non-root 'node' user provided by node-alpine for security purposes
USER node

# Document the exposed port
EXPOSE 5000

# Start the application
CMD ["node", "dist/server.js"]