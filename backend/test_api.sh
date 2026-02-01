#!/bin/bash
# Quick API test script - run with backend server on http://localhost:8000
# Usage: ./test_api.sh   or   bash test_api.sh

BASE_URL="${BASE_URL:-http://localhost:8000}"

echo "════════════════════════════════════════════"
echo "  Testing MatchPoint API"
echo "  Base URL: $BASE_URL"
echo "════════════════════════════════════════════"
echo ""

# 1. Health check
echo "1. GET /health"
curl -s "$BASE_URL/health" | python3 -m json.tool
echo ""
echo ""

# 2. Root / API info
echo "2. GET /"
curl -s "$BASE_URL/" | python3 -m json.tool
echo ""
echo ""

# 3. List trials (may be empty if no crawl run yet)
echo "3. GET /api/trials (list trials)"
curl -s "$BASE_URL/api/trials?limit=5" | python3 -m json.tool
echo ""
echo ""

# 4. Trigger crawl for "multiple sclerosis" (3 trials, quick test)
echo "4. POST /api/trials/crawl (trigger crawl - multiple sclerosis, max 3)"
curl -s -X POST "$BASE_URL/api/trials/crawl" \
  -H "Content-Type: application/json" \
  -d '{"condition": "multiple sclerosis", "max_trials": 3, "enrich_with_firecrawl": false}' \
  | python3 -m json.tool
echo ""
echo ""

# 5. List trials again (should have data now if MongoDB is connected)
echo "5. GET /api/trials (list trials after crawl)"
curl -s "$BASE_URL/api/trials?condition=multiple_sclerosis&limit=5" | python3 -m json.tool
echo ""
echo ""

# 6. Create a test patient
echo "6. POST /api/patients (create test patient)"
curl -s -X POST "$BASE_URL/api/patients" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Patient",
    "email": "test@example.com",
    "age": 35,
    "condition": "multiple sclerosis",
    "location": "San Francisco, CA",
    "doctor_name": "Dr. Smith",
    "doctor_email": "doctor@example.com"
  }' | python3 -m json.tool
echo ""
echo ""

# 7. List patients
echo "7. GET /api/patients"
curl -s "$BASE_URL/api/patients" | python3 -m json.tool
echo ""
echo ""

# 8. Database stats (what is stored)
echo "8. GET /api/db-stats (see what is in MongoDB)"
curl -s "$BASE_URL/api/db-stats" | python3 -m json.tool
echo ""
echo ""

echo "════════════════════════════════════════════"
echo "  Done. Check output above for errors."
echo "  Full API docs: $BASE_URL/docs"
echo "  DB contents:   $BASE_URL/api/db-stats"
echo "════════════════════════════════════════════"
