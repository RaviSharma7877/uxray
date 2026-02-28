#!/bin/bash

# Script to check if all UXRay services are running properly

echo "🔍 UXRay Services Health Check"
echo "================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check RabbitMQ
echo "1️⃣  Checking RabbitMQ..."
if lsof -i :5672 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ RabbitMQ is running on port 5672${NC}"
else
    echo -e "${RED}❌ RabbitMQ is NOT running on port 5672${NC}"
    echo "   Start with: brew services start rabbitmq"
fi
echo ""

# Check Backend (Spring Boot)
echo "2️⃣  Checking Backend (Spring Boot)..."
if lsof -i :8080 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend is running on port 8080${NC}"
    # Test the health
    if curl -s http://localhost:8080/api/jobs/me/test 2>&1 | grep -q "404\|401\|jobs"; then
        echo -e "${GREEN}   Backend API is responding${NC}"
    fi
else
    echo -e "${RED}❌ Backend is NOT running on port 8080${NC}"
    echo "   Start with: cd backend && ./mvnw spring-boot:run"
fi
echo ""

# Check Frontend (Next.js)
echo "3️⃣  Checking Frontend (Next.js)..."
if lsof -i :3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend is running on port 3000${NC}"
else
    echo -e "${RED}❌ Frontend is NOT running on port 3000${NC}"
    echo "   Start with: cd frontend && npm run dev"
fi
echo ""

# Check Crawler Service
echo "4️⃣  Checking Crawler Service..."
if lsof -i :8081 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Crawler Service is running on port 8081${NC}"
    # Test the health endpoint
    if curl -s http://localhost:8081/health 2>&1 | grep -q "OK"; then
        echo -e "${GREEN}   Image server is healthy${NC}"
    fi
else
    echo -e "${RED}❌ Crawler Service is NOT running on port 8081${NC}"
    echo "   Start with: cd crawler && npm start"
fi
echo ""

# Check for Node processes (Lighthouse, GA4, Design Analysis)
echo "5️⃣  Checking Background Services (Node.js)..."

# Lighthouse Service
if pgrep -f "lighthouse-service" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Lighthouse Service is running${NC}"
else
    echo -e "${RED}❌ Lighthouse Service is NOT running${NC}"
    echo "   Start with: cd lighthouse-service && npm start"
fi

# GA4 Service  
if pgrep -f "ga4-service" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ GA4 Service is running${NC}"
else
    echo -e "${YELLOW}⚠️  GA4 Service is NOT running${NC}"
    echo "   Start with: cd ga4-service && npm start"
fi

# Design Analysis Service
if pgrep -f "design-analysis-service" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Design Analysis Service is running${NC}"
else
    echo -e "${YELLOW}⚠️  Design Analysis Service is NOT running${NC}"
    echo "   Start with: cd design-analysis-service && npm start"
fi

echo ""
echo "================================"
echo "📊 Summary:"
echo ""

# Count running services
RUNNING=0
TOTAL=7

lsof -i :5672 > /dev/null 2>&1 && ((RUNNING++))
lsof -i :8080 > /dev/null 2>&1 && ((RUNNING++))
lsof -i :3000 > /dev/null 2>&1 && ((RUNNING++))
lsof -i :8081 > /dev/null 2>&1 && ((RUNNING++))
pgrep -f "lighthouse-service" > /dev/null 2>&1 && ((RUNNING++))
pgrep -f "ga4-service" > /dev/null 2>&1 && ((RUNNING++))
pgrep -f "design-analysis-service" > /dev/null 2>&1 && ((RUNNING++))

if [ $RUNNING -eq $TOTAL ]; then
    echo -e "${GREEN}All services are running! ($RUNNING/$TOTAL)${NC}"
elif [ $RUNNING -ge 5 ]; then
    echo -e "${YELLOW}Most services are running ($RUNNING/$TOTAL)${NC}"
    echo "Core services (Backend, Frontend, Crawler, Lighthouse) must be running for full functionality."
else
    echo -e "${RED}Some services are missing ($RUNNING/$TOTAL)${NC}"
    echo "Please start the missing services to use UXRay."
fi

echo ""
echo "🔗 Quick Links:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:8080/api/jobs"
echo "   Screenshot Server: http://localhost:8081/health"
echo "   RabbitMQ Management: http://localhost:15672 (guest/guest)"
echo ""

