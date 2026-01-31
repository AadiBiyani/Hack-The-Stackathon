#!/bin/bash
# Test the gateway POST /api/match (backend and gateway must be running)
# Usage: ./test-match.sh [patient_id]
# If patient_id omitted, creates a patient and runs crawl first (requires backend on 8000).

BACKEND="${BACKEND_URL:-http://localhost:8000}"
GATEWAY="${GATEWAY_URL:-http://localhost:3000}"

if [ -n "$1" ]; then
  PATIENT_ID="$1"
  echo "Using patient_id: $PATIENT_ID"
else
  echo "No patient_id given. Creating patient and running crawl via backend..."
  CRAWL=$(curl -s -X POST "$BACKEND/api/trials/crawl" \
    -H "Content-Type: application/json" \
    -d '{"condition": "multiple sclerosis", "max_trials": 10, "enrich_with_firecrawl": true}')
  echo "Crawl: $CRAWL"
  # Use unique email so re-runs don't hit duplicate key
  UNIQUE_EMAIL="test-match-$(date +%s)@example.com"
  CREATE=$(curl -s -w "\n%{http_code}" -X POST "$BACKEND/api/patients" \
    -H "Content-Type: application/json" \
    -d "{
      \"name\": \"Test Patient\",
      \"email\": \"$UNIQUE_EMAIL\",
      \"age\": 35,
      \"condition\": \"multiple sclerosis\",
      \"location\": \"San Francisco, CA\",
      \"doctor_name\": \"Dr. Smith\",
      \"doctor_email\": \"doctor@example.com\"
    }")
  HTTP_CODE=$(echo "$CREATE" | tail -n1)
  BODY=$(echo "$CREATE" | sed '$d')
  PATIENT_ID=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('patient_id') or d.get('patient',{}).get('_id',''))" 2>/dev/null)
  if [ -z "$PATIENT_ID" ]; then
    echo "Failed to create patient (HTTP $HTTP_CODE). Response body:"
    echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
    echo ""
    echo "If 500: check the backend terminal for the Python traceback."
    echo "If 400: e.g. duplicate email - use a patient_id from: curl -s $BACKEND/api/patients"
    exit 1
  fi
  echo "Created patient_id: $PATIENT_ID"
fi

echo ""
echo "Calling gateway POST $GATEWAY/api/match with patient_id=$PATIENT_ID"
echo "(This can take 30–60s while the agent runs.)"
echo ""

RESP=$(curl -s -w "\n%{http_code}" -X POST "$GATEWAY/api/match" \
  -H "Content-Type: application/json" \
  -d "{\"patient_id\": \"$PATIENT_ID\"}")
CODE=$(echo "$RESP" | tail -n1)
BODY=$(echo "$RESP" | sed '$d')

if echo "$BODY" | python3 -m json.tool >/dev/null 2>&1; then
  echo "$BODY" | python3 -m json.tool
  if [ "$CODE" = "200" ]; then
    echo ""
    echo "✓ Match completed successfully. Check backend for POST /api/matches and stored matches."
  else
    echo ""
    echo "HTTP $CODE - check 'error' / 'detail' above."
  fi
else
  echo "HTTP $CODE"
  echo "Response (not valid JSON):"
  echo "$BODY" | head -c 500
  [ ${#BODY} -gt 500 ] && echo "..."
  echo ""
  echo "If empty: gateway may have timed out or crashed. Check the frontend (Next.js) terminal for errors."
  echo "If HTML: gateway may have returned an error page. Check OPENROUTER_API_KEY and backend URL."
fi
