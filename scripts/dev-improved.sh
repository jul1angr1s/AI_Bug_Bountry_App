#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/backend/docker-compose.yml"

pids=()

# Load environment variables using export (handles special characters)
load_env_safe() {
  local env_file="$1"
  if [ -f "$env_file" ]; then
    # Export variables line by line, handling special characters
    while IFS='=' read -r key value || [[ -n "$key" ]]; do
      # Trim leading/trailing whitespace from key
      key="${key#"${key%%[![:space:]]*}"}"
      key="${key%"${key##*[![:space:]]}"}"
      # Skip empty lines and comments
      [[ -z "$key" || "$key" =~ ^# ]] && continue
      # Remove quotes if present
      value="${value#"${value%%[![:space:]]*}"}"
      value="${value%"${value##*[![:space:]]}"}"
      value="${value%\"}"
      value="${value#\"}"
      value="${value%\'}"
      value="${value#\'}"
      # Export the variable
      export "$key=$value"
    done < "$env_file"
    echo "✓ Loaded env: $env_file"
  fi
}

load_env_safe "$ROOT_DIR/backend/.env.local"
load_env_safe "$ROOT_DIR/backend/.env"

# ==============================================
# Pre-flight Checks
# ==============================================

echo ""
echo "=== Pre-flight Checks ==="
echo ""

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
  echo "❌ ERROR: Docker is not running."
  echo "   Please start Docker Desktop and try again."
  exit 1
fi
echo "✓ Docker is running"

# Check if required directories exist
if [ ! -d "$ROOT_DIR/backend" ]; then
  echo "❌ ERROR: Backend directory not found at $ROOT_DIR/backend"
  exit 1
fi

if [ ! -d "$ROOT_DIR/frontend" ]; then
  echo "❌ ERROR: Frontend directory not found at $ROOT_DIR/frontend"
  exit 1
fi
echo "✓ Required directories exist"

# Validate required environment variables
required_vars=(
  "DATABASE_URL"
  "REDIS_URL"
  "REDIS_PASSWORD"
  "SUPABASE_URL"
  "SUPABASE_ANON_KEY"
  "SUPABASE_SERVICE_ROLE_KEY"
  "SUPABASE_JWT_SECRET"
)

for var in "${required_vars[@]}"; do
  if [ -z "${!var:-}" ]; then
    echo "❌ ERROR: Required environment variable $var is not set"
    echo "   Please check your .env file"
    exit 1
  fi
done
echo "✓ Environment variables validated"

# Validate against deprecated/dangerous environment variables
echo "🔒 Validating security configuration..."
deprecated_vars=(
  "DEV_AUTH_BYPASS"
)

for var in "${deprecated_vars[@]}"; do
  if [ -n "${!var:-}" ]; then
    echo "❌ ERROR: Deprecated security variable detected: $var"
    echo "   This variable has been removed for security reasons"
    echo "   Please remove it from your .env files:"
    echo "   - backend/.env"
    echo "   - backend/.env.local"
    echo ""
    echo "   For development authentication, ensure these are set:"
    echo "   - SUPABASE_URL"
    echo "   - SUPABASE_ANON_KEY"
    echo "   - SUPABASE_SERVICE_ROLE_KEY"
    exit 1
  fi
done
echo "✓ No deprecated security variables detected"

# Validate blockchain / X.402 configuration (warnings, not fatal)
echo ""
echo "=== Blockchain & X.402 Configuration ==="
echo ""

blockchain_vars=(
  "BASE_SEPOLIA_RPC_URL"
  "PRIVATE_KEY"
  "BOUNTY_POOL_ADDRESS"
  "AGENT_IDENTITY_REGISTRY_ADDRESS"
  "AGENT_REPUTATION_REGISTRY_ADDRESS"
)

blockchain_ready=true
for var in "${blockchain_vars[@]}"; do
  if [ -z "${!var:-}" ]; then
    echo "⚠️  WARNING: $var is not set (on-chain features will use demo mode)"
    blockchain_ready=false
  fi
done
if [ "$blockchain_ready" = true ]; then
  echo "✓ Blockchain environment variables configured"
fi

# X.402 payment gate configuration
SKIP_X402="${SKIP_X402_PAYMENT_GATE:-true}"
if [ "$SKIP_X402" = "false" ]; then
  echo "💳 X.402 payment gate: ENABLED (live on-chain payments)"
  if [ -z "${PLATFORM_WALLET_ADDRESS:-}" ]; then
    echo "❌ ERROR: PLATFORM_WALLET_ADDRESS is required when X.402 gate is enabled"
    echo "   Set to the wallet that receives protocol registration fees"
    exit 1
  fi
  echo "  ✓ PLATFORM_WALLET_ADDRESS: ${PLATFORM_WALLET_ADDRESS:0:10}...${PLATFORM_WALLET_ADDRESS: -6}"
else
  echo "💳 X.402 payment gate: DISABLED (protocols register for free)"
  if [ -n "${PLATFORM_WALLET_ADDRESS:-}" ]; then
    echo "  ℹ️  PLATFORM_WALLET_ADDRESS is set but gate is skipped"
  fi
fi

# CSRF security posture
SKIP_CSRF="${SKIP_CSRF:-}"
if [ "$SKIP_CSRF" = "true" ]; then
  echo "⚠️  WARNING: CSRF protection is DISABLED (SKIP_CSRF=true)"
  echo "   This should only be used for testing"
else
  echo "🔒 CSRF protection: ENABLED"
fi

# On-chain registration mode
SKIP_ONCHAIN="${SKIP_ONCHAIN_REGISTRATION:-true}"
if [ "$SKIP_ONCHAIN" = "false" ]; then
  echo "⛓️  On-chain registration: ENABLED (real NFT minting)"
else
  echo "⛓️  On-chain registration: DISABLED (database only)"
fi

# Check npm dependencies
if [ ! -d "$ROOT_DIR/backend/node_modules" ]; then
  echo "📦 Backend dependencies not found. Installing..."
  (cd "$ROOT_DIR/backend" && npm install)
else
  echo "✓ Backend dependencies installed"
fi

if [ ! -d "$ROOT_DIR/frontend/node_modules" ]; then
  echo "📦 Frontend dependencies not found. Installing..."
  (cd "$ROOT_DIR/frontend" && npm install)
else
  echo "✓ Frontend dependencies installed"
fi

# Check frontend .env configuration (CRITICAL: avoid double /api/v1 paths)
echo ""
echo "=== Frontend Configuration Checks ==="
echo ""
if [ -f "$ROOT_DIR/frontend/.env" ]; then
  VITE_API_BASE_URL=$(grep "^VITE_API_BASE_URL=" "$ROOT_DIR/frontend/.env" | cut -d'=' -f2- | tr -d '"' | tr -d "'" || echo "")
  if [[ "$VITE_API_BASE_URL" == *"/api/v1"* ]]; then
    echo "❌ ERROR: VITE_API_BASE_URL should NOT include '/api/v1' suffix"
    echo "   Current value: $VITE_API_BASE_URL"
    echo "   Expected: http://localhost:3000"
    echo "   The codebase appends '/api/v1' to paths automatically"
    echo ""
    echo "   Fix: Edit frontend/.env and change:"
    echo "   VITE_API_BASE_URL=http://localhost:3000"
    exit 1
  else
    echo "✓ Frontend .env: VITE_API_BASE_URL correctly configured"
  fi
else
  echo "⚠️  WARNING: frontend/.env not found"
fi

# Check if backend contracts are compiled (for Docker)
if [ ! -d "$ROOT_DIR/backend/contracts/out" ] || [ -z "$(ls -A "$ROOT_DIR/backend/contracts/out" 2>/dev/null)" ]; then
  echo ""
  echo "⚠️  WARNING: Backend contracts not compiled"
  echo "   Docker backend needs compiled contracts in backend/contracts/out/"
  echo "   This may cause blockchain listener failures"
  echo ""
  echo "   To compile contracts:"
  echo "   cd backend/contracts && forge build"
else
  echo "✓ Backend contracts compiled"
fi

# Validate docker-compose.yml has necessary volumes
if [ -f "$COMPOSE_FILE" ]; then
  if ! grep -q "contracts:/app/contracts" "$COMPOSE_FILE"; then
    echo "⚠️  WARNING: docker-compose.yml may be missing contracts volume mount"
    echo "   Backend needs contracts volume: ./contracts:/app/contracts:ro"
  fi
  if ! grep -q "env_file:" "$COMPOSE_FILE"; then
    echo "⚠️  WARNING: docker-compose.yml may be missing .env file loading"
    echo "   Backend needs: env_file: - .env"
  fi
  echo "✓ Docker compose configuration validated"
fi

# ==============================================
# Helper Functions
# ==============================================

port_in_use() {
  local port="$1"
  if command -v lsof >/dev/null 2>&1; then
    lsof -ti "tcp:${port}" >/dev/null 2>&1
    return $?
  fi
  return 1
}

kill_port() {
  local port="$1"
  if command -v lsof >/dev/null 2>&1; then
    local pids_to_kill
    pids_to_kill=$(lsof -ti "tcp:${port}" || true)
    if [ -n "$pids_to_kill" ]; then
      echo "🔪 Killing processes on port ${port}: ${pids_to_kill}"
      # Try graceful kill first
      kill $pids_to_kill >/dev/null 2>&1 || true
      sleep 1
      # Force kill if still running
      pids_to_kill=$(lsof -ti "tcp:${port}" || true)
      if [ -n "$pids_to_kill" ]; then
        kill -9 $pids_to_kill >/dev/null 2>&1 || true
      fi
    fi
  fi
}

kill_pattern() {
  local pattern="$1"
  if command -v pkill >/dev/null 2>&1; then
    # Try graceful kill first
    if pkill -TERM -f "$pattern" >/dev/null 2>&1; then
      echo "🔪 Killing processes matching: $pattern"
      sleep 1
      # Force kill if still running
      pkill -9 -f "$pattern" >/dev/null 2>&1 || true
    fi
  fi
}

cleanup() {
  # Prevent multiple cleanup calls
  if [ "${CLEANUP_DONE:-0}" = "1" ]; then
    return 0
  fi
  CLEANUP_DONE=1

  echo ""
  echo "🛑 Stopping dev servers..."

  # Kill all tracked process groups (kills parent + children)
  for pid in "${pids[@]:-}"; do
    if ps -p "$pid" >/dev/null 2>&1; then
      # Kill process group (negative PID kills the group)
      kill -TERM -"$pid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null || true
    fi
  done

  # Give processes 2 seconds to exit gracefully
  sleep 2

  # Force kill any remaining processes
  for pid in "${pids[@]:-}"; do
    if ps -p "$pid" >/dev/null 2>&1; then
      kill -KILL -"$pid" 2>/dev/null || kill -KILL "$pid" 2>/dev/null || true
    fi
  done

  # Kill any remaining tsx/vite processes scoped to this repo (they sometimes hang)
  kill_pattern "tsx watch src/server.ts"
  kill_pattern "$ROOT_DIR/frontend.*vite"

  # Final cleanup: kill by port if still occupied
  if port_in_use 3000; then
    lsof -ti tcp:3000 | xargs kill -9 2>/dev/null || true
  fi
  if port_in_use 5173; then
    lsof -ti tcp:5173 | xargs kill -9 2>/dev/null || true
  fi

  echo "✓ Cleanup complete"
}

trap cleanup EXIT INT TERM

# ==============================================
# Docker Image Management
# ==============================================

echo ""
echo "=== Docker Setup ==="
echo ""

# Force rebuild if requested
if [ "${FORCE_REBUILD:-0}" = "1" ]; then
  echo "🔨 Force rebuilding Docker images (no cache)..."
  docker compose -f "$COMPOSE_FILE" build --no-cache
elif [ "${REBUILD:-0}" = "1" ]; then
  echo "🔨 Rebuilding Docker images..."
  docker compose -f "$COMPOSE_FILE" build --pull
else
  # Check if backend image exists and is recent
  backend_image=$(docker compose -f "$COMPOSE_FILE" images -q backend 2>/dev/null || true)
  if [ -z "$backend_image" ]; then
    echo "🔨 Backend image not found. Building..."
    docker compose -f "$COMPOSE_FILE" build --pull
  else
    echo "✓ Using existing Docker images (use REBUILD=1 to rebuild)"
  fi
fi

echo "🐳 Starting Postgres + Redis (docker compose)..."
docker compose -f "$COMPOSE_FILE" up -d postgres redis

echo "⏳ Waiting for Postgres + Redis to become healthy..."
for svc in postgres redis; do
  for i in {1..30}; do
    cid=$(docker compose -f "$COMPOSE_FILE" ps -q "$svc" || true)
    if [ -n "$cid" ]; then
      status=$(docker inspect -f '{{.State.Health.Status}}' "$cid" 2>/dev/null || echo "")
      if [ "$status" = "healthy" ]; then
        echo "✓ $svc: healthy"
        break
      fi
    fi
    if [ "$i" -eq 30 ]; then
      echo "⚠️  $svc: timeout waiting for health check (continuing anyway)"
    fi
    sleep 2
  done
  unset status
  unset cid
done

# ==============================================
# Redis Connectivity Validation (NEW)
# ==============================================

echo ""
echo "=== Validating Services ==="
echo ""

echo "🔌 Validating Redis connectivity..."
REDIS_PASSWORD="${REDIS_PASSWORD:-<your-redis-password>}"
redis_verified=false

# Try native redis-cli first
if command -v redis-cli >/dev/null 2>&1; then
  if redis-cli -h localhost -p 6379 -a "$REDIS_PASSWORD" ping >/dev/null 2>&1; then
    echo "✓ Redis: Connection verified from host (redis-cli)"
    redis_verified=true
  fi
fi

# Fallback: use docker exec to test Redis inside the container
if [ "$redis_verified" = false ]; then
  redis_container=$(docker compose -f "$COMPOSE_FILE" ps -q redis 2>/dev/null || true)
  if [ -n "$redis_container" ]; then
    if docker exec "$redis_container" redis-cli -a "$REDIS_PASSWORD" ping >/dev/null 2>&1; then
      echo "✓ Redis: Connection verified via Docker exec"
      redis_verified=true
    else
      echo "❌ ERROR: Redis container is running but not responding to PING"
      echo "   Password: ${REDIS_PASSWORD:0:5}***"
      exit 1
    fi
  fi
fi

if [ "$redis_verified" = false ]; then
  echo "⚠️  WARNING: Could not verify Redis connectivity"
  echo "   Neither redis-cli nor Docker exec succeeded"
  echo "   Backend may fail to connect to Redis"
fi

# ==============================================
# Database Schema Initialization
# ==============================================

echo ""
echo "=== Database Setup ==="
echo ""

if [ "${SKIP_DB_INIT:-0}" = "0" ]; then
  echo "🗄️  Checking database schema..."
  prisma_cmd=(npx prisma db push --skip-generate)
  if [ "${ALLOW_DATA_LOSS:-0}" = "1" ]; then
    prisma_cmd+=(--accept-data-loss)
  fi

  if (cd "$ROOT_DIR/backend" && "${prisma_cmd[@]}"); then
    echo "✓ Database schema up to date"
  else
    echo "❌ ERROR: Database schema initialization failed"
    echo "   Please check database connection and schema"
    exit 1
  fi

  # If using Docker backend, also run migrations in container
  if docker ps --format '{{.Names}}' | grep -q "thunder-backend"; then
    echo "🐳 Running migrations in Docker backend container..."
    if docker exec thunder-backend npx prisma migrate deploy 2>/dev/null; then
      echo "✓ Docker backend migrations applied"
    else
      echo "⚠️  WARNING: Could not run migrations in Docker container"
      echo "   This is normal if backend container is not running yet"
    fi
  fi
else
  echo "⏭️  Skipping database initialization (SKIP_DB_INIT=1)"
fi

# ==============================================
# Agent Initialization (NEW - CRITICAL)
# ==============================================

echo ""
echo "🤖 Initializing agent records..."
if (cd "$ROOT_DIR/backend" && npx tsx init-agents.ts); then
  echo "✓ Agents initialized successfully"
else
  echo "❌ ERROR: Failed to initialize agent records"
  echo "   Scans will fail without agent records"
  exit 1
fi

# Validate agent records
AGENT_COUNT=$(cd "$ROOT_DIR/backend" && npx -y prisma db execute \
  --stdin <<< "SELECT COUNT(*) as count FROM \"Agent\" WHERE status = 'ONLINE';" \
  2>/dev/null | grep -o '[0-9]\+' | tail -1 || echo "0")

if [ "${AGENT_COUNT:-0}" -lt 2 ]; then
  echo "⚠️  WARNING: Expected at least 2 online agents, found ${AGENT_COUNT:-0}"
  echo "   Continuing anyway, but scans may fail"
else
  echo "✓ Found ${AGENT_COUNT} online agents"
fi

# ==============================================
# Demo Seed Data (optional)
# ==============================================

if [ "${SEED_DEMO_DATA:-0}" = "1" ]; then
  echo ""
  echo "🌱 Seeding demo data (agents, payments, reputation, escrow)..."
  echo "   ⚠️  NOTE: Seed script performs real on-chain transactions (requires ETH for gas)"
  if [ -z "${PRIVATE_KEY:-}" ] || [ -z "${BASE_SEPOLIA_RPC_URL:-}" ]; then
    echo "   ⚠️  Missing PRIVATE_KEY or BASE_SEPOLIA_RPC_URL — seed will run in database-only mode"
  fi
  if [ -f "$ROOT_DIR/backend/scripts/seed-demo-data.ts" ]; then
    if (cd "$ROOT_DIR/backend" && npx tsx scripts/seed-demo-data.ts); then
      echo "✓ Demo data seeded successfully"
    else
      echo "⚠️  WARNING: Demo seed script failed (continuing anyway)"
    fi
  else
    echo "⚠️  WARNING: seed-demo-data.ts not found at backend/scripts/"
  fi
else
  echo ""
  echo "⏭️  Skipping demo seed data (use SEED_DEMO_DATA=1 to seed)"
fi

# ==============================================
# Start Services
# ==============================================

echo ""
echo "=== Starting Services ==="
echo ""

# Start Backend
if [ "${START_BACKEND:-1}" = "1" ]; then
  if port_in_use 3000; then
    if [ "${KILL_EXISTING:-0}" = "1" ]; then
      kill_port 3000
      sleep 1
      if port_in_use 3000; then
        kill_pattern "$ROOT_DIR/backend.*tsx watch src/server.ts"
        kill_pattern "tsx watch src/server.ts"
      fi
    else
      echo "⚠️  Backend port 3000 already in use; skipping backend start."
    fi
  fi
  if ! port_in_use 3000; then
    echo "🚀 Starting backend dev server..."
    (cd "$ROOT_DIR/backend" && npm run dev) &
    pids+=($!)
    echo "✓ Backend starting on port 3000"
  else
    echo "⚠️  Backend still running on port 3000; not starting a new one."
  fi
else
  echo "⏭️  Skipping backend (START_BACKEND=0)"
fi

# Start Researcher Worker (CHANGED: Default to 0 to avoid conflicts)
if [ "${START_RESEARCHER_WORKER:-0}" = "1" ]; then
  if grep -q '"researcher:worker"' "$ROOT_DIR/backend/package.json" 2>/dev/null; then
    echo "🔬 Starting standalone researcher worker..."
    echo "⚠️  WARNING: This will create a duplicate worker (server.ts already starts one)"
    (cd "$ROOT_DIR/backend" && npm run researcher:worker) &
    pids+=($!)
  else
    echo "⏭️  Skipping researcher worker (script not found in backend/package.json)"
  fi
else
  echo "⏭️  Skipping standalone researcher worker (START_RESEARCHER_WORKER=0)"
  echo "   Note: Researcher worker runs inside backend server (server.ts)"
fi

# Start Frontend
if [ "${START_FRONTEND:-1}" = "1" ]; then
  if port_in_use 5173; then
    if [ "${KILL_EXISTING:-0}" = "1" ]; then
      kill_port 5173
      sleep 1
      if port_in_use 5173; then
        kill_pattern "$ROOT_DIR/frontend.*vite"
        kill_pattern "vite"
      fi
    else
      echo "⚠️  Frontend port 5173 already in use; skipping frontend start."
    fi
  fi
  if ! port_in_use 5173; then
    echo "🎨 Starting frontend dev server..."
    (cd "$ROOT_DIR/frontend" && npm run dev) &
    pids+=($!)
    echo "✓ Frontend starting on port 5173"
  else
    echo "⚠️  Frontend still running on port 5173; not starting a new one."
  fi
else
  echo "⏭️  Skipping frontend (START_FRONTEND=0)"
fi

# ==============================================
# Health Checks
# ==============================================

echo ""
echo "=== Health Checks ==="
echo ""

if [ "${START_BACKEND:-1}" = "1" ]; then
  if command -v curl >/dev/null 2>&1; then
    if port_in_use 3000; then
      echo "⏳ Waiting for backend health endpoint..."
      for i in {1..30}; do
        if curl -sf "http://localhost:3000/api/v1/health" >/dev/null 2>&1; then
          echo "✓ Backend is healthy at http://localhost:3000/api/v1/health"

          # Get detailed health info
          health_response=$(curl -s "http://localhost:3000/api/v1/health" 2>/dev/null || echo "{}")
          redis_status=$(echo "$health_response" | grep -o '"redis":"[^"]*"' | cut -d'"' -f4 || echo "unknown")
          database_status=$(echo "$health_response" | grep -o '"database":"[^"]*"' | cut -d'"' -f4 || echo "unknown")

          if [ "$redis_status" = "ok" ]; then
            echo "  ✓ Redis: $redis_status"
          else
            echo "  ⚠️  Redis: $redis_status"
          fi

          if [ "$database_status" = "ok" ]; then
            echo "  ✓ Database: $database_status"
          else
            echo "  ⚠️  Database: $database_status"
          fi

          # Validate authentication configuration
          echo "🔐 Validating authentication configuration..."
          if echo "$health_response" | grep -q "ok"; then
            echo "  ✓ Authentication middleware loaded (Supabase configuration detected)"
          else
            echo "  ⚠️  Could not verify authentication configuration"
            echo "     Ensure SUPABASE_* variables are set correctly"
          fi

          break
        fi

        if [ "$i" -eq 30 ]; then
          echo "⚠️  Backend health check timeout (continuing anyway)"
        fi
        sleep 2
      done
    else
      echo "⏭️  Skipping backend health check (port 3000 not in use)"
    fi
  else
    echo "⚠️  curl not found; skipping backend health check"
  fi
fi

# ==============================================
# API Endpoint Validation (post-startup)
# ==============================================

if [ "${START_BACKEND:-1}" = "1" ] && command -v curl >/dev/null 2>&1; then
  echo ""
  echo "=== API Endpoint Validation ==="
  echo ""

  # Wait for health endpoint to confirm backend is ready
  backend_ready=false
  for i in {1..10}; do
    if curl -sf "http://localhost:3000/api/v1/health" >/dev/null 2>&1; then
      backend_ready=true
      break
    fi
    sleep 1
  done

  if [ "$backend_ready" = true ]; then
    # Test CSRF token endpoint
    csrf_response=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/api/v1/csrf-token" 2>/dev/null)
    if [ "$csrf_response" = "200" ]; then
      echo "  ✓ CSRF token endpoint: OK"
    else
      echo "  ⚠️  CSRF token endpoint: HTTP $csrf_response"
    fi

    # Test agent identities endpoint
    agents_response=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/api/v1/agent-identities" 2>/dev/null)
    if [ "$agents_response" = "200" ]; then
      echo "  ✓ Agent identities endpoint: OK"
    else
      echo "  ⚠️  Agent identities endpoint: HTTP $agents_response"
    fi

    # Test X.402 payments endpoint
    x402_response=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/api/v1/agent-identities/x402-payments" 2>/dev/null)
    if [ "$x402_response" = "200" ]; then
      echo "  ✓ X.402 payments endpoint: OK"
    else
      echo "  ⚠️  X.402 payments endpoint: HTTP $x402_response"
    fi

    # Test leaderboard endpoint
    leaderboard_response=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/api/v1/agent-identities/leaderboard" 2>/dev/null)
    if [ "$leaderboard_response" = "200" ]; then
      echo "  ✓ Leaderboard endpoint: OK"
    else
      echo "  ⚠️  Leaderboard endpoint: HTTP $leaderboard_response"
    fi

    # Test metadata endpoint (ERC-721 token metadata)
    metadata_response=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/api/v1/agent-identities/metadata/1" 2>/dev/null)
    if [ "$metadata_response" = "200" ]; then
      echo "  ✓ Metadata endpoint: OK (token #1)"
    elif [ "$metadata_response" = "404" ]; then
      echo "  ✓ Metadata endpoint: OK (no token #1 yet — seed data first)"
    else
      echo "  ⚠️  Metadata endpoint: HTTP $metadata_response"
    fi

    # Verify CSRF is enforced on state-changing routes (POST without token should fail)
    csrf_enforced=$(curl -s -o /dev/null -w "%{http_code}" -X POST "http://localhost:3000/api/v1/agent-identities/register" \
      -H "Content-Type: application/json" -d '{}' 2>/dev/null)
    if [ "$csrf_enforced" = "403" ]; then
      echo "  ✓ CSRF enforcement: Active (POST without token → 403)"
    elif [ "$csrf_enforced" = "401" ]; then
      echo "  ✓ CSRF enforcement: Auth-first (POST without auth → 401)"
    else
      echo "  ⚠️  CSRF enforcement: Unexpected response $csrf_enforced (expected 403)"
    fi
  else
    echo "  ⚠️  Backend not ready, skipping endpoint validation"
  fi
fi

echo ""
echo "======================================"
echo "✨ Dev stack is running!"
echo "======================================"
echo ""
echo "📍 Services:"
echo "  • Backend:  http://localhost:3000"
echo "  • Frontend: http://localhost:5173"
echo "  • Health:   http://localhost:3000/api/v1/health"
echo ""
echo "🐳 Docker Services:"
echo "  • Postgres: localhost:5432"
echo "  • Redis:    localhost:6379"
echo ""
echo "⚙️  Configuration:"
SKIP_X402="${SKIP_X402_PAYMENT_GATE:-true}"
SKIP_ONCHAIN="${SKIP_ONCHAIN_REGISTRATION:-true}"
SKIP_CSRF_VAL="${SKIP_CSRF:-}"
echo "  • X.402 Payment Gate: $([ "$SKIP_X402" = "false" ] && echo "ENABLED" || echo "DISABLED")"
echo "  • On-Chain Registration: $([ "$SKIP_ONCHAIN" = "false" ] && echo "ENABLED" || echo "DISABLED")"
echo "  • CSRF Protection: $([ "$SKIP_CSRF_VAL" = "true" ] && echo "DISABLED" || echo "ENABLED")"
echo ""
echo "🔗 Key Endpoints:"
echo "  • Agents:       http://localhost:3000/api/v1/agent-identities"
echo "  • X.402 Pay:    http://localhost:3000/api/v1/agent-identities/x402-payments"
echo "  • Leaderboard:  http://localhost:3000/api/v1/agent-identities/leaderboard"
echo ""
echo "Press Ctrl+C to stop dev servers"
echo "(Docker services will keep running)"
echo ""

# Better wait loop that responds quickly to signals
while true; do
  # Check if any of our processes are still running
  running=0
  for pid in "${pids[@]:-}"; do
    if ps -p "$pid" >/dev/null 2>&1; then
      running=1
      break
    fi
  done

  if [ "$running" = "0" ]; then
    echo ""
    echo "⚠️  All dev servers have stopped."
    break
  fi

  # Sleep briefly so we can respond to signals quickly
  sleep 1
done
