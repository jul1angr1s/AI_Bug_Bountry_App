#!/bin/bash

# Trigger a scan for ThunderLoan protocol
PROTOCOL_ID="2db0ed08-a401-4e00-94fe-e1bc61574725"

echo "🚀 Triggering scan for protocol: $PROTOCOL_ID"

# Get auth token (from browser localStorage)
# You can get this by running in browser console: localStorage.getItem('token')

curl -X POST "http://localhost:3000/api/v1/scans" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d "{
    \"protocolId\": \"$PROTOCOL_ID\",
    \"branch\": \"main\"
  }" \
  | python3 -m json.tool

echo ""
echo "✅ Scan triggered! Check the UI for progress."
