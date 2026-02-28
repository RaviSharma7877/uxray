#!/bin/bash

# Test API Script for UXRay
# This script tests the basic CRUD operations

BASE_URL="http://localhost:8080"

echo "🧪 Testing UXRay API Endpoints..."
echo "================================"
echo ""

# Test 1: Create a User
echo "1️⃣  Creating a test user..."
USER_RESPONSE=$(curl -s -X POST ${BASE_URL}/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@uxray.com",
    "name": "Test User"
  }')

echo "Response: $USER_RESPONSE"
echo ""

# Test 2: Get all users
echo "2️⃣  Getting all users..."
curl -s ${BASE_URL}/api/users | python3 -m json.tool
echo ""

# Test 3: Create a URL Analysis Job
echo "3️⃣  Creating a URL analysis job..."
JOB_RESPONSE=$(curl -s -X POST ${BASE_URL}/api/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "type": "URL_ANALYSIS",
    "url": "https://e2shub.com",
    "pages": 3
  }')

echo "Response: $JOB_RESPONSE"
JOB_ID=$(echo $JOB_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])" 2>/dev/null)
echo "Job ID: $JOB_ID"
echo ""

# Test 4: Get Job Details
if [ ! -z "$JOB_ID" ]; then
  echo "4️⃣  Getting job details..."
  curl -s ${BASE_URL}/api/jobs/me/${JOB_ID} | python3 -m json.tool
  echo ""
fi

# Test 5: Create a Design Analysis Job
echo "5️⃣  Creating a design analysis job..."
DESIGN_JOB=$(curl -s -X POST ${BASE_URL}/api/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "type": "DESIGN_ANALYSIS",
    "designInput": "https://www.figma.com/file/example"
  }')

echo "Response: $DESIGN_JOB"
echo ""

# Test 6: Check Database Tables
echo "6️⃣  Verifying database tables..."
echo "To manually check the database, run:"
echo "  mysql -u root -p uxray -e 'SHOW TABLES;'"
echo "  mysql -u root -p uxray -e 'SELECT * FROM users;'"
echo "  mysql -u root -p uxray -e 'SELECT id, type, status, start_url FROM jobs;'"
echo ""

echo "✅ API tests completed!"
echo ""
echo "Next steps:"
echo "  1. Check the backend logs for any errors"
echo "  2. Verify data in MySQL database"
echo "  3. Test with the frontend at http://localhost:3000"

