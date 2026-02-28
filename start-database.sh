#!/bin/bash

# UXRay Database Startup Script
# This script starts MySQL database using Docker

echo "🚀 Starting UXRay MySQL Database..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "   Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if container already exists
if docker ps -a --format '{{.Names}}' | grep -q '^mysql-uxray$'; then
    echo "📦 MySQL container already exists"
    
    # Check if it's running
    if docker ps --format '{{.Names}}' | grep -q '^mysql-uxray$'; then
        echo "✅ MySQL is already running"
    else
        echo "▶️  Starting existing MySQL container..."
        docker start mysql-uxray
        echo "✅ MySQL started successfully"
    fi
else
    echo "📦 Creating new MySQL container..."
    docker run -d \
      --name mysql-uxray \
      -e MYSQL_ROOT_PASSWORD=password \
      -e MYSQL_DATABASE=uxray \
      -p 3306:3306 \
      mysql:8.0
    
    echo "⏳ Waiting for MySQL to initialize (30 seconds)..."
    sleep 30
    echo "✅ MySQL created and started successfully"
fi

# Verify MySQL is running
if docker ps | grep -q 'mysql-uxray'; then
    echo ""
    echo "✨ MySQL Database is ready!"
    echo ""
    echo "Connection details:"
    echo "  Host:     localhost"
    echo "  Port:     3306"
    echo "  Database: uxray"
    echo "  Username: root"
    echo "  Password: password"
    echo ""
    echo "Next steps:"
    echo "  1. cd backend"
    echo "  2. Create .env file with DB credentials (if not exists)"
    echo "  3. mvn spring-boot:run"
    echo ""
else
    echo "❌ Failed to start MySQL. Please check Docker logs:"
    echo "   docker logs mysql-uxray"
    exit 1
fi

