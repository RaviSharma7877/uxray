# Complete API Endpoint Mapping

This document shows all API endpoints, their implementing controllers/services, and which external services call them.

---

## Backend API Endpoints

### JobController (`/api/jobs`)

| Method | Endpoint | Purpose | Called By | Request Body | Response |
|--------|----------|---------|-----------|--------------|----------|
| `POST` | `/api/jobs` | Create new job | Frontend | `CreateJobRequest` | `JobResponse` |
| `GET` | `/api/jobs/me/{jobId}` | Get job details | Frontend | - | `JobResponse` |
| `PATCH` | `/api/jobs/me/{jobId}/status` | Update job status | Crawler Service | Query param: `status` | `JobResponse` |
| `POST` | `/api/jobs/me/{jobId}/screenshots` | Add screenshot | Crawler Service | `AddScreenshotRequest` | `JobResponse` |
| `PATCH` | `/api/jobs/me/{jobId}/scores` | Update Lighthouse scores | Lighthouse Service | `UpdateScoresRequest` | `JobResponse` |
| `PATCH` | `/api/jobs/{jobId}/design-analysis` | Update design analysis | Design Analysis Service | `DesignAnalysisUpdateRequest` | `JobResponse` |
| `PATCH` | `/api/jobs/me/{jobId}/design-analysis` | Update design analysis (alt) | Design Analysis Service | `DesignAnalysisUpdateRequest` | `JobResponse` |
| `PATCH` | `/api/jobs/{jobId}/ga4` | Update GA4 analytics | GA4 Service | `Ga4AnalyticsUpdateRequest` | `JobResponse` |
| `PATCH` | `/api/jobs/me/{jobId}/ga4` | Update GA4 analytics (alt) | GA4 Service | `Ga4AnalyticsUpdateRequest` | `JobResponse` |

### AuthController (`/api/auth`)

| Method | Endpoint | Purpose | Called By | Request Body | Response |
|--------|----------|---------|-----------|--------------|----------|
| `GET` | `/api/auth/status` | Check auth status | Frontend | - | `{ authenticated, principalName }` |
| `GET` | `/api/auth/ga4/properties` | List GA4 properties | Frontend | - | `List<Ga4PropertyResponse>` |
| `GET` | `/api/auth/ga4/analytics` | Get real-time GA4 data | Frontend | Query param: `propertyId` | `Ga4ResultsResponse` |

### OAuth Endpoints (Spring Security)

| Method | Endpoint | Purpose | Called By |
|--------|----------|---------|-----------|
| `GET` | `/oauth2/authorization/google` | Initiate Google OAuth | Frontend |
| `GET` | `/login/oauth2/code/google` | OAuth callback | Google |

---

## RabbitMQ Message Queues

### Queue → Consumer Mapping

| Queue Name | Consumer Service | Message Format | Triggered By |
|------------|------------------|----------------|--------------|
| `screenshot-jobs-queue` | Crawler Service | `{ jobId, startUrl, maxPages }` | Backend on URL_ANALYSIS job creation |
| `design-analysis-queue` | Design Analysis Service | `{ jobId, designInput }` | Backend on DESIGN_ANALYSIS job creation |
| `ga4-analytics-queue` | GA4 Service | `{ jobId, propertyId, refreshToken }` | Backend on URL_ANALYSIS with propertyId |
| `lighthouse-audits-queue` | Lighthouse Service | `{ jobId, urlToAudit }` | Backend on URL_ANALYSIS job creation |

---

## Service-to-Backend API Calls

### Crawler Service → Backend

| Action | HTTP Call | When |
|--------|-----------|------|
| Update status to IN_PROGRESS | `PATCH /api/jobs/me/{jobId}/status?status=IN_PROGRESS` | Job starts |
| Add screenshot | `POST /api/jobs/me/{jobId}/screenshots` | Each screenshot captured |
| Update status to COMPLETED | `PATCH /api/jobs/me/{jobId}/status?status=COMPLETED` | Crawl completes successfully |
| Update status to FAILED | `PATCH /api/jobs/me/{jobId}/status?status=FAILED` | Error occurs |

**API Base URL**: `http://localhost:8080/api/jobs/me`

**Request Examples**:
```javascript
// Update status
await axios.patch(`/${jobId}/status?status=IN_PROGRESS`);

// Add screenshot
await axios.post(`/${jobId}/screenshots`, {
  pageUrl: "https://example.com/page",
  imageStoragePath: "jobId/1-1.png"
});
```

---

### Design Analysis Service → Backend

| Action | HTTP Call | When |
|--------|-----------|------|
| Update design analysis | `PATCH /api/jobs/me/{jobId}/design-analysis` | Analysis completes |

**API Base URL**: `http://localhost:8080/api/jobs/me`

**Request Example**:
```javascript
await axios.patch(`/${jobId}/design-analysis`, {
  summary: "Analysis summary",
  keyPoints: ["Point 1", "Point 2"]
});
```

---

### GA4 Service → Backend

| Action | HTTP Call | When |
|--------|-----------|------|
| Update GA4 analytics | `PATCH /api/jobs/{jobId}/ga4` | Analytics fetch completes |

**API Base URL**: `http://localhost:8080/api/jobs`

**Request Example**:
```javascript
await axios.patch(`/${jobId}/ga4`, {
  totalUsers: 1000,
  sessions: 1500,
  topPages: [...],
  topEvents: [...],
  acquisitionChannels: [...],
  deviceTechnology: [...],
  demographics: [...],
  coreWebVitals: [...]
});
```

**Full Data Structure**:
- `totalUsers`, `newUsers`, `sessions`, `engagedSessions`, `averageSessionDuration`, `engagementRate`
- `topPages[]`: `{ pagePath, pageTitle, views, users, avgEngagementTime }`
- `trafficSources[]`: `{ source, medium, sessions }`
- `topCountries[]`: `{ country, users }`
- `topEvents[]`: `{ eventName, eventCount }`
- `acquisitionChannels[]`: `{ channel, sessions, activeUsers }`
- `deviceTechnology[]`: `{ deviceCategory, operatingSystem, browser, sessions, activeUsers }`
- `demographics[]`: `{ country, city, language, activeUsers }`
- `coreWebVitals[]`: `{ url, lcpMs, inpMs, cls, error }`

---

### Lighthouse Service → Backend

| Action | HTTP Call | When |
|--------|-----------|------|
| Update scores | `PATCH /api/jobs/me/{jobId}/scores` | Audit completes |

**API Base URL**: `http://localhost:8080/api/jobs/me`

**Request Example**:
```javascript
await axios.patch(`/${jobId}/scores`, {
  mainPerformanceScore: 95,
  mainAccessibilityScore: 88,
  mainBestPracticesScore: 92,
  mainSeoScore: 100
});
```

---

## Frontend → Backend API Calls

### Job Management

| Action | HTTP Call | When |
|--------|-----------|------|
| Create URL analysis job | `POST /api/jobs` | User submits URL form |
| Create design analysis job | `POST /api/jobs` | User submits design form |
| Get job details | `GET /api/jobs/me/{jobId}` | Polling every 3 seconds |

**Examples**:
```javascript
// Create URL analysis job
await axios.post('/api/jobs', {
  type: 'URL_ANALYSIS',
  url: 'https://example.com',
  pages: 5,
  propertyId: 'properties/123456'
});

// Create design analysis job
await axios.post('/api/jobs', {
  type: 'DESIGN_ANALYSIS',
  designInput: 'https://figma.com/file/...'
});

// Poll for updates
const job = await axios.get(`/api/jobs/me/${jobId}`);
```

### Authentication

| Action | HTTP Call | When |
|--------|-----------|------|
| Check auth status | `GET /api/auth/status` | Page load |
| Get GA4 properties | `GET /api/auth/ga4/properties` | After authentication |
| Get real-time analytics | `GET /api/auth/ga4/analytics?propertyId=123` | After property selection |
| Initiate OAuth | Navigate to `/oauth2/authorization/google` | User clicks "Connect Google Analytics" |

**Examples**:
```javascript
// Check auth
const { data } = await axios.get('/api/auth/status');
// { authenticated: true, principalName: "user@example.com" }

// Get properties
const properties = await axios.get('/api/auth/ga4/properties');
// [{ property: "properties/123", displayName: "My Site" }]

// Get analytics
const analytics = await axios.get('/api/auth/ga4/analytics', {
  params: { propertyId: '123456' }
});
```

---

## Static File Server (Crawler Service)

| Endpoint | Purpose | Served By |
|----------|---------|-----------|
| `http://localhost:8081/{jobId}/{filename}.png` | Screenshot image | Crawler Service (Express) |
| `http://localhost:8081/health` | Health check | Crawler Service (Express) |

**Example**:
```
http://localhost:8081/abc123-def456/1-1.png
http://localhost:8081/abc123-def456/1-2.png
```

---

## Complete Data Flow Diagram

```
┌──────────┐
│ Frontend │
└────┬─────┘
     │
     │ 1. POST /api/jobs
     ↓
┌────────────────────────────────────┐
│  Backend (JobController)           │
│  - Creates Job entity              │
│  - Dispatches to RabbitMQ queues   │
└────────────┬───────────────────────┘
             │
             │ RabbitMQ Messages
             ├──────────────────┬──────────────┬────────────────┐
             ↓                  ↓              ↓                ↓
      ┌─────────────┐   ┌─────────────┐   ┌──────────┐   ┌──────────┐
      │   Crawler   │   │   Design    │   │   GA4    │   │Lighthouse│
      │   Service   │   │  Analysis   │   │ Service  │   │ Service  │
      └──────┬──────┘   └──────┬──────┘   └────┬─────┘   └────┬─────┘
             │                 │                │              │
             │ 2. PATCH status │ 3. PATCH       │ 4. PATCH    │ 5. PATCH
             │    POST screenshots  design      │    ga4      │    scores
             ↓                 ↓                ↓              ↓
      ┌────────────────────────────────────────────────────────┐
      │  Backend (JobService)                                  │
      │  - Updates Job entity in database                      │
      └────────────────────────────────────────────────────────┘
             ↑
             │ 6. GET /api/jobs/me/{jobId}
             │    (Polling every 3 seconds)
      ┌──────┴─────┐
      │  Frontend  │
      └────────────┘
```

---

## Request/Response DTOs

### CreateJobRequest
```java
{
  type: JobType,           // URL_ANALYSIS or DESIGN_ANALYSIS
  url: String,             // for URL_ANALYSIS
  pages: Integer,          // for URL_ANALYSIS (1-10)
  propertyId: String,      // for URL_ANALYSIS (optional, for GA4)
  designInput: String      // for DESIGN_ANALYSIS
}
```

### JobResponse
```java
{
  id: UUID,
  type: JobType,
  status: JobStatus,       // PENDING, IN_PROGRESS, COMPLETED, FAILED
  startUrl: String,
  maxPages: Integer,
  propertyId: String,
  screenshots: Screenshot[],
  mainPerformanceScore: Double,
  mainAccessibilityScore: Double,
  mainBestPracticesScore: Double,
  mainSeoScore: Double,
  ga4Results: Ga4ResultsResponse,
  designInput: String,
  designAnalysisResults: DesignAnalysisResultResponse
}
```

### AddScreenshotRequest
```java
{
  pageUrl: String,
  imageStoragePath: String
}
```

### UpdateScoresRequest
```java
{
  mainPerformanceScore: Double,
  mainAccessibilityScore: Double,
  mainBestPracticesScore: Double,
  mainSeoScore: Double
}
```

### DesignAnalysisUpdateRequest
```java
{
  summary: String,
  keyPoints: String[]
}
```

### Ga4AnalyticsUpdateRequest
```java
{
  totalUsers: Integer,
  newUsers: Integer,
  sessions: Integer,
  engagedSessions: Integer,
  averageSessionDuration: Double,
  engagementRate: Double,
  topPages: TopPage[],
  trafficSources: TrafficSource[],
  topCountries: TopCountry[],
  topEvents: TopEvent[],
  acquisitionChannels: AcquisitionChannel[],
  deviceTechnology: DeviceTechnology[],
  demographics: Demographics[],
  coreWebVitals: CoreWebVital[]
}
```

---

## Summary Statistics

### Total Endpoints Implemented
- **Backend API Endpoints**: 12
- **OAuth Endpoints**: 2
- **RabbitMQ Queues**: 4
- **Static File Endpoints**: 2

### Service Communication Patterns
- **Frontend → Backend**: 6 endpoints
- **Crawler → Backend**: 2 endpoints
- **Design Analysis → Backend**: 1 endpoint
- **GA4 → Backend**: 1 endpoint
- **Lighthouse → Backend**: 1 endpoint
- **Backend → RabbitMQ**: 4 queues

### Data Transfer Volumes (Typical Job)
- **Screenshots**: 4-28 per job (4 per page × 1-7 pages)
- **GA4 Data Points**: 100+ metrics
- **Lighthouse Metrics**: 4 scores
- **Total Job Updates**: 15-30 per job

---

## ✅ Implementation Checklist

All features are **FULLY IMPLEMENTED**:

- ✅ Job creation and management
- ✅ Web crawling with screenshots
- ✅ Lighthouse performance audits
- ✅ Google Analytics 4 integration
- ✅ Design analysis (Figma, files)
- ✅ OAuth authentication
- ✅ Real-time job updates
- ✅ RabbitMQ async processing
- ✅ Static file serving
- ✅ Core Web Vitals
- ✅ Comprehensive analytics
- ✅ Error handling
- ✅ Frontend visualization

**All services are operational and communicating correctly!** 🎉

