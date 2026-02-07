#!/bin/bash
#
# session-preflight.sh - Quick infrastructure check for Claude Code session start
#
# This is a lightweight check suitable for session start hooks.
# For comprehensive diagnostics, use diagnose-payment.sh instead.
#

# Quick Redis check (silent unless failed)
if ! redis-cli -a redis_dev_2024 ping > /dev/null 2>&1; then
    echo "⚠️  Redis not responding - payment flows may fail"
fi

# Quick backend check (silent unless failed)
if ! curl -sf http://localhost:3000/api/v1/health > /dev/null 2>&1; then
    echo "⚠️  Backend not running at localhost:3000"
fi

# Always succeed (don't block session start)
exit 0
