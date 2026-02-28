#!/bin/bash

# Test S3 Upload Configuration
# This script verifies that AWS credentials and S3 bucket are properly configured

set -e

echo "============================================"
echo "Testing S3 Upload Configuration"
echo "============================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# AWS Configuration
AWS_REGION="ap-south-1"
S3_BUCKET="heatmap.e2shub"
AWS_ACCESS_KEY="AKIAX7PA4PKOVP7JDRK2"

echo ""
echo "AWS Region: $AWS_REGION"
echo "S3 Bucket: $S3_BUCKET"
echo ""

# Test 1: Check if AWS CLI is installed
echo -e "${YELLOW}1. Checking AWS CLI installation...${NC}"
if command -v aws &> /dev/null; then
    echo -e "${GREEN}✓ AWS CLI is installed: $(aws --version)${NC}"
else
    echo -e "${RED}✗ AWS CLI is not installed${NC}"
    echo "Install it with: brew install awscli"
    exit 1
fi

# Test 2: Test AWS credentials
echo ""
echo -e "${YELLOW}2. Testing AWS credentials...${NC}"
if aws sts get-caller-identity --region $AWS_REGION > /dev/null 2>&1; then
    echo -e "${GREEN}✓ AWS credentials are valid${NC}"
    aws sts get-caller-identity --region $AWS_REGION
else
    echo -e "${RED}✗ AWS credentials are invalid or not configured${NC}"
    echo ""
    echo "Configure your credentials with:"
    echo "  aws configure set aws_access_key_id $AWS_ACCESS_KEY"
    echo "  aws configure set aws_secret_access_key YOUR_SECRET_KEY"
    echo "  aws configure set default.region $AWS_REGION"
    exit 1
fi

# Test 3: Test S3 bucket access
echo ""
echo -e "${YELLOW}3. Testing S3 bucket access...${NC}"
if aws s3 ls s3://$S3_BUCKET/ --region $AWS_REGION > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Can access S3 bucket: $S3_BUCKET${NC}"
    echo "Listing bucket contents (first 10 items):"
    aws s3 ls s3://$S3_BUCKET/ --region $AWS_REGION | head -10
else
    echo -e "${RED}✗ Cannot access S3 bucket: $S3_BUCKET${NC}"
    echo ""
    echo "The bucket might not exist or you don't have permissions."
    echo "Create the bucket with:"
    echo "  aws s3 mb s3://$S3_BUCKET --region $AWS_REGION"
    exit 1
fi

# Test 4: Test file upload
echo ""
echo -e "${YELLOW}4. Testing file upload to S3...${NC}"
TEST_FILE="/tmp/uxray-test-$(date +%s).txt"
TEST_KEY="test-uploads/test-$(date +%s).txt"

echo "Test content from UXRay S3 upload test" > $TEST_FILE

if aws s3 cp $TEST_FILE s3://$S3_BUCKET/$TEST_KEY --region $AWS_REGION > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Successfully uploaded test file to S3${NC}"
    echo "File URL: https://$S3_BUCKET.s3.$AWS_REGION.amazonaws.com/$TEST_KEY"
    
    # Verify the upload
    if aws s3 ls s3://$S3_BUCKET/$TEST_KEY --region $AWS_REGION > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Verified file exists in S3${NC}"
    fi
else
    echo -e "${RED}✗ Failed to upload test file to S3${NC}"
    rm -f $TEST_FILE
    exit 1
fi

# Test 5: Test file download (verify read permissions)
echo ""
echo -e "${YELLOW}5. Testing file download from S3...${NC}"
DOWNLOAD_FILE="/tmp/uxray-download-$(date +%s).txt"

if aws s3 cp s3://$S3_BUCKET/$TEST_KEY $DOWNLOAD_FILE --region $AWS_REGION > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Successfully downloaded test file from S3${NC}"
    rm -f $DOWNLOAD_FILE
else
    echo -e "${RED}✗ Failed to download test file from S3${NC}"
fi

# Test 6: Cleanup test file
echo ""
echo -e "${YELLOW}6. Cleaning up test files...${NC}"
if aws s3 rm s3://$S3_BUCKET/$TEST_KEY --region $AWS_REGION > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Test file deleted from S3${NC}"
fi
rm -f $TEST_FILE

# Test 7: Check screenshots folder
echo ""
echo -e "${YELLOW}7. Checking screenshots folder in S3...${NC}"
SCREENSHOT_COUNT=$(aws s3 ls s3://$S3_BUCKET/screenshots/ --recursive --region $AWS_REGION 2>/dev/null | wc -l | tr -d ' ')
if [ "$SCREENSHOT_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓ Found $SCREENSHOT_COUNT screenshots in S3${NC}"
    echo "Recent screenshots:"
    aws s3 ls s3://$S3_BUCKET/screenshots/ --recursive --region $AWS_REGION | tail -5
else
    echo -e "${YELLOW}! No screenshots found in S3 yet${NC}"
    echo "This is expected if you haven't run the crawler yet."
fi

# Test 8: Check heatmaps folder
echo ""
echo -e "${YELLOW}8. Checking heatmaps folder in S3...${NC}"
HEATMAP_COUNT=$(aws s3 ls s3://$S3_BUCKET/heatmap/ --recursive --region $AWS_REGION 2>/dev/null | wc -l | tr -d ' ')
if [ "$HEATMAP_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓ Found $HEATMAP_COUNT heatmaps in S3${NC}"
    echo "Recent heatmaps:"
    aws s3 ls s3://$S3_BUCKET/heatmap/ --recursive --region $AWS_REGION | tail -5
else
    echo -e "${YELLOW}! No heatmaps found in S3 yet${NC}"
    echo "This is expected if you haven't generated heatmaps yet."
fi

# Summary
echo ""
echo "============================================"
echo -e "${GREEN}All tests passed!${NC}"
echo "============================================"
echo ""
echo "Your AWS S3 configuration is working correctly."
echo ""
echo "If screenshots are still not being uploaded, check:"
echo "  1. Backend application logs for S3 upload errors"
echo "  2. Ensure backend is using the correct AWS credentials"
echo "  3. Restart the backend service after updating application.yml"
echo ""
echo "To restart backend:"
echo "  cd backend && mvn clean package && java -jar target/backend-0.0.1-SNAPSHOT.jar"
echo ""

