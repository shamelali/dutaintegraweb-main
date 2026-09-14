#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# send-event.sh — Push a single event to the Autonomous Ops feed.
#
# Usage:
#   ./scripts/send-event.sh <cat> <action> [detail] [severity] [region] [industry]
#
# Environment:
#   OPS_URL      — base URL (default: https://www.dutaintegra.my)
#   ADMIN_TOKEN  — required; x-admin-token header value
#
# Categories: disk, backup, security, patch, uptime, scale, ssl, memory,
#             access, firewall, database, cost, ticket
# Severities: info (default), warning, error
#
# Examples:
#   ./scripts/send-event.sh backup "Backup verified" "Full backup integrity OK" info KL Fintech
#   ./scripts/send-event.sh security "Threat blocked" "Brute-force SSH attempt" warning Penang Manufacturing
#   ./scripts/send-event.sh disk "Disk cleanup" "Cleared 4.1 GB temp files" info Johor Logistics
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

OPS_URL="${OPS_URL:-https://www.dutaintegra.my}"
ADMIN_TOKEN="${ADMIN_TOKEN:?ADMIN_TOKEN env var is required}"

CAT="${1:?Usage: send-event.sh <cat> <action> [detail] [severity] [region] [industry]}"
ACTION="${2:?Usage: send-event.sh <cat> <action> [detail] [severity] [region] [industry]}"
DETAIL="${3:-}"
SEVERITY="${4:-info}"
REGION="${5:-KL}"
INDUSTRY="${6:-SME}"

PAYLOAD=$(cat <<EOF
{
  "cat": "${CAT}",
  "action": "${ACTION}",
  "detail": "${DETAIL}",
  "severity": "${SEVERITY}",
  "auto": true,
  "client_region": "${REGION}",
  "client_industry": "${INDUSTRY}"
}
EOF
)

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST "${OPS_URL}/api/ops/events" \
  -H "Content-Type: application/json" \
  -H "x-admin-token: ${ADMIN_TOKEN}" \
  -d "${PAYLOAD}")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "201" ]; then
  echo "✅ Event recorded: ${CAT} — ${ACTION}"
else
  echo "❌ Failed (${HTTP_CODE}): ${BODY}"
  exit 1
fi
