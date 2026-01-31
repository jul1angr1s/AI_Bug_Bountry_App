# ============================================
# Multi-stage Dockerfile for Thunder Security Backend
# ============================================
# Stages:
#   - base: Common Node 20 Alpine setup with Prisma dependencies
#   - dependencies: All dependencies (dev + prod) for development/build
#   - development: Hot-reload development image
#   - build: TypeScript compilation stage
#   - dependencies-prod: Production-only dependencies (optimized)
#   - production: Minimal production image (~273MB)
# ============================================

# ---------------------------------------------
# Base Stage: Common dependencies
# ---------------------------------------------
FROM node:20-alpine AS base

WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

# ---------------------------------------------
# Dependencies Stage: Install all dependencies
# ---------------------------------------------
FROM base AS dependencies

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# ---------------------------------------------
# Development Stage: Hot-reload with tsx
# ---------------------------------------------
FROM base AS development

# Copy all dependencies from dependencies stage
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/package*.json ./

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/v1/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); })"

# Start development server with tsx watch
CMD ["npm", "run", "dev"]

# ---------------------------------------------
# Build Stage: Compile TypeScript
# ---------------------------------------------
FROM base AS build

# Copy dependencies and source
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

# Build TypeScript
RUN npm run build

# ---------------------------------------------
# Production Dependencies Stage: Install only production dependencies
# ---------------------------------------------
FROM base AS dependencies-prod

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install production dependencies only (excludes devDependencies)
RUN npm ci --omit=dev

# Generate Prisma Client for production
RUN npx prisma generate

# ---------------------------------------------
# Production Stage: Minimal production image
# ---------------------------------------------
FROM base AS production

ENV NODE_ENV=production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy production-only dependencies (no devDependencies)
COPY --from=dependencies-prod /app/node_modules ./node_modules
COPY --from=dependencies-prod /app/package*.json ./

# Copy built application
COPY --from=build --chown=nodejs:nodejs /app/dist ./dist
COPY --from=build --chown=nodejs:nodejs /app/prisma ./prisma

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/v1/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); })"

# Start production server
CMD ["node", "dist/server.js"]
