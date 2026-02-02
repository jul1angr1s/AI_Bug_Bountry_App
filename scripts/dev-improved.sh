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
    while IFS='=' read -r key value; do
      # Skip empty lines and comments
      [[ -z "$key" || "$key" =~ ^[[:space:]]*# ]] && continue
      # Remove quotes if present
      value="${value%\"}"
      value="${value#\"}"
      # Export the variable
      export "$key=$value"
    done < <(grep -v '^#' "$env_file" | grep -v '^[[:space:]]*$')
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
)

for var in "${required_vars[@]}"; do
  if [ -z "${!var:-}" ]; then
    echo "❌ ERROR: Required environment variable $var is not set"
    echo "   Please check your .env file"
    exit 1
  fi
done
echo "✓ Environment variables validated"

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

echo "🔌 Validating Redis connectivity from host..."
REDIS_PASSWORD="${REDIS_PASSWORD:-redis_dev_2024}"
if command -v redis-cli >/dev/null 2>&1; then
  if redis-cli -h localhost -p 6379 -a "$REDIS_PASSWORD" ping >/dev/null 2>&1; then
    echo "✓ Redis: Connection verified from host"
  else
    echo "❌ ERROR: Cannot connect to Redis from host machine"
    echo "   Host: localhost:6379"
    echo "   Password: ${REDIS_PASSWORD:0:5}***"
    echo "   Make sure Docker containers are healthy"
    exit 1
  fi
else
  echo "⚠️  redis-cli not found, skipping host connectivity check"
  echo "   Install redis-cli for better validation: brew install redis"
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
  if rg -q '"researcher:worker"' "$ROOT_DIR/backend/package.json" 2>/dev/null; then
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
