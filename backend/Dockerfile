# ============================================
# Simplified Dockerfile for Thunder Security Backend
# ============================================
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl git

# ---------------------------------------------
# Dependencies: Install all dependencies
# ---------------------------------------------
FROM base AS dependencies
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci
RUN npx prisma generate

# ---------------------------------------------
# Build: Compile TypeScript
# ---------------------------------------------
FROM base AS build
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---------------------------------------------
# Production: Run the server
# ---------------------------------------------
FROM base AS production
ENV NODE_ENV=production

COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/package*.json ./
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma

EXPOSE 3000

CMD ["node", "dist/start.js"]
