#!/bin/bash

# Script to start all UXRay services in separate terminal windows

echo "🚀 Starting All UXRay Services..."
echo "================================"
echo ""

# Check if RabbitMQ is running
if ! lsof -i :5672 > /dev/null 2>&1; then
    echo "⚠️  RabbitMQ is not running. Starting it..."
    brew services start rabbitmq
    echo "⏳ Waiting for RabbitMQ to start (10 seconds)..."
    sleep 10
fi

# Get the absolute path to the project directory
PROJECT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Function to open a new terminal and run a command (macOS)
start_service() {
    local service_name=$1
    local directory=$2
    local command=$3
    
    echo "🔧 Starting $service_name..."
    
    osascript <<EOF
    tell application "Terminal"
        do script "cd '$PROJECT_DIR/$directory' && echo '▶️  $service_name' && echo '' && $command"
        set custom title of front window to "$service_name - UXRay"
    end tell
EOF
}

# Start Backend (Spring Boot)
if ! lsof -i :8080 > /dev/null 2>&1; then
    start_service "Backend API" "backend" "./mvnw spring-boot:run"
    sleep 5
else
    echo "✅ Backend already running"
fi

# Start Crawler Service
if ! lsof -i :8081 > /dev/null 2>&1; then
    start_service "Crawler Service" "crawler" "npm install && npm start"
    sleep 3
else
    echo "✅ Crawler Service already running"
fi

# Start Lighthouse Service ⭐ CRITICAL
if ! pgrep -f "lighthouse-service" > /dev/null 2>&1; then
    start_service "Lighthouse Service" "lighthouse-service" "npm install && npm start"
    sleep 3
else
    echo "✅ Lighthouse Service already running"
fi

# Start GA4 Service (Optional)
if ! pgrep -f "ga4-service" > /dev/null 2>&1; then
    start_service "GA4 Service" "ga4-service" "npm install && npm start"
    sleep 2
else
    echo "✅ GA4 Service already running"
fi

# Start Design Analysis Service (Optional)
if ! pgrep -f "design-analysis-service" > /dev/null 2>&1; then
    start_service "Design Analysis Service" "design-analysis-service" "npm install && npm start"
    sleep 2
else
    echo "✅ Design Analysis Service already running"
fi

# Start Frontend (Next.js)
if ! lsof -i :3000 > /dev/null 2>&1; then
    start_service "Frontend" "frontend" "npm install && npm run dev"
else
    echo "✅ Frontend already running"
fi

echo ""
echo "================================"
echo "✅ All services starting!"
echo ""
echo "⏳ Please wait 15-20 seconds for all services to initialize..."
echo ""
echo "📌 Service URLs:"
echo "   • Frontend:         http://localhost:3000"
echo "   • Backend API:      http://localhost:8080"
echo "   • Screenshot Server: http://localhost:8081/health"
echo "   • RabbitMQ UI:      http://localhost:15672 (guest/guest)"
echo ""
echo "💡 To check service status, run: ./check-services.sh"
echo ""
echo "🛑 To stop all services:"
echo "   • Close all Terminal windows"
echo "   • Or run: pkill -f 'mvnw|npm start|node src/main.js'"
echo ""

