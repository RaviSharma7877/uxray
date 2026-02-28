#!/bin/bash

# Test Lighthouse Data Flow - Complete End-to-End Test

echo "🧪 Testing Lighthouse Data Flow"
echo "================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check prerequisites
echo "1️⃣  Checking Prerequisites..."
echo ""

# Check Backend
if ! curl -s http://localhost:8080/api/jobs/me/test 2>&1 | grep -q "404\|401\|jobs"; then
    echo -e "${RED}❌ Backend is not running on port 8080${NC}"
    echo "   Start with: cd backend && ./mvnw spring-boot:run"
    exit 1
fi
echo -e "${GREEN}✅ Backend is running${NC}"

# Check RabbitMQ
if ! lsof -i :5672 > /dev/null 2>&1; then
    echo -e "${RED}❌ RabbitMQ is not running${NC}"
    echo "   Start with: brew services start rabbitmq"
    exit 1
fi
echo -e "${GREEN}✅ RabbitMQ is running${NC}"

# Check Lighthouse Service
if ! pgrep -f "lighthouse-service" > /dev/null 2>&1; then
    echo -e "${RED}❌ Lighthouse Service is NOT running${NC}"
    echo ""
    echo -e "${YELLOW}This is likely why scores aren't showing!${NC}"
    echo ""
    echo "Start it with:"
    echo "   cd lighthouse-service && npm start"
    echo ""
    exit 1
fi
echo -e "${GREEN}✅ Lighthouse Service is running${NC}"

echo ""
echo "2️⃣  Creating Test Job..."
echo ""

# Create a test job
RESPONSE=$(curl -s -X POST http://localhost:8080/api/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "type": "URL_ANALYSIS",
    "url": "https://example.com",
    "pages": 1
  }')

JOB_ID=$(echo $RESPONSE | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

if [ -z "$JOB_ID" ]; then
    echo -e "${RED}❌ Failed to create job${NC}"
    echo "Response: $RESPONSE"
    exit 1
fi

echo -e "${GREEN}✅ Job created: $JOB_ID${NC}"
echo ""

echo "3️⃣  Monitoring Job Progress..."
echo ""
echo "Watching for:"
echo "  • Job status changes"
echo "  • Lighthouse scores appearing"
echo ""

# Monitor for 90 seconds
for i in {1..30}; do
    sleep 3
    
    JOB_DATA=$(curl -s http://localhost:8080/api/jobs/me/$JOB_ID)
    
    STATUS=$(echo $JOB_DATA | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    PERF_SCORE=$(echo $JOB_DATA | grep -o '"mainPerformanceScore":[0-9.]*' | cut -d':' -f2)
    ACCESS_SCORE=$(echo $JOB_DATA | grep -o '"mainAccessibilityScore":[0-9.]*' | cut -d':' -f2)
    
    echo -n "[$i/30] Status: $STATUS"
    
    if [ ! -z "$PERF_SCORE" ]; then
        echo -n " | Scores: Perf=$PERF_SCORE"
        if [ ! -z "$ACCESS_SCORE" ]; then
            echo -n ", Access=$ACCESS_SCORE"
        fi
        echo -e " ${GREEN}✅ SCORES RECEIVED!${NC}"
        echo ""
        echo "4️⃣  SUCCESS! Lighthouse scores are working!"
        echo ""
        echo "Full job data:"
        echo "$JOB_DATA" | jq '.' 2>/dev/null || echo "$JOB_DATA"
        echo ""
        echo -e "${GREEN}🎉 Lighthouse data flow is working correctly!${NC}"
        echo ""
        echo "You should see these scores at:"
        echo "   http://localhost:3000"
        echo ""
        exit 0
    else
        echo " | No scores yet..."
    fi
    
    if [ "$STATUS" = "FAILED" ]; then
        echo ""
        echo -e "${RED}❌ Job failed${NC}"
        echo "Job data: $JOB_DATA"
        exit 1
    fi
done

echo ""
echo -e "${YELLOW}⚠️  Timeout - Lighthouse scores did not appear in 90 seconds${NC}"
echo ""
echo "Possible issues:"
echo "1. Lighthouse service is slow or stuck"
echo "2. URL is unreachable or very slow"
echo "3. Lighthouse service can't connect to backend"
echo ""
echo "Check lighthouse-service logs for errors"
echo "Check backend logs for PATCH /api/jobs/me/$JOB_ID/scores"
echo ""
echo "Current job status:"
curl -s http://localhost:8080/api/jobs/me/$JOB_ID | jq '.' 2>/dev/null || curl -s http://localhost:8080/api/jobs/me/$JOB_ID
echo ""

