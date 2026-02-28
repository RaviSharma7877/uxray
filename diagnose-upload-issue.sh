#!/bin/bash

# Diagnose S3 Upload Issue
# This script helps identify why screenshots aren't being uploaded to S3

echo "╔════════════════════════════════════════════════════════╗"
echo "║     S3 Upload Issue Diagnostic Tool                   ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print section headers
print_section() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
}

# Function to check status
check_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ $1${NC}"
        return 0
    else
        echo -e "${RED}✗ $1${NC}"
        return 1
    fi
}

# Check 1: Local Screenshots
print_section "1. Checking Local Screenshots"
SCREENSHOT_DIR="/Users/ravisharma/Desktop/uxray/crawler/screenshots"
if [ -d "$SCREENSHOT_DIR" ]; then
    TOTAL_SCREENSHOTS=$(find "$SCREENSHOT_DIR" -name "*.png" | wc -l | tr -d ' ')
    echo -e "${GREEN}✓ Found $TOTAL_SCREENSHOTS screenshots locally${NC}"
    
    # Show recent directories
    echo ""
    echo "Recent screenshot directories:"
    ls -lt "$SCREENSHOT_DIR" | head -6
    
    # Count files in most recent directory
    RECENT_DIR=$(ls -t "$SCREENSHOT_DIR" | head -1)
    if [ -n "$RECENT_DIR" ]; then
        RECENT_COUNT=$(ls "$SCREENSHOT_DIR/$RECENT_DIR" | wc -l | tr -d ' ')
        echo ""
        echo "Most recent job: $RECENT_DIR ($RECENT_COUNT files)"
    fi
else
    echo -e "${RED}✗ Screenshot directory not found${NC}"
fi

# Check 2: AWS CLI Configuration
print_section "2. Checking AWS CLI Configuration"
if command -v aws &> /dev/null; then
    echo -e "${GREEN}✓ AWS CLI installed: $(aws --version | head -1)${NC}"
    
    echo ""
    echo "Testing AWS credentials..."
    if IDENTITY=$(aws sts get-caller-identity 2>&1); then
        echo -e "${GREEN}✓ AWS credentials are valid${NC}"
        echo "$IDENTITY" | jq '.' 2>/dev/null || echo "$IDENTITY"
    else
        echo -e "${RED}✗ AWS credentials are invalid${NC}"
        echo "$IDENTITY"
        echo ""
        echo "Fix with:"
        echo "  aws configure set aws_access_key_id YOUR_ACCESS_KEY"
        echo "  aws configure set aws_secret_access_key YOUR_SECRET_KEY"
        echo "  aws configure set default.region ap-south-1"
    fi
else
    echo -e "${RED}✗ AWS CLI not installed${NC}"
    echo "Install with: brew install awscli"
fi

# Check 3: S3 Bucket Access
print_section "3. Checking S3 Bucket Access"
S3_BUCKET="heatmap.e2shub"
if aws s3 ls s3://$S3_BUCKET/ &> /dev/null; then
    echo -e "${GREEN}✓ Can access S3 bucket: $S3_BUCKET${NC}"
    
    # Count screenshots in S3
    S3_SCREENSHOT_COUNT=$(aws s3 ls s3://$S3_BUCKET/screenshots/ --recursive 2>/dev/null | wc -l | tr -d ' ')
    S3_HEATMAP_COUNT=$(aws s3 ls s3://$S3_BUCKET/heatmap/ --recursive 2>/dev/null | wc -l | tr -d ' ')
    
    echo ""
    echo "Files in S3:"
    echo "  Screenshots: $S3_SCREENSHOT_COUNT"
    echo "  Heatmaps: $S3_HEATMAP_COUNT"
    
    if [ "$S3_SCREENSHOT_COUNT" -gt 0 ]; then
        echo ""
        echo "Recent uploads:"
        aws s3 ls s3://$S3_BUCKET/screenshots/ --recursive 2>/dev/null | tail -5
    fi
else
    echo -e "${RED}✗ Cannot access S3 bucket: $S3_BUCKET${NC}"
    echo ""
    echo "Possible issues:"
    echo "  1. Bucket doesn't exist"
    echo "  2. No permissions to access bucket"
    echo "  3. Wrong AWS credentials configured"
fi

# Check 4: Backend Service
print_section "4. Checking Backend Service"
if curl -s http://localhost:8080/actuator/health &> /dev/null; then
    echo -e "${GREEN}✓ Backend is running on port 8080${NC}"
else
    echo -e "${YELLOW}! Backend doesn't appear to be running on port 8080${NC}"
    echo ""
    echo "Start backend with:"
    echo "  cd backend && java -jar target/backend-0.0.1-SNAPSHOT.jar"
fi

# Check 5: Crawler Service
print_section "5. Checking Crawler Service"
if curl -s http://localhost:8081/health &> /dev/null; then
    echo -e "${GREEN}✓ Crawler image server is running on port 8081${NC}"
else
    echo -e "${YELLOW}! Crawler image server doesn't appear to be running${NC}"
    echo ""
    echo "Start crawler with:"
    echo "  cd crawler && npm start"
fi

# Check 6: RabbitMQ
print_section "6. Checking RabbitMQ"
if curl -s http://localhost:15672 &> /dev/null; then
    echo -e "${GREEN}✓ RabbitMQ management console is accessible${NC}"
    echo "  URL: http://localhost:15672 (guest/guest)"
else
    echo -e "${YELLOW}! RabbitMQ management console not accessible${NC}"
    echo ""
    echo "Start RabbitMQ with:"
    echo "  brew services start rabbitmq"
fi

# Check 7: Database
print_section "7. Checking Database for Screenshot Records"
if command -v mysql &> /dev/null; then
    echo "Checking screenshot records in database..."
    
    QUERY="SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN image_public_url IS NOT NULL THEN 1 ELSE 0 END) as with_public_url,
        SUM(CASE WHEN image_public_url IS NULL THEN 1 ELSE 0 END) as without_public_url
    FROM screenshot;"
    
    if RESULT=$(mysql -h localhost -u root uxray -e "$QUERY" 2>/dev/null); then
        echo "$RESULT"
        echo ""
        
        # Show recent screenshots
        echo "Recent screenshots (last 5):"
        mysql -h localhost -u root uxray -e "
            SELECT 
                SUBSTRING(id, 1, 8) as id,
                SUBSTRING(page_url, 1, 40) as url,
                CASE 
                    WHEN image_public_url LIKE 'https://%' THEN 'S3'
                    WHEN image_public_url LIKE 'http://localhost%' THEN 'Local'
                    WHEN image_public_url IS NULL THEN 'None'
                    ELSE 'Other'
                END as url_type,
                created_at
            FROM screenshot 
            ORDER BY created_at DESC 
            LIMIT 5;
        " 2>/dev/null || echo "Could not query database"
    else
        echo -e "${YELLOW}! Could not connect to database${NC}"
        echo "Try: mysql -h localhost -u root -p uxray"
    fi
else
    echo -e "${YELLOW}! MySQL CLI not found${NC}"
fi

# Check 8: Configuration Files
print_section "8. Checking Configuration"
echo "Backend application.yml:"
if [ -f "backend/src/main/resources/application.yml" ]; then
    echo -e "${GREEN}✓ application.yml exists${NC}"
    echo ""
    echo "AWS Configuration:"
    grep -A 10 "aws:" backend/src/main/resources/application.yml | grep -E "mode:|default-region:|bucket-name:" || echo "Could not extract AWS config"
else
    echo -e "${RED}✗ application.yml not found${NC}"
fi

# Summary and Recommendations
print_section "SUMMARY & NEXT STEPS"

echo ""
echo "Compare local vs S3 screenshots:"
echo "  Local: $TOTAL_SCREENSHOTS files"
echo "  S3: ${S3_SCREENSHOT_COUNT:-0} files"
echo ""

if [ "${S3_SCREENSHOT_COUNT:-0}" -eq 0 ] && [ "${TOTAL_SCREENSHOTS:-0}" -gt 0 ]; then
    echo -e "${RED}⚠ ISSUE DETECTED: Screenshots exist locally but not in S3${NC}"
    echo ""
    echo "Possible causes:"
    echo "  1. Backend not sending base64 data to S3"
    echo "  2. AWS credentials invalid or lacking permissions"
    echo "  3. S3 upload code not being executed"
    echo ""
    echo "Recommended actions:"
    echo ""
    echo "  ${YELLOW}Action 1:${NC} Test AWS credentials and S3 access"
    echo "    ./test-s3-upload.sh"
    echo ""
    echo "  ${YELLOW}Action 2:${NC} Restart backend and check logs for S3 upload attempts"
    echo "    cd backend"
    echo "    java -jar target/backend-0.0.1-SNAPSHOT.jar | tee backend.log"
    echo "    # In another terminal:"
    echo "    tail -f backend.log | grep -E 'S3|upload|StorageService'"
    echo ""
    echo "  ${YELLOW}Action 3:${NC} Trigger a new crawl job and monitor logs"
    echo "    # Watch for these log messages:"
    echo "    # - 'Adding screenshot for job=...'"
    echo "    # - 'Image binary data present, attempting S3 upload...'"
    echo "    # - 'Successfully uploaded to S3...'"
    echo ""
    echo "  ${YELLOW}Action 4:${NC} If logs show 'No image binary data', check crawler"
    echo "    cd crawler"
    echo "    # Verify crawler/src/crawler.js sends imageBase64 field"
    echo ""
elif [ "${S3_SCREENSHOT_COUNT:-0}" -gt 0 ]; then
    echo -e "${GREEN}✓ S3 uploads appear to be working!${NC}"
    echo ""
    echo "If you're still having issues, check:"
    echo "  1. Are the URLs accessible? Test a sample URL in browser"
    echo "  2. Is the CDN URL correct? Check application.yml"
    echo "  3. Check recent jobs for upload status in database"
else
    echo -e "${YELLOW}! Both local and S3 are empty${NC}"
    echo ""
    echo "Run a crawl job first:"
    echo "  1. Start all services: ./start-all-services.sh"
    echo "  2. Open frontend: http://localhost:3000"
    echo "  3. Create a new crawl job"
    echo "  4. Run this diagnostic again"
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo ""
echo "For detailed troubleshooting, see:"
echo "  - AWS_S3_UPLOAD_FIX.md"
echo "  - S3_TROUBLESHOOTING_CHECKLIST.md"
echo ""

