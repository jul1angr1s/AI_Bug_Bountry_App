#!/usr/bin/env bash
# ==============================================
# Docker Rebuild Script
# ==============================================
# Use this script when:
# - Package dependencies change (package.json)
# - Dockerfile is modified
# - Docker containers are behaving unexpectedly
# - You need a clean slate
# ==============================================

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/backend/docker-compose.yml"

echo "=============================================="
echo "  Thunder Security - Docker Rebuild"
echo "=============================================="
echo ""

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
  echo "ERROR: Docker is not running."
  echo "Please start Docker Desktop and try again."
  echo ""
  exit 1
fi

# Confirm with user
echo "This will:"
echo "  1. Stop all Thunder Security containers"
echo "  2. Remove all volumes (database data will be lost)"
echo "  3. Rebuild all Docker images from scratch"
echo "  4. Start fresh containers"
echo ""
read -p "Continue? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Cancelled."
  exit 0
fi

echo ""
echo "Step 1/4: Stopping and removing containers + volumes..."
docker compose -f "$COMPOSE_FILE" down -v

echo ""
echo "Step 2/4: Removing dangling images and build cache..."
docker image prune -f

echo ""
echo "Step 3/4: Rebuilding images (no cache)..."
docker compose -f "$COMPOSE_FILE" build --no-cache --pull

echo ""
echo "Step 4/4: Starting fresh containers..."
docker compose -f "$COMPOSE_FILE" up -d

echo ""
echo "Waiting for services to become healthy..."
for svc in postgres redis backend; do
  echo -n "- Waiting for $svc..."
  for i in {1..30}; do
    cid=$(docker compose -f "$COMPOSE_FILE" ps -q "$svc" 2>/dev/null || true)
    if [ -n "$cid" ]; then
      status=$(docker inspect -f '{{.State.Health.Status}}' "$cid" 2>/dev/null || echo "unknown")
      if [ "$status" = "healthy" ]; then
        echo " healthy"
        break
      fi
    fi
    if [ $i -eq 30 ]; then
      echo " timeout (check logs)"
    fi
    sleep 2
  done
done

echo ""
echo "=============================================="
echo "  Rebuild Complete!"
echo "=============================================="
echo ""
echo "Services:"
echo "  - Backend:  http://localhost:3000"
echo "  - Frontend: Run 'npm run dev' in frontend/"
echo "  - Postgres: localhost:5432"
echo "  - Redis:    localhost:6379"
echo ""
echo "View logs: docker compose -f $COMPOSE_FILE logs -f"
echo ""
