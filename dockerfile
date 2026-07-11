# ========================================
# ALAN VAULT - DOCKERFILE
# Multi-stage build for production
# ========================================

# Stage 1: Build frontend assets
FROM node:18-alpine AS frontend-builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY package-lock.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build frontend assets
RUN npm run build

# Stage 2: Production image
FROM node:18-alpine

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY package-lock.json ./

# Install production dependencies only
RUN npm ci --only=production && npm cache clean --force

# Copy built assets from builder
COPY --from=frontend-builder /app/public ./public
COPY --from=frontend-builder /app/dist ./dist

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p uploads database logs backups temp

# Set permissions
RUN chown -R node:node /app
USER node

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js || exit 1

# Start application with dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]