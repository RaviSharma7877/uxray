# Lighthouse Data Not Displaying - Troubleshooting Guide

## Problem
Lighthouse scores (Performance, Accessibility, Best Practices, SEO) are not showing up in the UI.

---

## Quick Diagnosis

Run this command to check if all services are running:

```bash
./check-services.sh
```

**Most Common Issue**: The **Lighthouse Service is not running**. ✅

---

## Solution: Start the Lighthouse Service

### Option 1: Start Manually

```bash
cd lighthouse-service
npm install    # If you haven't installed dependencies
npm start
```

You should see output like:
```
[AMQP] Lighthouse service connecting to RabbitMQ...
[AMQP] Waiting for audit requests in queue: lighthouse-audits-queue
```

### Option 2: Use the Start-All Script

```bash
# Start all services at once
./start-all-services.sh
```

---

## Verify Lighthouse Service is Working

### 1. Check if it's running:
```bash
ps aux | grep lighthouse
```

You should see a process like: `node src/main.js` in lighthouse-service

### 2. Check RabbitMQ Queue:
- Open http://localhost:15672 (username: `guest`, password: `guest`)
- Go to "Queues" tab
- Look for `lighthouse-audits-queue`
- Check if messages are being consumed

### 3. Check Backend Logs:
When you create a job, the backend should dispatch to the queue:
```
Dispatched message to queue: lighthouse-audits-queue
```

### 4. Check Lighthouse Service Logs:
When processing a job, you should see:
```
[LIGHTHOUSE] Starting audit for https://example.com (Job: abc123...)
[LIGHTHOUSE] Audit complete for Job abc123. Scores: { mainPerformanceScore: 95, ... }
[API] Updated scores for main job abc123
```

---

## Complete Service Startup Order

For a fresh start, follow this order:

### 1. Start RabbitMQ (if not running)
```bash
brew services start rabbitmq
# Or Docker: docker run -d -p 5672:5672 -p 15672:15672 rabbitmq:3-management
```

### 2. Start Backend
```bash
cd backend
./mvnw spring-boot:run
```
Wait until you see: `Started BackendApplication`

### 3. Start Crawler Service
```bash
cd crawler
npm install  # First time only
npm start
```
Wait until you see: `Image server running at http://localhost:8081`

### 4. Start Lighthouse Service ⭐ **CRITICAL FOR SCORES**
```bash
cd lighthouse-service
npm install  # First time only
npm start
```
Wait until you see: `Waiting for audit requests in queue`

### 5. Start GA4 Service (Optional - for analytics)
```bash
cd ga4-service
npm install  # First time only
npm start
```

### 6. Start Frontend
```bash
cd frontend
npm install  # First time only
npm run dev
```

---

## Testing the Fix

### 1. Create a New Job
- Open http://localhost:3000
- Enter a URL (e.g., `https://example.com`)
- Click "Start URL Analysis"

### 2. Watch the Logs

**Lighthouse Service Terminal** should show:
```
[LIGHTHOUSE] Starting audit for https://example.com
[LIGHTHOUSE] Audit complete. Scores: { mainPerformanceScore: 87, ... }
[API] Updated scores for main job <jobId>
```

**Backend Terminal** should show:
```
PATCH /api/jobs/me/<jobId>/scores
Updated job <jobId> with scores
```

### 3. Check the UI
- Wait for job to complete (status: COMPLETED)
- You should see the Lighthouse scores:
  - Performance: X/100
  - Accessibility: X/100
  - Best Practices: X/100
  - SEO: X/100

---

## Common Issues & Fixes

### ❌ Issue: "Connection refused" in Lighthouse Service
**Cause**: RabbitMQ is not running

**Fix**:
```bash
brew services start rabbitmq
# Wait 10 seconds, then restart Lighthouse service
cd lighthouse-service && npm start
```

---

### ❌ Issue: Scores show "—" (dash/placeholder)
**Cause**: Lighthouse service hasn't updated the job yet

**Possible Reasons**:
1. Lighthouse service isn't running → Start it
2. Lighthouse is still processing → Wait a bit longer
3. Audit failed → Check Lighthouse service logs for errors
4. Wrong URL format → Ensure URL has `http://` or `https://`

---

### ❌ Issue: "Chrome not found" Error
**Cause**: Chromium not installed for Lighthouse

**Fix**:
```bash
# Install Chromium for Lighthouse
npx @puppeteer/browsers install chrome@stable

# Or use Puppeteer's bundled Chrome
cd lighthouse-service
npm install puppeteer
```

---

### ❌ Issue: Lighthouse audit times out
**Cause**: Website is slow or unreachable

**Fix**:
- Try a faster website first (e.g., `https://example.com`)
- Check if the URL is accessible from your machine
- Increase timeout in `lighthouse.js` if needed

---

### ❌ Issue: Scores update but don't show in UI
**Cause**: Frontend not polling or cache issue

**Fix**:
```bash
# Clear frontend cache
cd frontend
rm -rf .next
npm run dev

# Hard refresh browser: Cmd+Shift+R (Mac) or Ctrl+Shift+F5 (Windows)
```

---

## Debug: Manual Test of Lighthouse Service

### Test if Lighthouse Service receives messages:

1. **Create a test job manually** via backend API:
```bash
curl -X POST http://localhost:8080/api/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "type": "URL_ANALYSIS",
    "url": "https://example.com",
    "pages": 1
  }'
```

2. **Check Lighthouse service logs** - should start processing

3. **Check if scores were updated**:
```bash
curl http://localhost:8080/api/jobs/me/<jobId>
```

Look for `mainPerformanceScore`, `mainAccessibilityScore`, etc.

---

## Quick Reference: All Services & Ports

| Service | Port | Command | Required For |
|---------|------|---------|--------------|
| RabbitMQ | 5672 | `brew services start rabbitmq` | All async jobs |
| Backend | 8080 | `cd backend && ./mvnw spring-boot:run` | Everything |
| Frontend | 3000 | `cd frontend && npm run dev` | UI |
| Crawler | 8081 | `cd crawler && npm start` | Screenshots |
| **Lighthouse** | - | `cd lighthouse-service && npm start` | **Performance Scores** ⭐ |
| GA4 | - | `cd ga4-service && npm start` | Analytics (optional) |
| Design Analysis | - | `cd design-analysis-service && npm start` | Design jobs (optional) |

---

## Expected Data Flow for Lighthouse Scores

```
1. User submits URL in frontend
   ↓
2. Backend creates job, dispatches to RabbitMQ queue: lighthouse-audits-queue
   ↓
3. Lighthouse Service picks up message from queue
   ↓
4. Lighthouse runs Chrome audit on the URL
   ↓
5. Lighthouse service extracts scores (performance, accessibility, etc.)
   ↓
6. Lighthouse service calls: PATCH /api/jobs/me/{jobId}/scores
   ↓
7. Backend saves scores to database
   ↓
8. Frontend polls GET /api/jobs/me/{jobId}
   ↓
9. Frontend displays scores in MainScoresPanel component
```

**If scores don't show**, the break is somewhere in steps 3-7. Usually step 3 (Lighthouse service not running).

---

## Verification Checklist

Before submitting a job, ensure:

- [ ] RabbitMQ is running (port 5672)
- [ ] Backend is running (port 8080)
- [ ] Lighthouse Service is running (check `ps aux | grep lighthouse`)
- [ ] Crawler Service is running (port 8081)
- [ ] Frontend is running (port 3000)
- [ ] RabbitMQ queue `lighthouse-audits-queue` exists
- [ ] Chrome/Chromium is installed

Run: `./check-services.sh` to verify automatically.

---

## Still Not Working?

### Check Database:
```bash
# Connect to MySQL
mysql -u root -p

USE uxray;
SELECT id, main_performance_score, main_accessibility_score, main_best_practices_score, main_seo_score 
FROM jobs 
ORDER BY created_at DESC 
LIMIT 5;
```

If scores are in DB but not in UI → Frontend issue (clear cache)
If scores are NOT in DB → Lighthouse service issue (check logs)

---

## Success Indicators

✅ **Lighthouse service terminal shows**:
```
[LIGHTHOUSE] Audit complete for Job abc123. Scores: {
  mainPerformanceScore: 87,
  mainAccessibilityScore: 95,
  mainBestPracticesScore: 92,
  mainSeoScore: 100
}
[API] Updated scores for main job abc123
```

✅ **UI displays**:
```
Lighthouse Audit: https://example.com
┌──────────────┬──────────────┬───────────────┬─────┐
│ Performance  │ Accessibility│ Best Practices│ SEO │
│     87       │      95      │      92       │ 100 │
└──────────────┴──────────────┴───────────────┴─────┘
```

---

## Contact & Support

If you're still experiencing issues:

1. Share logs from:
   - Lighthouse service terminal
   - Backend terminal
   - Browser console

2. Share job details:
   - Job ID
   - URL being tested
   - Job status

3. Check RabbitMQ management console for queue status

---

**TL;DR**: Run `cd lighthouse-service && npm start` and make sure you see it connect to RabbitMQ. That's the most likely fix! 🚀

