# MySQL Database Setup Guide

This guide will help you set up MySQL database for the UXRay backend.

---

## Prerequisites

- MySQL 8.0+ installed
- MySQL server running

---

## Installation

### macOS

```bash
# Install MySQL using Homebrew
brew install mysql

# Start MySQL service
brew services start mysql

# Secure installation (optional but recommended)
mysql_secure_installation
```

### Ubuntu/Debian

```bash
# Update package index
sudo apt update

# Install MySQL
sudo apt install mysql-server

# Start MySQL service
sudo systemctl start mysql
sudo systemctl enable mysql

# Secure installation
sudo mysql_secure_installation
```

### Windows

1. Download MySQL installer from: https://dev.mysql.com/downloads/installer/
2. Run the installer and follow the setup wizard
3. Choose "Developer Default" setup type
4. Set root password during installation

### Using Docker (Recommended for Development)

```bash
# Run MySQL in Docker container
docker run -d \
  --name mysql-uxray \
  -e MYSQL_ROOT_PASSWORD=password \
  -e MYSQL_DATABASE=uxray \
  -p 3306:3306 \
  mysql:8.0

# Verify it's running
docker ps | grep mysql-uxray
```

---

## Database Setup

### Option 1: Using Docker (Automatic)

The Docker command above automatically creates the database. Skip to "Configure Backend" section.

### Option 2: Manual Setup

```bash
# Login to MySQL as root
mysql -u root -p

# Create database
CREATE DATABASE uxray CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Create user (optional - for better security)
CREATE USER 'uxray_user'@'localhost' IDENTIFIED BY 'your_secure_password';

# Grant privileges
GRANT ALL PRIVILEGES ON uxray.* TO 'uxray_user'@'localhost';

# Flush privileges
FLUSH PRIVILEGES;

# Verify database was created
SHOW DATABASES;

# Exit MySQL
EXIT;
```

---

## Configure Backend

### Option 1: Using Environment Variables (Recommended)

Create `.env` file in the `backend` directory:

```bash
cd backend
cp .env.example .env
```

Edit `.env`:

```properties
# Using root user (Development)
DB_USERNAME=root
DB_PASSWORD=password

# OR using dedicated user (Production recommended)
# DB_USERNAME=uxray_user
# DB_PASSWORD=your_secure_password

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### Option 2: Direct Configuration in application.yml

Edit `backend/src/main/resources/application.yml`:

```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/uxray?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true&createDatabaseIfNotExist=true
    username: root
    password: your_password
```

**Note**: This is less secure. Use environment variables for production.

---

## Verify Database Connection

### Test Connection Using MySQL Client

```bash
# Connect to the database
mysql -u root -p uxray

# List tables (will be empty initially)
SHOW TABLES;

# Exit
EXIT;
```

### Test Connection from Backend

1. Start the backend application:

```bash
cd backend
mvn spring-boot:run
```

2. Check logs for successful connection:

```
Hibernate: 
    
    create table job (
        ...
    )
```

3. Verify tables were created:

```bash
mysql -u root -p uxray
SHOW TABLES;
```

You should see tables like:
- `job`
- `screenshot`
- `ga4_results`
- etc.

---

## Database Configuration Details

### Current Configuration (application.yml)

```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/uxray?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true&createDatabaseIfNotExist=true
    driver-class-name: com.mysql.cj.jdbc.Driver
    username: ${DB_USERNAME:root}
    password: ${DB_PASSWORD:password}
  
  jpa:
    hibernate:
      ddl-auto: update  # Automatically creates/updates tables
    show-sql: true      # Shows SQL queries in logs
    properties:
      hibernate:
        format_sql: true
        dialect: org.hibernate.dialect.MySQL8Dialect
```

### Configuration Options

**spring.jpa.hibernate.ddl-auto:**
- `update` - Updates schema (recommended for development)
- `create` - Drops and recreates schema on startup
- `create-drop` - Drops schema on shutdown
- `validate` - Only validates schema
- `none` - No schema management (use migrations)

**URL Parameters:**
- `createDatabaseIfNotExist=true` - Auto-creates database if it doesn't exist
- `useSSL=false` - Disables SSL (for local development)
- `serverTimezone=UTC` - Sets timezone
- `allowPublicKeyRetrieval=true` - Allows password retrieval

---

## Troubleshooting

### Error: Access denied for user 'root'@'localhost'

**Solution:**
```bash
# Reset MySQL root password
mysql -u root

# In MySQL console
ALTER USER 'root'@'localhost' IDENTIFIED BY 'new_password';
FLUSH PRIVILEGES;
```

### Error: Communications link failure

**Causes:**
1. MySQL server not running
2. Wrong port (default is 3306)
3. Firewall blocking connection

**Solution:**
```bash
# Check if MySQL is running
# macOS
brew services list | grep mysql

# Ubuntu/Linux
sudo systemctl status mysql

# Docker
docker ps | grep mysql

# Start MySQL if not running
brew services start mysql  # macOS
sudo systemctl start mysql # Linux
docker start mysql-uxray   # Docker
```

### Error: Unknown database 'uxray'

**Solution:**

The database should be created automatically due to `createDatabaseIfNotExist=true` parameter. If not, create it manually:

```bash
mysql -u root -p
CREATE DATABASE uxray;
EXIT;
```

### Error: Public Key Retrieval is not allowed

**Solution:**

Already fixed in the connection URL with `allowPublicKeyRetrieval=true`. If still occurring, update MySQL Connector:

```xml
<dependency>
    <groupId>com.mysql</groupId>
    <artifactId>mysql-connector-j</artifactId>
    <version>8.2.0</version>
</dependency>
```

---

## Production Configuration

### Recommended Settings

1. **Use dedicated database user** (not root)
2. **Enable SSL** for remote connections
3. **Set ddl-auto to validate** or use Flyway migrations
4. **Use connection pooling**

```yaml
spring:
  datasource:
    url: jdbc:mysql://your-mysql-server:3306/uxray?useSSL=true&serverTimezone=UTC
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}
    hikari:
      maximum-pool-size: 10
      minimum-idle: 5
      connection-timeout: 30000
  
  jpa:
    hibernate:
      ddl-auto: validate  # Don't auto-modify production schema
    show-sql: false       # Don't log SQL in production
  
  flyway:
    enabled: true         # Use migrations
```

---

## Database Backup

### Backup Database

```bash
# Backup to file
mysqldump -u root -p uxray > uxray_backup_$(date +%Y%m%d).sql

# Backup to compressed file
mysqldump -u root -p uxray | gzip > uxray_backup_$(date +%Y%m%d).sql.gz
```

### Restore Database

```bash
# Restore from backup
mysql -u root -p uxray < uxray_backup_20241106.sql

# Restore from compressed backup
gunzip < uxray_backup_20241106.sql.gz | mysql -u root -p uxray
```

---

## Viewing Data

### Using MySQL Command Line

```bash
mysql -u root -p uxray

# View all jobs
SELECT id, type, status, start_url FROM job;

# View screenshots
SELECT id, page_url, image_storage_path FROM screenshot;

# Exit
EXIT;
```

### Using MySQL Workbench (GUI)

1. Download: https://dev.mysql.com/downloads/workbench/
2. Install and open MySQL Workbench
3. Create connection:
   - Connection Name: UXRay Local
   - Hostname: localhost
   - Port: 3306
   - Username: root
4. Connect and browse database

### Using DBeaver (Free, Cross-platform)

1. Download: https://dbeaver.io/download/
2. Install and open DBeaver
3. New Database Connection → MySQL
4. Configure connection and connect

---

## Monitoring

### Check Database Size

```sql
SELECT 
    table_schema AS 'Database',
    ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)'
FROM information_schema.tables
WHERE table_schema = 'uxray'
GROUP BY table_schema;
```

### Check Table Sizes

```sql
SELECT 
    table_name AS 'Table',
    ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'Size (MB)'
FROM information_schema.tables
WHERE table_schema = 'uxray'
ORDER BY (data_length + index_length) DESC;
```

### Check Active Connections

```sql
SHOW PROCESSLIST;
```

---

## Docker Compose Setup

For easier local development, use Docker Compose:

Create `docker-compose.yml` in project root:

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
    command: --default-authentication-plugin=mysql_native_password

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

Stop with:
```bash
docker-compose down
```

---

## Summary

**Quick Setup (Docker):**
```bash
# 1. Start MySQL
docker run -d --name mysql-uxray -e MYSQL_ROOT_PASSWORD=password -e MYSQL_DATABASE=uxray -p 3306:3306 mysql:8.0

# 2. Configure backend
cd backend
echo "DB_USERNAME=root" > .env
echo "DB_PASSWORD=password" >> .env

# 3. Start backend
mvn spring-boot:run
```

**Quick Setup (Local MySQL):**
```bash
# 1. Create database
mysql -u root -p -e "CREATE DATABASE uxray;"

# 2. Configure backend
cd backend
echo "DB_USERNAME=root" > .env
echo "DB_PASSWORD=your_password" >> .env

# 3. Start backend
mvn spring-boot:run
```

Your MySQL database is now ready for UXRay! 🎉

