# UXRay API Endpoints & Data Flow Documentation

## System Architecture Overview

The UXRay platform consists of:
- **Backend** (Java Spring Boot) - Port 8080
- **Frontend** (Next.js) - Port 3000
- **Crawler Service** (Node.js) - Port 8081 (static image server)
- **Design Analysis Service** (Node.js)
- **GA4 Service** (Node.js)
- **Lighthouse Service** (Node.js)
- **RabbitMQ** - Message broker for async job processing

---

## Backend API Endpoints

### Job Controller (`/api/jobs`)

#### 1. Create Job
- **Endpoint**: `POST /api/jobs`
- **Description**: Creates a new analysis job (URL or Design)
- **Request Body**:
  ```json
  {
    "type": "URL_ANALYSIS" | "DESIGN_ANALYSIS",
    "url": "https://example.com",        // for URL_ANALYSIS
    "pages": 5,                           // for URL_ANALYSIS
    "propertyId": "properties/123456",    // optional, for GA4
    "designInput": "https://figma.com..." // for DESIGN_ANALYSIS
  }
  ```
- **Response**: Job object with ID, status, etc.
- **Used by**: Frontend

#### 2. Get Job Details
- **Endpoint**: `GET /api/jobs/me/{jobId}`
- **Description**: Retrieves job details and results
- **Response**: Complete job object with screenshots, scores, analytics
- **Used by**: Frontend (polling for updates)

#### 3. Update Job Status
- **Endpoint**: `PATCH /api/jobs/me/{jobId}/status?status={STATUS}`
- **Description**: Updates job status (PENDING, IN_PROGRESS, COMPLETED, FAILED)
- **Used by**: Crawler Service

#### 4. Add Screenshot
- **Endpoint**: `POST /api/jobs/me/{jobId}/screenshots`
- **Description**: Adds a screenshot to the job
- **Request Body**:
  ```json
  {
    "pageUrl": "https://example.com/page",
    "imageStoragePath": "jobId/1-1.png"
  }
  ```
- **Used by**: Crawler Service

#### 5. Update Lighthouse Scores
- **Endpoint**: `PATCH /api/jobs/me/{jobId}/scores`
- **Description**: Updates Lighthouse audit scores
- **Request Body**:
  ```json
  {
    "mainPerformanceScore": 95,
    "mainAccessibilityScore": 88,
    "mainBestPracticesScore": 92,
    "mainSeoScore": 100
  }
  ```
- **Used by**: Lighthouse Service

#### 6. Update Design Analysis
- **Endpoint**: `PATCH /api/jobs/{jobId}/design-analysis` (also accepts `/me/{jobId}/design-analysis`)
- **Description**: Updates design analysis results
- **Request Body**:
  ```json
  {
    "summary": "Analysis summary text",
    "keyPoints": ["Point 1", "Point 2", ...]
  }
  ```
- **Used by**: Design Analysis Service

#### 7. Update GA4 Analytics
- **Endpoint**: `PATCH /api/jobs/{jobId}/ga4` (also accepts `/me/{jobId}/ga4`)
- **Description**: Updates Google Analytics 4 data with comprehensive metrics
- **Request Body**:
  ```json
  {
    "totalUsers": 1000,
    "newUsers": 500,
    "sessions": 1500,
    "engagedSessions": 1200,
    "averageSessionDuration": 180.5,
    "engagementRate": 0.8,
    "topPages": [
      {
        "pagePath": "/home",
        "pageTitle": "Home Page",
        "views": 500,
        "users": 300,
        "avgEngagementTime": 120.5
      }
    ],
    "trafficSources": [
      {
        "source": "google",
        "medium": "organic",
        "sessions": 800
      }
    ],
    "topCountries": [
      {
        "country": "United States",
        "users": 600
      }
    ],
    "topEvents": [
      {
        "eventName": "button_click",
        "eventCount": 1250
      }
    ],
    "acquisitionChannels": [
      {
        "channel": "Organic Search",
        "sessions": 800,
        "activeUsers": 650
      }
    ],
    "deviceTechnology": [
      {
        "deviceCategory": "desktop",
        "operatingSystem": "Windows",
        "browser": "Chrome",
        "sessions": 1000,
        "activeUsers": 800
      }
    ],
    "demographics": [
      {
        "country": "United States",
        "city": "New York",
        "language": "en-us",
        "activeUsers": 450
      }
    ],
    "coreWebVitals": [
      {
        "url": "https://example.com",
        "lcpMs": 2500.0,
        "inpMs": 100.0,
        "cls": 0.1,
        "error": null
      }
    ]
  }
  ```
- **Used by**: GA4 Service

### Auth Controller (`/api/auth`)

#### 1. Check Auth Status
- **Endpoint**: `GET /api/auth/status`
- **Description**: Checks if user is authenticated with Google OAuth
- **Response**:
  ```json
  {
    "authenticated": true,
    "principalName": "user@example.com"
  }
  ```
- **Used by**: Frontend

#### 2. Get GA4 Properties
- **Endpoint**: `GET /api/auth/ga4/properties`
- **Description**: Lists all GA4 properties user has access to
- **Response**:
  ```json
  [
    {
      "property": "properties/123456789",
      "displayName": "My Website"
    }
  ]
  ```
- **Used by**: Frontend

#### 3. Get GA4 Analytics (Direct)
- **Endpoint**: `GET /api/auth/ga4/analytics?propertyId={propertyId}`
- **Description**: Fetches real-time GA4 analytics (not from job)
- **Response**: Same structure as Update GA4 Analytics
- **Used by**: Frontend (immediate analytics display)

---

## Service Communication Flow

### 1. Crawler Service

**Queue**: `screenshot-jobs-queue`

**Input Message**:
```json
{
  "jobId": "uuid",
  "startUrl": "https://example.com",
  "maxPages": 5
}
```

**Actions**:
1. Updates status to `IN_PROGRESS`: `PATCH /api/jobs/me/{jobId}/status`
2. Crawls pages and captures screenshots
3. For each screenshot: `POST /api/jobs/me/{jobId}/screenshots`
4. Updates status to `COMPLETED` or `FAILED`

**Static Server**: Serves screenshots at `http://localhost:8081/{jobId}/{page}-{num}.png`

### 2. Design Analysis Service

**Queue**: `design-analysis-queue`

**Input Message**:
```json
{
  "jobId": "uuid",
  "designInput": "https://figma.com/file/..."
}
```

**Actions**:
1. Processes design file (Figma URL, Webflow, or uploaded file)
2. Analyzes design elements
3. Updates analysis: `PATCH /api/jobs/me/{jobId}/design-analysis`

### 3. GA4 Service

**Queue**: `ga4-analytics-queue`

**Input Message**:
```json
{
  "jobId": "uuid",
  "propertyId": "123456789",
  "refreshToken": "..."
}
```

**Actions**:
1. Authenticates with Google OAuth using refresh token
2. Fetches analytics data from GA4 API
3. Fetches Core Web Vitals from PageSpeed Insights API
4. Updates job: `PATCH /api/jobs/{jobId}/ga4`

**Data Collected**:
- **User Metrics**: totalUsers, newUsers, sessions, engagedSessions, averageSessionDuration, engagementRate
- **Top Pages**: pagePath, pageTitle, views, users, avgEngagementTime
- **Top Events**: eventName, eventCount (e.g., button_click, form_submit)
- **Traffic Sources**: source, medium, sessions
- **Top Countries**: country, users
- **Acquisition Channels**: channel (e.g., Organic Search, Direct), sessions, activeUsers
- **Device Technology**: deviceCategory (desktop/mobile/tablet), operatingSystem, browser, sessions, activeUsers
- **Demographics**: country, city, language, activeUsers
- **Core Web Vitals** (from PageSpeed Insights):
  - LCP (Largest Contentful Paint) in milliseconds
  - INP (Interaction to Next Paint) in milliseconds
  - CLS (Cumulative Layout Shift) score
  - Error message if fetch failed

### 4. Lighthouse Service

**Queue**: `lighthouse-audits-queue`

**Input Message**:
```json
{
  "jobId": "uuid",
  "urlToAudit": "https://example.com"
}
```

**Actions**:
1. Launches Chrome in headless mode
2. Runs Lighthouse audit
3. Extracts scores for performance, accessibility, best practices, SEO
4. Updates job: `PATCH /api/jobs/me/{jobId}/scores`

---

## Frontend Integration

### Job Creation Flow

1. User selects URL Analysis or Design Analysis
2. Frontend calls `POST /api/jobs` with job details
3. Backend creates job and dispatches to RabbitMQ queues
4. Frontend starts polling `GET /api/jobs/me/{jobId}` every 3 seconds
5. Services process and update the job via their respective endpoints
6. Frontend displays results as they arrive

### GA4 Integration Flow

1. User clicks "Connect Google Analytics"
2. Redirected to `http://localhost:8080/oauth2/authorization/google`
3. After OAuth, user selects GA4 property from dropdown
4. When creating URL analysis job, propertyId is included
5. Backend dispatches to GA4 service queue with refresh token
6. Frontend can also fetch real-time analytics via `/api/auth/ga4/analytics`

---

## RabbitMQ Queues

| Queue Name | Listens | Dispatches |
|-----------|---------|------------|
| `screenshot-jobs-queue` | Crawler Service | Backend (on URL_ANALYSIS job) |
| `lighthouse-audits-queue` | Lighthouse Service | Backend (on URL_ANALYSIS job) |
| `ga4-analytics-queue` | GA4 Service | Backend (on URL_ANALYSIS with propertyId) |
| `design-analysis-queue` | Design Analysis Service | Backend (on DESIGN_ANALYSIS job) |

---

## Data Models

### Job Status Flow
```
PENDING → IN_PROGRESS → COMPLETED
                      ↘ FAILED
```

### Job Types
- `URL_ANALYSIS`: Crawls website, runs Lighthouse, fetches GA4 data
- `DESIGN_ANALYSIS`: Analyzes design files (Figma, Webflow, uploaded files)

---

## Environment Configuration

### Crawler Service
- RabbitMQ: `amqp://guest:guest@localhost:5672`
- Backend API: `http://localhost:8080/api/jobs/me`
- Screenshot Dir: `./screenshots`
- Static Server: Port 8081

### Design Analysis Service
- RabbitMQ: `amqp://guest:guest@localhost:5672`
- Backend API: `http://localhost:8080/api/jobs/me`

### GA4 Service
- RabbitMQ: `amqp://guest:guest@localhost:5672`
- Backend API: `http://localhost:8080/api/jobs`
- Requires: 
  - `GOOGLE_CLIENT_ID` - Google OAuth client ID
  - `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
  - `PAGESPEED_API_KEY` - Google PageSpeed Insights API key (for Core Web Vitals)
  - `PAGESPEED_URLS` - Comma-separated list of URLs to check (optional)
  - `SITE_BASE_URL` - Base URL for the site being analyzed (default: https://example.com)

### Lighthouse Service
- RabbitMQ: `amqp://guest:guest@localhost:5672`
- Backend API: `http://localhost:8080/api/jobs/me`

### Frontend
- Backend API: `http://localhost:8080`
- Screenshot Server: `http://localhost:8081`
- Polling Interval: 3000ms (3 seconds)

---

## Security Notes

- All job endpoints under `/api/jobs` require authentication
- OAuth2 integration with Google for GA4 access
- Refresh tokens securely stored and used by backend to dispatch GA4 jobs
- CORS configured to allow frontend access

---

## Status Indicators

### Job Status Colors (Frontend)
- `PENDING`: Yellow (bg-yellow-500)
- `IN_PROGRESS`: Blue with pulse animation (bg-blue-500 animate-pulse)
- `COMPLETED`: Green (bg-green-500)
- `FAILED`: Red (bg-red-500)

### Lighthouse Score Colors
- 90-100: Green (text-green-400)
- 50-89: Yellow (text-yellow-400)
- 0-49: Red (text-red-400)

