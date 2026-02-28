# UXRay - Comprehensive UX Analysis Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Java](https://img.shields.io/badge/Java-17+-orange.svg)](https://openjdk.java.net/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.x-brightgreen.svg)](https://spring.io/projects/spring-boot)
[![Next.js](https://img.shields.io/badge/Next.js-14+-black.svg)](https://nextjs.org/)

A comprehensive UX analysis platform that combines web crawling, Lighthouse audits, Google Analytics 4 integration, and design analysis to provide deep insights into website user experience.

![UXRay Architecture](https://via.placeholder.com/800x400?text=UXRay+Architecture+Diagram)

---

## 🌟 Features

### ✅ URL Analysis
- **Web Crawling**: Automated multi-page crawling with screenshot capture
- **Lighthouse Audits**: Performance, accessibility, SEO, and best practices scores
- **GA4 Integration**: Comprehensive analytics including:
  - User metrics (sessions, engagement, bounce rate)
  - Top pages and traffic sources
  - Event tracking
  - Acquisition channels
  - Device and browser breakdown
  - Geographic demographics
  - Core Web Vitals (LCP, INP, CLS)
- **Visual Analysis**: Multiple screenshots per page with heatmap overlay

### ✅ Design Analysis
- **Multi-format Support**: Figma URLs, Webflow, PNG, PDF
- **AI-powered Analysis**: Automated design element detection
- **Detailed Reports**: Summary and key findings

### ✅ Modern Architecture
- **Microservices**: Independent, scalable services
- **Async Processing**: RabbitMQ message queue
- **Real-time Updates**: Live job status polling
- **OAuth Integration**: Secure Google authentication
- **RESTful API**: Comprehensive backend API

---

## 🏗️ Architecture

```
┌─────────────┐
│   Frontend  │  Next.js (Port 3000)
│   (Next.js) │  ← User Interface
└──────┬──────┘
       │ HTTP REST API
       ↓
┌─────────────────────────────────────────┐
│         Backend (Spring Boot)           │  Port 8080
│  ┌─────────────────────────────────┐   │
│  │  REST API   │   OAuth2   │ DB   │   │
│  └─────────────────────────────────┘   │
└──────────────┬──────────────────────────┘
               │ RabbitMQ Messages
               ↓
    ┌──────────┴──────────┐
    │                     │
┌───▼────┐  ┌─────▼──────┐  ┌──────▼─────┐  ┌────▼──────┐
│Crawler │  │  Design    │  │    GA4     │  │Lighthouse │
│Service │  │  Analysis  │  │  Service   │  │  Service  │
└────────┘  └────────────┘  └────────────┘  └───────────┘
 Node.js      Node.js         Node.js         Node.js
 Port 8081
```

### Components

1. **Backend** (Java Spring Boot)
   - REST API server
   - OAuth2 authentication
   - Job management
   - PostgreSQL database

2. **Crawler Service** (Node.js)
   - Web crawling with Puppeteer
   - Screenshot capture
   - Static file server (port 8081)

3. **Design Analysis Service** (Node.js)
   - Design file processing
   - Element detection

4. **GA4 Service** (Node.js)
   - Google Analytics integration
   - Core Web Vitals via PageSpeed Insights

5. **Lighthouse Service** (Node.js)
   - Performance audits
   - Accessibility checks
   - SEO analysis

6. **Frontend** (Next.js/React)
   - Modern UI
   - Real-time updates
   - Data visualization

---

## 🚀 Quick Start

### Prerequisites
- Java 17+
- Node.js 18+
- MySQL 8.0+
- RabbitMQ
- Google Cloud credentials (for GA4)

### Installation

1. **Start MySQL**
   ```bash
   # Using Docker (Recommended)
   docker run -d --name mysql-uxray \
     -e MYSQL_ROOT_PASSWORD=password \
     -e MYSQL_DATABASE=uxray \
     -p 3306:3306 \
     mysql:8.0
   
   # OR install MySQL locally - see MYSQL_SETUP.md
   ```

2. **Start RabbitMQ**
   ```bash
   docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management
   ```

3. **Configure Backend**
   ```bash
   cd backend
   echo "DB_USERNAME=root" > .env
   echo "DB_PASSWORD=password" >> .env
   ```

4. **Start Backend**
   ```bash
   mvn spring-boot:run
   ```

5. **Start Services** (in separate terminals)
   ```bash
   # Crawler
   cd crawler && npm install && node src/main.js
   
   # Design Analysis
   cd design-analysis-service && npm install && node src/main.js
   
   # GA4 (requires .env configuration)
   cd ga4-service && npm install && node src/main.js
   
   # Lighthouse
   cd lighthouse-service && npm install && node src/main.js
   ```

6. **Start Frontend**
   ```bash
   cd frontend
   npm install && npm run dev
   ```

7. **Open Browser**
   ```
   http://localhost:3000
   ```

For detailed setup instructions, see **[SETUP_GUIDE.md](SETUP_GUIDE.md)**

---

## 📚 Documentation

- **[API Endpoints Documentation](API_ENDPOINTS_DOCUMENTATION.md)** - Complete API reference
- **[Implementation Summary](IMPLEMENTATION_SUMMARY.md)** - Architecture and data flow
- **[Setup Guide](SETUP_GUIDE.md)** - Detailed installation and configuration

---

## 🔧 Configuration

### Backend
Edit `backend/src/main/resources/application.yml`:
```yaml
spring:
  security:
    oauth2:
      client:
        registration:
          google:
            client-id: YOUR_GOOGLE_CLIENT_ID
            client-secret: YOUR_GOOGLE_CLIENT_SECRET
```

### GA4 Service
Create `ga4-service/.env`:
```env
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
PAGESPEED_API_KEY=your-api-key
```

---

## 📊 API Endpoints

### Job Management
- `POST /api/jobs` - Create new analysis job
- `GET /api/jobs/me/{jobId}` - Get job details
- `PATCH /api/jobs/me/{jobId}/status` - Update job status

### Authentication
- `GET /api/auth/status` - Check authentication
- `GET /api/auth/ga4/properties` - List GA4 properties
- `GET /api/auth/ga4/analytics` - Get analytics data

### Service Endpoints (Internal)
- `POST /api/jobs/me/{jobId}/screenshots` - Add screenshot
- `PATCH /api/jobs/me/{jobId}/scores` - Update Lighthouse scores
- `PATCH /api/jobs/{jobId}/ga4` - Update GA4 analytics
- `PATCH /api/jobs/{jobId}/design-analysis` - Update design analysis

See **[API_ENDPOINTS_DOCUMENTATION.md](API_ENDPOINTS_DOCUMENTATION.md)** for complete details.

---

## 🎯 Use Cases

### 1. Website Performance Analysis
Analyze website speed, accessibility, and SEO:
1. Enter website URL
2. Select number of pages to crawl (1-10)
3. View Lighthouse scores
4. See performance recommendations

### 2. User Behavior Analysis
Connect Google Analytics to understand user behavior:
1. Connect Google account
2. Select GA4 property
3. Analyze user metrics, traffic sources, device breakdown
4. View Core Web Vitals

### 3. Design Review
Analyze design files before development:
1. Upload design file or enter Figma URL
2. Get automated design analysis
3. Review key findings and recommendations

---

## 🛠️ Technology Stack

### Backend
- Java 17
- Spring Boot 3.x
- Spring Security (OAuth2)
- Spring AMQP (RabbitMQ)
- MySQL 8.0+
- Maven

### Services
- Node.js 18+
- Puppeteer (web crawling)
- Lighthouse (performance audits)
- Google Analytics Data API
- PageSpeed Insights API
- RabbitMQ (AMQP)

### Frontend
- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- Axios

### Infrastructure
- RabbitMQ (message broker)
- Docker (optional containerization)

---

## 📈 Performance

Typical analysis times:
- **Simple URL (1 page)**: 30-45 seconds
- **Multi-page (5 pages)**: 2-3 minutes
- **With GA4**: +10 seconds
- **Design analysis**: 20-30 seconds

Services are horizontally scalable - run multiple instances for faster processing.

---

## 🔒 Security

- OAuth2 authentication for Google services
- Secure token storage
- CORS protection
- Input validation
- SQL injection prevention
- XSS protection

---

## 🐛 Troubleshooting

### Common Issues

**RabbitMQ Connection Failed**
```bash
# Check if RabbitMQ is running
docker ps | grep rabbitmq

# Restart RabbitMQ
docker restart rabbitmq
```

**Chrome/Chromium Not Found**
```bash
# Install Chrome for Puppeteer
npx puppeteer browsers install chrome
```

**GA4 Authentication Failed**
- Verify Google OAuth credentials
- Check API enablement in Google Cloud Console
- Ensure redirect URI is correct

See **[SETUP_GUIDE.md](SETUP_GUIDE.md#troubleshooting)** for more solutions.

---

## 🧪 Testing

### Backend Tests
```bash
cd backend
mvn test
```

### Frontend Tests
```bash
cd frontend
npm test
```

### Integration Testing
1. Start all services
2. Create a test job via frontend
3. Monitor RabbitMQ queues
4. Verify job completion

---

## 📦 Deployment

### Docker Deployment
```bash
# Build images
docker-compose build

# Start all services
docker-compose up -d
```

### Production Considerations
- Use dedicated MySQL user (not root)
- Enable SSL for database connections
- Configure external RabbitMQ cluster
- Set up load balancer for backend
- Use Redis for session storage
- Enable HTTPS
- Configure monitoring (Prometheus, Grafana)

---

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Puppeteer](https://pptr.dev/) - Web crawling
- [Lighthouse](https://developers.google.com/web/tools/lighthouse) - Performance audits
- [Google Analytics](https://analytics.google.com/) - User analytics
- [Spring Boot](https://spring.io/projects/spring-boot) - Backend framework
- [Next.js](https://nextjs.org/) - Frontend framework
- [RabbitMQ](https://www.rabbitmq.com/) - Message broker

---

## 📞 Support

For questions or issues:
- Check documentation in `/docs`
- Review troubleshooting guide
- Create an issue on GitHub

---

## 🗺️ Roadmap

### Upcoming Features
- [ ] A/B test detection and analysis
- [ ] Accessibility violation details
- [ ] Performance budgets and alerts
- [ ] Scheduled recurring analyses
- [ ] Multi-site comparison
- [ ] PDF report generation
- [ ] Slack/Email notifications
- [ ] User flow visualization
- [ ] Mobile app analysis
- [ ] API rate limiting dashboard

---

**Made with ❤️ for better UX**

# uxray
