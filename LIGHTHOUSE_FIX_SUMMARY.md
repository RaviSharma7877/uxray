# Lighthouse Data Not Showing - QUICK FIX

## 🎯 **Problem**
Lighthouse scores (Performance, Accessibility, Best Practices, SEO) are not displaying in the UI.

---

## ✅ **Solution**

The **Lighthouse Service** is probably not running. Start it with:

```bash
cd lighthouse-service
npm install   # First time only
npm start
```

You should see:
```
[AMQP] Lighthouse service connecting to RabbitMQ...
[AMQP] Waiting for audit requests in queue: lighthouse-audits-queue
```

---

## 🔍 **Check All Services**

Run this to see what's running:

```bash
./check-services.sh
```

---

## 🚀 **Start All Services At Once**

```bash
./start-all-services.sh
```

This opens all services in separate Terminal windows.

---

## 📋 **Required Services for Lighthouse Scores**

For Lighthouse scores to appear, you need these running:

1. ✅ **RabbitMQ** (port 5672)
   ```bash
   brew services start rabbitmq
   ```

2. ✅ **Backend** (port 8080)
   ```bash
   cd backend && ./mvnw spring-boot:run
   ```

3. ✅ **Lighthouse Service** ⭐ **MOST IMPORTANT**
   ```bash
   cd lighthouse-service && npm start
   ```

4. ✅ **Crawler Service** (port 8081)
   ```bash
   cd crawler && npm start
   ```

5. ✅ **Frontend** (port 3000)
   ```bash
   cd frontend && npm run dev
   ```

---

## 🧪 **Test It**

1. **Start Lighthouse service** (see above)

2. **Create a new job** at http://localhost:3000
   - Enter URL: `https://example.com`
   - Click "Start URL Analysis"

3. **Watch the Lighthouse terminal** - you should see:
   ```
   [LIGHTHOUSE] Starting audit for https://example.com
   [LIGHTHOUSE] Audit complete. Scores: { mainPerformanceScore: 87, ... }
   [API] Updated scores for main job <jobId>
   ```

4. **Check the UI** - scores should appear:
   ```
   ┌──────────────┬──────────────┬───────────────┬─────┐
   │ Performance  │ Accessibility│ Best Practices│ SEO │
   │     87       │      95      │      92       │ 100 │
   └──────────────┴──────────────┴───────────────┴─────┘
   ```

---

## 🐛 **Still Not Working?**

See detailed troubleshooting: **`LIGHTHOUSE_TROUBLESHOOTING.md`**

Common issues:
- RabbitMQ not running → `brew services start rabbitmq`
- Chrome not found → `npx @puppeteer/browsers install chrome@stable`
- Port conflicts → Check `./check-services.sh`

---

## 📊 **Quick Architecture**

```
Frontend → Backend → RabbitMQ → Lighthouse Service
                         ↓
                   lighthouse-audits-queue
                         ↓
                   Lighthouse runs audit
                         ↓
                   PATCH /api/jobs/me/{jobId}/scores
                         ↓
                   Backend saves scores
                         ↓
                   Frontend polls and displays
```

**If Lighthouse Service isn't running, the chain breaks at step 3!**

---

## ⚡ **TL;DR**

```bash
# 1. Check what's running
./check-services.sh

# 2. If Lighthouse Service is NOT running:
cd lighthouse-service
npm start

# 3. Test with a new job
# Open http://localhost:3000 and submit a URL

# 4. Scores should appear in ~30-60 seconds
```

---

**That's it! The Lighthouse service was missing. Once you start it, scores will appear.** 🎉

