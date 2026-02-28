# Environment Variables Setup

## Quick Start

The backend now has **placeholder OAuth credentials** configured, so it will start without errors. However, **GA4 features won't work** until you add real Google OAuth credentials.

---

## Option 1: Create .env File (Recommended)

Create a `.env` file in the `backend` directory:

```bash
cd backend
cat > .env << 'EOF'
# Database Configuration
DB_USERNAME=root
DB_PASSWORD=Ravi@123

# Google OAuth Configuration (for GA4 features)
GOOGLE_CLIENT_ID=your-actual-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-actual-client-secret
EOF
```

---

## Option 2: Export Environment Variables

```bash
export DB_USERNAME=root
export DB_PASSWORD=Ravi@123
export GOOGLE_CLIENT_ID=your-actual-client-id.apps.googleusercontent.com
export GOOGLE_CLIENT_SECRET=your-actual-client-secret

# Then start the application
mvn spring-boot:run
```

---

## Option 3: Set in IDE (IntelliJ IDEA / Eclipse)

### IntelliJ IDEA
1. Run → Edit Configurations
2. Select your Spring Boot application
3. Add Environment Variables:
   ```
   DB_USERNAME=root;DB_PASSWORD=Ravi@123;GOOGLE_CLIENT_ID=your-id;GOOGLE_CLIENT_SECRET=your-secret
   ```

### Eclipse
1. Run → Run Configurations
2. Select your application
3. Go to Environment tab
4. Add variables one by one

---

## Getting Google OAuth Credentials

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Name it: "UXRay" or similar

### Step 2: Enable Required APIs

1. Go to **APIs & Services** → **Library**
2. Enable these APIs:
   - **Google Analytics Admin API**
   - **Google Analytics Data API**

### Step 3: Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth 2.0 Client ID**
3. Configure consent screen if prompted:
   - User Type: **External**
   - App name: **UXRay**
   - User support email: Your email
   - Developer contact: Your email
   - Scopes: Add the following:
     - `userinfo.email`
     - `userinfo.profile`  
     - `analytics.readonly`
4. Create OAuth Client ID:
   - Application type: **Web application**
   - Name: **UXRay Backend**
   - Authorized redirect URIs:
     ```
     http://localhost:8080/login/oauth2/code/google
     ```
5. Click **Create**
6. Copy the **Client ID** and **Client Secret**

### Step 4: Update Configuration

Replace placeholders in your `.env` file:

```bash
GOOGLE_CLIENT_ID=123456789-abc...xyz.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
```

---

## Current Configuration

### application.yml (Current)

```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/uxray?...
    username: ${DB_USERNAME:root}
    password: ${DB_PASSWORD:Ravi@123}
  
  security:
    oauth2:
      client:
        registration:
          google:
            client-id: ${GOOGLE_CLIENT_ID:placeholder-client-id}
            client-secret: ${GOOGLE_CLIENT_SECRET:placeholder-client-secret}
```

### What This Means

- ✅ **Database**: Uses `Ravi@123` as default password
- ✅ **OAuth**: Uses placeholder values (app starts but GA4 won't work)
- ⚠️ **GA4 Features**: Require real OAuth credentials

---

## Testing Without GA4

You can test most features without Google OAuth:

### What Works:
- ✅ URL Analysis (screenshots + Lighthouse)
- ✅ Design Analysis
- ✅ Job management
- ✅ All backend APIs

### What Doesn't Work:
- ❌ Google Analytics integration
- ❌ GA4 data fetching
- ❌ OAuth login
- ❌ GA4 property listing

---

## Verification

### Check Environment Variables

```bash
# In your terminal
echo $GOOGLE_CLIENT_ID
echo $GOOGLE_CLIENT_SECRET

# If using .env file (not shown in terminal)
cat backend/.env
```

### Start Backend

```bash
cd backend
mvn spring-boot:run
```

### Check Logs

Look for:
```
✅ Success:
Started BackendApplication in X seconds

❌ If you see:
Client id of registration 'google' must not be empty
→ OAuth credentials not loaded properly
```

### Test OAuth (with real credentials)

1. Start backend
2. Open browser: `http://localhost:8080/oauth2/authorization/google`
3. You should be redirected to Google login
4. After login, redirected back to application

---

## Troubleshooting

### Backend won't start - OAuth error

**Problem**: Still seeing "Client id must not be empty"

**Solution**:
```bash
# Make sure you're in the backend directory
cd backend

# Check if .env exists
ls -la .env

# If using environment variables, verify they're exported
echo $GOOGLE_CLIENT_ID

# Restart with clean
mvn clean spring-boot:run
```

### Backend starts but GA4 doesn't work

**Problem**: Using placeholder credentials

**Solution**: Add real Google OAuth credentials (see steps above)

### Can't create OAuth credentials

**Problem**: Google Cloud account/billing issues

**Solution**: 
- You can use the application without GA4 features
- Focus on screenshot crawling and Lighthouse audits
- Add OAuth later when ready

---

## Quick Commands

```bash
# Start with database only (no GA4)
cd backend
mvn spring-boot:run

# Start with all features (requires OAuth setup)
export GOOGLE_CLIENT_ID=your-id
export GOOGLE_CLIENT_SECRET=your-secret
mvn spring-boot:run

# Check if running
curl http://localhost:8080/api/auth/status
```

---

## Summary

**Current Status:**
- ✅ Database configured (MySQL with password: Ravi@123)
- ✅ Application starts with placeholder OAuth
- ⚠️ GA4 features need real OAuth credentials

**Next Steps:**
1. ✅ **Now**: Start backend - it will work!
2. ⏭️ **Later**: Add Google OAuth for GA4 features
3. ⏭️ **Optional**: Test GA4 integration

**The application is ready to use!** 🎉

