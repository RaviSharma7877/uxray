# Database Configuration Summary

## ✅ MySQL Database Configured

The UXRay backend is now configured to use **MySQL 8.0+** instead of H2 in-memory database.

---

## Configuration Files Updated

### 1. application.yml
**Location**: `backend/src/main/resources/application.yml`

**MySQL Configuration Added**:
```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/uxray?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true&createDatabaseIfNotExist=true
    driver-class-name: com.mysql.cj.jdbc.Driver
    username: ${DB_USERNAME:root}
    password: ${DB_PASSWORD:password}
  
  jpa:
    hibernate:
      ddl-auto: update
    show-sql: true
    properties:
      hibernate:
        dialect: org.hibernate.dialect.MySQL8Dialect
```

**Key Features**:
- ✅ Uses environment variables for credentials (`DB_USERNAME`, `DB_PASSWORD`)
- ✅ Auto-creates database if it doesn't exist (`createDatabaseIfNotExist=true`)
- ✅ Auto-updates schema (`ddl-auto: update`)
- ✅ MySQL 8 optimized dialect
- ✅ Shows SQL queries in logs for debugging

### 2. pom.xml
**Location**: `backend/pom.xml`

**H2 Dependency Added** (optional, for testing):
```xml
<dependency>
    <groupId>com.h2database</groupId>
    <artifactId>h2</artifactId>
    <scope>runtime</scope>
</dependency>
```

**MySQL Dependency** (already present):
```xml
<dependency>
    <groupId>com.mysql</groupId>
    <artifactId>mysql-connector-j</artifactId>
    <scope>runtime</scope>
</dependency>
```

---

## Quick Setup

### Using Docker (Recommended)

```bash
# 1. Start MySQL container
docker run -d \
  --name mysql-uxray \
  -e MYSQL_ROOT_PASSWORD=password \
  -e MYSQL_DATABASE=uxray \
  -p 3306:3306 \
  mysql:8.0

# 2. Create .env file in backend directory
cd backend
cat > .env << EOF
DB_USERNAME=root
DB_PASSWORD=password
EOF

# 3. Start backend
mvn spring-boot:run
```

### Using Local MySQL

```bash
# 1. Install MySQL (if not already installed)
# macOS: brew install mysql
# Ubuntu: sudo apt install mysql-server

# 2. Create database
mysql -u root -p -e "CREATE DATABASE uxray;"

# 3. Create .env file
cd backend
cat > .env << EOF
DB_USERNAME=root
DB_PASSWORD=your_mysql_password
EOF

# 4. Start backend
mvn spring-boot:run
```

---

## Environment Variables

Create `.env` file in `backend` directory:

```bash
# Required
DB_USERNAME=root
DB_PASSWORD=password

# Optional (if using non-default settings)
# DB_URL=jdbc:mysql://localhost:3306/uxray
# DB_HOST=localhost
# DB_PORT=3306
# DB_NAME=uxray
```

---

## Database Tables

When the backend starts, Hibernate will automatically create these tables:

1. **job** - Main job entity
   - id (UUID)
   - type (URL_ANALYSIS, DESIGN_ANALYSIS)
   - status (PENDING, IN_PROGRESS, COMPLETED, FAILED)
   - start_url, max_pages, property_id
   - Lighthouse scores
   - Timestamps

2. **screenshot** - Screenshots captured during crawl
   - id (UUID)
   - job_id (FK)
   - page_url
   - image_storage_path

3. **ga4_results** - Google Analytics data
   - id (Long)
   - job_id (FK)
   - User metrics, sessions, engagement
   - Top pages, traffic sources, countries
   - Events, acquisition channels
   - Device technology, demographics
   - Core Web Vitals

4. **design_analysis_result** - Design analysis results
   - id (Long)
   - job_id (FK)
   - summary
   - key_points (JSON)

---

## Verification

### Check Database Connection

```bash
# View logs when starting backend
mvn spring-boot:run

# Look for:
# - "Hibernate: create table job ..."
# - "HikariPool-1 - Start completed"
# - No connection errors
```

### Query Database

```bash
# Connect to MySQL
mysql -u root -p uxray

# List tables
SHOW TABLES;

# View job schema
DESCRIBE job;

# Count records
SELECT COUNT(*) FROM job;

# View recent jobs
SELECT id, type, status, start_url, created_at 
FROM job 
ORDER BY created_at DESC 
LIMIT 10;
```

---

## Configuration Options

### hibernate.ddl-auto Options

| Value | Description | Use Case |
|-------|-------------|----------|
| `update` | Auto-update schema (current) | **Development** - Keeps data, updates schema |
| `create` | Drop and recreate schema | Testing - Fresh start each time |
| `create-drop` | Drop on shutdown | Testing - Clean up after tests |
| `validate` | Only validate schema | **Production** - Use migrations |
| `none` | No schema management | **Production** - Manual migrations |

### For Production

Change in `application.yml`:

```yaml
spring:
  jpa:
    hibernate:
      ddl-auto: validate  # Don't auto-modify schema
    show-sql: false       # Don't log SQL
  
  flyway:
    enabled: true         # Use migrations
```

---

## Troubleshooting

### Error: Access denied for user

**Problem**: Wrong MySQL credentials

**Solution**:
```bash
# Check .env file
cat backend/.env

# Reset MySQL password
mysql -u root
ALTER USER 'root'@'localhost' IDENTIFIED BY 'password';
FLUSH PRIVILEGES;
```

### Error: Communications link failure

**Problem**: MySQL not running

**Solution**:
```bash
# Check MySQL status
# Docker:
docker ps | grep mysql

# Local:
brew services list | grep mysql  # macOS
sudo systemctl status mysql      # Linux

# Start MySQL
docker start mysql-uxray         # Docker
brew services start mysql        # macOS
sudo systemctl start mysql       # Linux
```

### Error: Unknown database 'uxray'

**Problem**: Database doesn't exist

**Solution**:
The database should be created automatically. If not:
```bash
mysql -u root -p -e "CREATE DATABASE uxray;"
```

---

## Migration from H2 to MySQL

If you were using H2 before:

1. **No data migration needed** - H2 was in-memory (data lost on restart)
2. **Update configuration** - Already done in `application.yml`
3. **Start MySQL** - Follow setup steps above
4. **Restart backend** - Tables will be created automatically

---

## Docker Compose

For running all services together:

```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    container_name: uxray-mysql
    environment:
      MYSQL_ROOT_PASSWORD: password
      MYSQL_DATABASE: uxray
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql

  rabbitmq:
    image: rabbitmq:3-management
    container_name: uxray-rabbitmq
    ports:
      - "5672:5672"
      - "15672:15672"

volumes:
  mysql_data:
```

Start with:
```bash
docker-compose up -d
```

---

## Summary

✅ **MySQL 8.0+ configured as primary database**  
✅ **H2 dependency added for optional testing**  
✅ **Environment variable support for credentials**  
✅ **Auto-schema creation enabled**  
✅ **Production-ready configuration available**  

For detailed MySQL setup, see **[MYSQL_SETUP.md](MYSQL_SETUP.md)**

