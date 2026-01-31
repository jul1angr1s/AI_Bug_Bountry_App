#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/backend/docker-compose.yml"

pids=()

load_env() {
  local env_file="$1"
  if [ -f "$env_file" ]; then
    set -a
    # shellcheck disable=SC1090
    . "$env_file"
    set +a
    echo "Loaded env: $env_file"
  fi
}

load_env "$ROOT_DIR/backend/.env.local"
load_env "$ROOT_DIR/backend/.env"

# ==============================================
# Pre-flight Checks
# ==============================================

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
  echo ""
  echo "ERROR: Docker is not running."
  echo "Please start Docker Desktop and try again."
  echo ""
  exit 1
fi

# Check if required directories exist
if [ ! -d "$ROOT_DIR/backend" ]; then
  echo "ERROR: Backend directory not found at $ROOT_DIR/backend"
  exit 1
fi

if [ ! -d "$ROOT_DIR/frontend" ]; then
  echo "ERROR: Frontend directory not found at $ROOT_DIR/frontend"
  exit 1
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
      echo "Killing processes on port ${port}: ${pids_to_kill}"
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
      echo "Killing processes matching: $pattern"
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
  echo "Stopping dev servers..."

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

  # Kill any remaining tsx/vite processes aggressively (they sometimes hang)
  pkill -9 -f "tsx watch" 2>/dev/null || true
  pkill -9 -f "vite" 2>/dev/null || true

  # Final cleanup: kill by port if still occupied
  if port_in_use 3000; then
    lsof -ti tcp:3000 | xargs kill -9 2>/dev/null || true
  fi
  if port_in_use 5173; then
    lsof -ti tcp:5173 | xargs kill -9 2>/dev/null || true
  fi

  echo "Cleanup complete."
}

trap cleanup EXIT INT TERM

# ==============================================
# Docker Image Management
# ==============================================

# Force rebuild if requested
if [ "${FORCE_REBUILD:-0}" = "1" ]; then
  echo "Force rebuilding Docker images (no cache)..."
  docker compose -f "$COMPOSE_FILE" build --no-cache
elif [ "${REBUILD:-0}" = "1" ]; then
  echo "Rebuilding Docker images..."
  docker compose -f "$COMPOSE_FILE" build --pull
else
  # Check if backend image exists and is recent
  backend_image=$(docker compose -f "$COMPOSE_FILE" images -q backend 2>/dev/null || true)
  if [ -z "$backend_image" ]; then
    echo "Backend image not found. Building..."
    docker compose -f "$COMPOSE_FILE" build --pull
  else
    echo "Using existing Docker images (use REBUILD=1 to rebuild)"
  fi
fi

echo "Starting Postgres + Redis (docker compose)..."
docker compose -f "$COMPOSE_FILE" up -d postgres redis

echo "Waiting for Postgres + Redis to become healthy..."
for svc in postgres redis; do
  for _ in {1..30}; do
    cid=$(docker compose -f "$COMPOSE_FILE" ps -q "$svc" || true)
    if [ -n "$cid" ]; then
      status=$(docker inspect -f '{{.State.Health.Status}}' "$cid" 2>/dev/null || echo "")
      if [ "$status" = "healthy" ]; then
        echo "- $svc: healthy"
        break
      fi
    fi
    sleep 2
  done
  if [ "${status:-}" != "healthy" ]; then
    echo "- $svc: continuing (health not reported)"
  fi
  unset status
  unset cid
done

# ==============================================
# Database Schema Initialization
# ==============================================

if [ "${SKIP_DB_INIT:-0}" = "0" ]; then
  echo "Checking database schema..."
  if (cd "$ROOT_DIR/backend" && npx prisma db push --accept-data-loss --skip-generate >/dev/null 2>&1); then
    echo "- Database schema up to date"
  else
    echo "- Warning: Could not update database schema (may need manual migration)"
  fi
fi

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
      echo "Backend port 3000 already in use; skipping backend start."
    fi
  fi
  if ! port_in_use 3000; then
    echo "Starting backend dev server..."
    (cd "$ROOT_DIR/backend" && npm run dev) &
    pids+=($!)
  else
    echo "Backend still running on port 3000; not starting a new one."
  fi
else
  echo "Skipping backend (START_BACKEND=0)"
fi

if [ "${START_RESEARCHER_WORKER:-1}" = "1" ]; then
  echo "Starting researcher worker..."
  (cd "$ROOT_DIR/backend" && npm run researcher:worker) &
  pids+=($!)
else
  echo "Skipping researcher worker (START_RESEARCHER_WORKER=0)"
fi

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
      echo "Frontend port 5173 already in use; skipping frontend start."
    fi
  fi
  if ! port_in_use 5173; then
    echo "Starting frontend dev server..."
    (cd "$ROOT_DIR/frontend" && npm run dev) &
    pids+=($!)
  else
    echo "Frontend still running on port 5173; not starting a new one."
  fi
else
  echo "Skipping frontend (START_FRONTEND=0)"
fi

if command -v curl >/dev/null 2>&1; then
  echo "Waiting for backend health endpoint..."
  for _ in {1..30}; do
    if curl -sf "http://localhost:3000/api/v1/health" >/dev/null; then
      echo "Backend is healthy at http://localhost:3000/api/v1/health"
      break
    fi
    sleep 2
  done
else
  echo "curl not found; skipping backend health check"
fi

echo ""
echo "Dev stack is running."
echo "- Backend:  http://localhost:3000"
echo "- Frontend: http://localhost:5173"
echo "Press Ctrl+C to stop dev servers (Docker services will keep running)."

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
    echo "All dev servers have stopped."
    break
  fi

  # Sleep briefly so we can respond to signals quickly
  sleep 1
done
