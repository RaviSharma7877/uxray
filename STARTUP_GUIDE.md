# UXRay - Startup Guide

## Prerequisites

1. **Java 17+**: Required for running the Spring Boot backend
2. **Node.js 18+**: Required for running the frontend and services
3. **MySQL 8.0+**: Database for persistent storage
4. **RabbitMQ**: Message queue for async job processing

## Quick Start

### 1. Start the Database

```bash
# Option A: Using the provided script
./start-database.sh

# Option B: Manually start MySQL
# Make sure MySQL is running on localhost:3306
# Database 'uxray' will be created automatically
```

### 2. Configure Environment Variables

Create a `.env` file in the `backend` directory (optional, defaults are set):

```bash
# Database Configuration
DB_USERNAME=root
DB_PASSWORD=Ravi@123

# Google OAuth (for GA4 integration)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

### 3. Start the Backend

```bash
cd backend
./mvnw spring-boot:run
```

The backend will:
- Start on `http://localhost:8080`
- Auto-create database tables using Hibernate
- Connect to MySQL and RabbitMQ

### 4. Start the Node.js Services

#### Crawler Service (Port 8081)
```bash
cd crawler
npm install
npm start
```

#### Lighthouse Service (Port 8082)
```bash
cd lighthouse-service
npm install
npm start
```

#### Design Analysis Service (Port 8083)
```bash
cd design-analysis-service
npm install
npm start
```

#### GA4 Service (Port 8084)
```bash
cd ga4-service
npm install
npm start
```

### 5. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend will start on `http://localhost:3000`

## Database Tables

The application will automatically create the following tables:

1. **users** - User accounts and OAuth tokens
2. **jobs** - Analysis jobs with all results embedded
3. **screenshots** - Screenshots captured during crawling

## API Endpoints

### User Management
- `POST /api/users` - Create user
- `GET /api/users/{id}` - Get user by ID
- `GET /api/users` - Get all users
- `PUT /api/users/{id}` - Update user
- `DELETE /api/users/{id}` - Delete user
- `GET /api/users/email/{email}` - Get user by email
- `GET /api/users/exists/{email}` - Check if email exists

### Job Management
- `POST /api/jobs` - Create new analysis job
- `GET /api/jobs/me/{jobId}` - Get job details
- `PATCH /api/jobs/me/{jobId}/status` - Update job status
- `POST /api/jobs/me/{jobId}/screenshots` - Add screenshot to job
- `PATCH /api/jobs/me/{jobId}/scores` - Update Lighthouse scores
- `PATCH /api/jobs/me/{jobId}/design-analysis` - Update design analysis results
- `PATCH /api/jobs/me/{jobId}/ga4-analytics` - Update GA4 analytics

### Authentication
- `GET /api/auth/status` - Check authentication status
- `GET /api/auth/login` - Initiate Google OAuth login
- `GET /api/auth/ga4/properties` - Get GA4 properties

## Testing the Setup

### Test User CRUD

```bash
# Create a user
curl -X POST http://localhost:8080/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "name": "Test User"
  }'

# Get all users
curl http://localhost:8080/api/users
```

### Test Job Creation

```bash
# Create a URL analysis job
curl -X POST http://localhost:8080/api/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "type": "URL_ANALYSIS",
    "url": "https://e2shub.com",
    "pages": 3
  }'

# Get job status (replace {jobId} with actual ID from response)
curl http://localhost:8080/api/jobs/me/{jobId}
```

### Verify Database

```bash
# Connect to MySQL
mysql -u root -p uxray

# Show tables
SHOW TABLES;

# View users
SELECT * FROM users;

# View jobs
SELECT id, type, status, start_url, created_at FROM jobs;

# View screenshots
SELECT id, page_url, job_id FROM screenshots;
```

## Troubleshooting

### Port Already in Use

If ports are already in use, you can change them:

**Backend (`application.yml`):**
```yaml
server:
  port: 8080  # Change to another port
```

**Frontend (`package.json`):**
```json
"scripts": {
  "dev": "next dev -p 3001"  // Change port to 3001
}
```

### Database Connection Issues

1. Verify MySQL is running: `mysql -u root -p`
2. Check credentials in `application.yml`
3. Ensure database exists: `CREATE DATABASE IF NOT EXISTS uxray;`

### RabbitMQ Connection Issues

1. Install RabbitMQ: `brew install rabbitmq` (macOS)
2. Start RabbitMQ: `brew services start rabbitmq`
3. Check status: `rabbitmqctl status`

### Java Issues

Ensure Java 17+ is installed:
```bash
java -version
# Should show version 17 or higher
```

If not installed, install via:
- macOS: `brew install openjdk@17`
- Ubuntu: `sudo apt install openjdk-17-jdk`

## Data Persistence

All data is now persisted in MySQL:

- **Jobs**: Analysis results, screenshots, scores, GA4 data
- **Users**: User accounts, OAuth tokens
- **Screenshots**: Image paths and metadata

Data will survive application restarts!

## Development Workflow

1. Make changes to backend code
2. Backend auto-reloads (Spring Boot DevTools)
3. Test via curl or frontend
4. Check database for persistence
5. View logs for debugging

## Production Deployment

For production deployment:

1. Set `spring.jpa.hibernate.ddl-auto=validate` in `application.yml`
2. Use Flyway migrations for schema changes
3. Set up database backups
4. Configure production database credentials
5. Enable SSL/TLS for database connections
6. Set up connection pooling
7. Configure proper logging levels

## Next Steps

1. ✅ Entities created and JPA configured
2. ✅ User CRUD operations available
3. ✅ Job persistence working
4. 🔄 Test end-to-end flow with frontend
5. 🔄 Add authentication integration
6. 🔄 Set up database migrations
7. 🔄 Add indexes for performance
8. 🔄 Implement pagination
9. 🔄 Add comprehensive error handling
10. 🔄 Set up monitoring and logging

## Support

For issues or questions:
1. Check logs in backend console
2. Verify database connectivity
3. Ensure all services are running
4. Check firewall/port settings
5. Review environment variables

---

**Project Structure:**
```
uxray/
├── backend/              # Spring Boot backend (Port 8080)
├── frontend/             # Next.js frontend (Port 3000)
├── crawler/              # Screenshot crawler (Port 8081)
├── lighthouse-service/   # Performance audits (Port 8082)
├── design-analysis-service/ # Design analysis (Port 8083)
├── ga4-service/          # Google Analytics (Port 8084)
└── start-database.sh     # Database startup script
```

**Happy analyzing! 🚀**

