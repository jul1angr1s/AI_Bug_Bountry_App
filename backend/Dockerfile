# ============================================
# Simplified Dockerfile for Thunder Security Backend
# ============================================
FROM node:20-bookworm-slim AS base
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl git curl bash ca-certificates tar xz-utils \
  && rm -rf /var/lib/apt/lists/* \
  && export SHELL=/bin/bash \
  && curl -L https://foundry.paradigm.xyz | bash \
  && /root/.foundry/bin/foundryup \
  && ln -sf /root/.foundry/bin/forge /usr/local/bin/forge \
  && ln -sf /root/.foundry/bin/cast /usr/local/bin/cast \
  && ln -sf /root/.foundry/bin/anvil /usr/local/bin/anvil \
  && ln -sf /root/.foundry/bin/chisel /usr/local/bin/chisel \
  && forge --version

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
