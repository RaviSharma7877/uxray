# Quick Start Checklist ✅

## 🎯 Goal: Get Backend Running in 5 Minutes

All configuration issues are **FIXED**! Follow these simple steps:

---

## Step 1: Start MySQL Database

```bash
# Run this script (it handles everything)
./start-database.sh
```

**OR manually with Docker:**
```bash
docker run -d --name mysql-uxray \
  -e MYSQL_ROOT_PASSWORD=Ravi@123 \
  -e MYSQL_DATABASE=uxray \
  -p 3306:3306 \
  mysql:8.0
```

✅ **Done when you see**: "MySQL Database is ready!"

---

## Step 2: Start Backend

```bash
cd backend
mvn spring-boot:run
```

✅ **Done when you see**: 
```
Started BackendApplication in X.XXX seconds
```

**That's it!** The backend is now running on `http://localhost:8080`

---

## Step 3: Verify it Works

```bash
# Test in another terminal
curl http://localhost:8080/api/auth/status
```

✅ **Expected response**:
```json
{"authenticated":false}
```

---

## Optional: Add Google OAuth (for GA4 Features)

**Current Status**: Backend works WITHOUT OAuth credentials!
- ✅ URL Analysis (screenshots + Lighthouse) works
- ✅ Design Analysis works  
- ❌ GA4 Analytics doesn't work (needs OAuth)

**To Enable GA4**:

1. Get Google OAuth credentials (5-10 minutes)
   - See `backend/ENV_SETUP.md` for detailed steps

2. Set environment variables:
```bash
export GOOGLE_CLIENT_ID=your-id.apps.googleusercontent.com
export GOOGLE_CLIENT_SECRET=your-secret
```

3. Restart backend

---

## Complete System Startup

Once backend is running, start the services:

### Terminal 1: Backend (Already Running)
```bash
cd backend
mvn spring-boot:run
```

### Terminal 2: Crawler Service
```bash
cd crawler
npm install
node src/main.js
```

### Terminal 3: Lighthouse Service
```bash
cd lighthouse-service
npm install
node src/main.js
```

### Terminal 4: Design Analysis Service
```bash
cd design-analysis-service
npm install
node src/main.js
```

### Terminal 5: GA4 Service (Optional)
```bash
cd ga4-service
npm install
# Only if you have OAuth credentials
node src/main.js
```

### Terminal 6: Frontend
```bash
cd frontend
npm install
npm run dev
```

### Terminal 7: RabbitMQ (if not using Docker)
```bash
# Or use Docker:
docker run -d --name rabbitmq \
  -p 5672:5672 \
  -p 15672:15672 \
  rabbitmq:3-management
```

---

## Access Points

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | http://localhost:3000 | Main UI |
| Backend API | http://localhost:8080 | REST API |
| Screenshots | http://localhost:8081 | Static images |
| RabbitMQ | http://localhost:15672 | Queue management |
| MySQL | localhost:3306 | Database |

---

## Troubleshooting

### Backend won't start

**Check 1**: Is MySQL running?
```bash
docker ps | grep mysql
```
If not: Run `./start-database.sh`

**Check 2**: Check logs for errors
```bash
cd backend
mvn spring-boot:run
# Look for error messages
```

### Can't access frontend

```bash
# Make sure it's running
cd frontend
npm run dev
```

### Services can't connect to RabbitMQ

```bash
# Start RabbitMQ
docker run -d --name rabbitmq \
  -p 5672:5672 -p 15672:15672 \
  rabbitmq:3-management
```

---

## What's Been Fixed

✅ **Database Configuration**
- MySQL properly configured
- Auto-creates database if missing
- Uses password: `Ravi@123`

✅ **OAuth Configuration**
- Uses placeholder values (won't crash)
- Backend starts without real OAuth
- Add real credentials later for GA4

✅ **All Errors Resolved**
- No more "DataSource not configured"
- No more "Client ID empty"
- Backend starts successfully!

---

## Documentation

- **This file**: Quick start checklist
- **CONFIGURATION_FIXES.md**: What was fixed and why
- **MYSQL_SETUP.md**: Detailed MySQL setup
- **backend/ENV_SETUP.md**: Environment variables guide
- **SETUP_GUIDE.md**: Complete setup instructions

---

## Summary

```bash
# Minimum to run backend (2 commands):
./start-database.sh
cd backend && mvn spring-boot:run

# Full system (add services as needed)
# See "Complete System Startup" section above
```

**Your backend is ready! 🚀**

