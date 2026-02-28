# UXRay Setup Guide

This guide will help you set up and run the complete UXRay platform.

---

## Prerequisites

### Required Software
1. **Java 17+** - For Spring Boot backend
2. **Node.js 18+** - For all Node.js services
3. **MySQL 8.0+** - Database
4. **RabbitMQ** - Message broker
5. **Chrome/Chromium** - For Puppeteer and Lighthouse

### Required API Keys
1. **Google OAuth Client** - For GA4 integration
   - Create at: https://console.cloud.google.com/
   - Enable APIs: Analytics Admin API, Google Analytics Data API
2. **PageSpeed Insights API Key** - For Core Web Vitals
   - Get from: https://developers.google.com/speed/docs/insights/v5/get-started

---

## Step-by-Step Setup

### 1. Install RabbitMQ

#### Using Docker (Recommended)
```bash
docker run -d --name rabbitmq \
  -p 5672:5672 \
  -p 15672:15672 \
  rabbitmq:3-management
```

#### Using Package Manager
**macOS:**
```bash
brew install rabbitmq
brew services start rabbitmq
```

**Ubuntu/Debian:**
```bash
sudo apt-get install rabbitmq-server
sudo systemctl start rabbitmq-server
```

**Windows:**
Download installer from: https://www.rabbitmq.com/download.html

#### Verify RabbitMQ
- Management UI: http://localhost:15672
- Default credentials: `guest` / `guest`

---

### 2. Set Up Backend (Spring Boot)

```bash
cd backend

# Configure application.yml (if needed)
# Edit src/main/resources/application.yml

# Add Google OAuth credentials
# spring.security.oauth2.client.registration.google.client-id=YOUR_CLIENT_ID
# spring.security.oauth2.client.registration.google.client-secret=YOUR_CLIENT_SECRET

# Build and run
mvn clean install
mvn spring-boot:run
```

Backend will start on: http://localhost:8080

---

### 3. Set Up Crawler Service

```bash
cd crawler

# Install dependencies
npm install

# No configuration needed - uses defaults
# To customize, edit src/config.js

# Run
node src/main.js
```

Screenshot server will start on: http://localhost:8081

---

### 4. Set Up Design Analysis Service

```bash
cd design-analysis-service

# Install dependencies
npm install

# No configuration needed - uses defaults
# To customize, edit src/config.js

# Run
node src/main.js
```

---

### 5. Set Up GA4 Service

```bash
cd ga4-service

# Install dependencies
npm install

# Create .env file from template
cp .env.example .env

# Edit .env and add your credentials
# REQUIRED:
#   - GOOGLE_CLIENT_ID
#   - GOOGLE_CLIENT_SECRET
#   - PAGESPEED_API_KEY (for Core Web Vitals)

# Run
node src/main.js
```

#### Getting Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable APIs:
   - Analytics Admin API
   - Google Analytics Data API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Application type: "Web application"
6. Authorized redirect URIs: `http://localhost:8080/login/oauth2/code/google`
7. Copy Client ID and Client Secret to `.env`

#### Getting PageSpeed API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable: PageSpeed Insights API
3. Go to "Credentials" → "Create Credentials" → "API Key"
4. Copy API key to `.env`

---

### 6. Set Up Lighthouse Service

```bash
cd lighthouse-service

# Install dependencies
npm install

# No configuration needed - uses defaults
# To customize, edit src/config.js

# Run
node src/main.js
```

---

### 7. Set Up Frontend

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

Frontend will start on: http://localhost:3000

---

## Verification

### 1. Check RabbitMQ Queues
Go to: http://localhost:15672/#/queues

You should see these queues created by the services:
- `screenshot-jobs-queue`
- `design-analysis-queue`
- `ga4-analytics-queue`
- `lighthouse-audits-queue`

### 2. Check Backend
Go to: http://localhost:8080/api/auth/status

You should see:
```json
{"authenticated": false}
```

### 3. Check Crawler Screenshot Server
Go to: http://localhost:8081/health

You should see: `OK`

### 4. Test Complete Flow

1. Open frontend: http://localhost:3000
2. Click "Connect Google Analytics"
3. Complete OAuth flow
4. Enter a URL (e.g., https://example.com)
5. Select GA4 property
6. Click "Start URL Analysis"
7. Watch the job progress in real-time

---

## Troubleshooting

### Backend won't start
- **Issue**: Port 8080 already in use
- **Solution**: Stop other applications using port 8080, or change port in `application.yml`

### Services can't connect to RabbitMQ
- **Issue**: Connection refused to localhost:5672
- **Solution**: Make sure RabbitMQ is running: `docker ps` or check system service

### Crawler fails to launch Chrome
- **Issue**: Chrome/Chromium not found
- **Solution**: 
  ```bash
  # Install Chromium
  npx puppeteer browsers install chrome
  ```

### GA4 Service fails with authentication error
- **Issue**: Invalid OAuth credentials
- **Solution**: 
  1. Verify credentials in `.env`
  2. Make sure APIs are enabled in Google Cloud Console
  3. Check redirect URI matches exactly

### Frontend can't connect to backend
- **Issue**: CORS error or network error
- **Solution**: 
  1. Make sure backend is running on port 8080
  2. Check CORS configuration in backend `WebConfig.java`
  3. Verify axios baseURL in frontend code

### Screenshots not loading
- **Issue**: 404 on screenshot URLs
- **Solution**: 
  1. Make sure crawler service is running
  2. Verify screenshot server on port 8081
  3. Check screenshot directory: `crawler/screenshots/`

---

## Running in Production

### Environment Variables

Create `.env` files for each service:

#### Backend (application.yml)
```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/uxray
    username: ${DB_USER}
    password: ${DB_PASSWORD}
  rabbitmq:
    host: ${RABBITMQ_HOST:localhost}
    port: ${RABBITMQ_PORT:5672}
  security:
    oauth2:
      client:
        registration:
          google:
            client-id: ${GOOGLE_CLIENT_ID}
            client-secret: ${GOOGLE_CLIENT_SECRET}
```

#### All Node.js Services
Set `NODE_ENV=production`

### Docker Compose (Optional)

Create `docker-compose.yml` to run all services together:

```yaml
version: '3.8'

services:
  rabbitmq:
    image: rabbitmq:3-management
    ports:
      - "5672:5672"
      - "15672:15672"

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: uxray
      POSTGRES_USER: uxray
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"

  backend:
    build: ./backend
    ports:
      - "8080:8080"
    depends_on:
      - rabbitmq
      - postgres
    environment:
      SPRING_RABBITMQ_HOST: rabbitmq
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/uxray

  crawler:
    build: ./crawler
    ports:
      - "8081:8081"
    depends_on:
      - backend
      - rabbitmq

  # Add other services...
```

---

## Monitoring

### Check Service Health

```bash
# Backend
curl http://localhost:8080/actuator/health

# RabbitMQ
curl http://localhost:15672/api/overview -u guest:guest

# Crawler Screenshot Server
curl http://localhost:8081/health
```

### View Logs

Each service outputs logs to console. In production, configure log files:

**Backend**: Configure in `application.yml`
```yaml
logging:
  file:
    name: logs/backend.log
  level:
    com.dryno: DEBUG
```

**Node.js Services**: Use a logging library like Winston or PM2

---

## Scaling

### Horizontal Scaling
Run multiple instances of any service:

```bash
# Terminal 1
node src/main.js

# Terminal 2
node src/main.js

# Terminal 3
node src/main.js
```

RabbitMQ will distribute jobs across all instances (round-robin).

### Production Process Manager

Use PM2 for Node.js services:

```bash
npm install -g pm2

# Start services
pm2 start crawler/src/main.js --name crawler
pm2 start design-analysis-service/src/main.js --name design-analysis
pm2 start ga4-service/src/main.js --name ga4
pm2 start lighthouse-service/src/main.js --name lighthouse
pm2 start frontend/npm --name frontend -- start

# Monitor
pm2 monit

# View logs
pm2 logs

# Restart
pm2 restart all
```

---

## Security Considerations

1. **OAuth Credentials**: Never commit `.env` files to Git
2. **CORS**: Configure allowed origins in production
3. **Rate Limiting**: Add rate limiting to public endpoints
4. **API Keys**: Rotate regularly and use secrets manager
5. **Database**: Use strong passwords and encrypted connections
6. **HTTPS**: Use SSL/TLS in production

---

## Support

For issues or questions:
1. Check logs of all services
2. Verify RabbitMQ queues are working
3. Test each service independently
4. Review API documentation: `API_ENDPOINTS_DOCUMENTATION.md`
5. Check implementation summary: `IMPLEMENTATION_SUMMARY.md`

---

## Quick Start (Development)

```bash
# 1. Start RabbitMQ
docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management

# 2. Start all services in separate terminals
cd backend && mvn spring-boot:run
cd crawler && npm install && node src/main.js
cd design-analysis-service && npm install && node src/main.js
cd ga4-service && npm install && node src/main.js
cd lighthouse-service && npm install && node src/main.js
cd frontend && npm install && npm run dev

# 3. Open browser
open http://localhost:3000
```

**That's it! You're ready to analyze websites! 🚀**

