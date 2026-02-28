# AWS S3 Upload Fix Guide

## Problem
Screenshots are being generated locally by the crawler but are not being uploaded to AWS S3.

## Root Causes Identified

### 1. **Invalid AWS Configuration**
Your `application.yml` has a **user ARN** instead of a **role ARN**:
```yaml
role-arn: ${APP_AWS_ROLE_ARN:arn:aws:iam::548616829597:user/dryno-ai}
```
- This is wrong: `arn:aws:iam::548616829597:user/dryno-ai` (USER ARN)
- Should be: `arn:aws:iam::548616829597:role/YourRoleName` (ROLE ARN)

### 2. **AWS Mode Mismatch**
The mode is set to `static` but you have assume-role configuration.

### 3. **Missing Error Logging**
No logging to see S3 upload failures.

---

## Solution Steps

### Step 1: Verify Your AWS Credentials

First, let's test if your AWS credentials work:

```bash
# Install AWS CLI if not already installed
# brew install awscli  # macOS
# or use pip: pip install awscli

# Configure AWS CLI with your credentials
aws configure set aws_access_key_id YOUR_ACCESS_KEY
aws configure set aws_secret_access_key YOUR_SECRET_KEY
aws configure set default.region ap-south-1

# Test credentials
aws sts get-caller-identity

# Test S3 bucket access
aws s3 ls s3://heatmap.e2shub/

# Try to upload a test file
echo "test" > test.txt
aws s3 cp test.txt s3://heatmap.e2shub/test.txt
rm test.txt
```

### Step 2: Check S3 Bucket Permissions

Your IAM user/credentials need these S3 permissions:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:PutObjectAcl",
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::heatmap.e2shub",
        "arn:aws:s3:::heatmap.e2shub/*"
      ]
    }
  ]
}
```

### Step 3: Fix AWS Configuration

#### Option A: Use Static Credentials (Simpler)

Update `backend/src/main/resources/application.yml`:

```yaml
app:
  aws:
    mode: static  # Keep as static
    default-region: ap-south-1
    base:
      access-key-id: ${APP_AWS_ACCESS_KEY_ID:YOUR_ACCESS_KEY}
      secret-access-key: ${APP_AWS_SECRET_ACCESS_KEY:YOUR_SECRET_KEY}
      session-token: ${APP_AWS_SESSION_TOKEN:}  # Leave empty if not using
    # Remove or comment out sts section when using static mode
    # sts:
    #   role-arn: ${APP_AWS_ROLE_ARN:}
    #   external-id: ${APP_AWS_EXTERNAL_ID:}
    #   session-duration-seconds: ${APP_AWS_SESSION_DURATION_SECONDS:3600}

storage:
  bucket-name: ${STORAGE_BUCKET_NAME:heatmap.e2shub}
  screenshot-prefix: ${STORAGE_SCREENSHOT_PREFIX:screenshots}
  heatmap-prefix: ${STORAGE_HEATMAP_PREFIX:heatmap}
  use-domain-folders: ${STORAGE_USE_DOMAIN_FOLDERS:true}
  cdn-base-url: ${STORAGE_CDN_BASE_URL:https://d2sdbrggjmki87.cloudfront.net}  # Add https://
  max-file-size-mb: ${STORAGE_MAX_FILE_SIZE_MB:5000}
```

#### Option B: Use Assume-Role (If you have a role)

If you have a role to assume:
```yaml
app:
  aws:
    mode: assume-role  # Change to assume-role
    default-region: ap-south-1
    base:
      access-key-id: ${APP_AWS_ACCESS_KEY_ID:YOUR_ACCESS_KEY}
      secret-access-key: ${APP_AWS_SECRET_ACCESS_KEY:YOUR_SECRET_KEY}
    sts:
      role-arn: ${APP_AWS_ROLE_ARN:arn:aws:iam::548616829597:role/YourActualRoleName}  # MUST be a ROLE, not USER
      external-id: ${APP_AWS_EXTERNAL_ID:}
      session-duration-seconds: ${APP_AWS_SESSION_DURATION_SECONDS:3600}
```

### Step 4: Add Better Error Logging

Update the `StorageService` to add better logging:

```java
// In StorageService.java, add this import at the top:
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

// Add this field to the class:
private static final Logger log = LoggerFactory.getLogger(StorageService.class);

// Update the store method to add logging:
private StoredObject store(InputStream data,
                           long contentLength,
                           String domain,
                           String objectName,
                           String contentType,
                           String prefix) {
    validateSize(contentLength);
    String key = buildObjectKey(prefix, domain, objectName);
    
    log.info("Attempting to upload to S3: bucket={}, key={}, size={} bytes", 
             storageProperties.getBucketName(), key, contentLength);

    PutObjectRequest.Builder requestBuilder = PutObjectRequest.builder()
            .bucket(storageProperties.getBucketName())
            .key(key)
            .contentLength(contentLength);

    if (StringUtils.hasText(contentType)) {
        requestBuilder.contentType(contentType.trim());
    }

    try {
        S3Client s3 = clientFactory.getClient();
        s3.putObject(requestBuilder.build(), RequestBody.fromInputStream(data, contentLength));
        log.info("Successfully uploaded to S3: {}", key);
        return new StoredObject(key, buildPublicUrl(s3, key));
    } catch (Exception ex) {
        log.error("Failed to upload to S3: bucket={}, key={}", 
                 storageProperties.getBucketName(), key, ex);
        throw ex;
    }
}
```

### Step 5: Environment Variables (Recommended)

Instead of hardcoding credentials, use environment variables:

Create a `.env` file (add it to `.gitignore`):
```bash
APP_AWS_MODE=static
APP_AWS_DEFAULT_REGION=ap-south-1
APP_AWS_ACCESS_KEY_ID=YOUR_ACCESS_KEY
APP_AWS_SECRET_ACCESS_KEY=YOUR_SECRET_KEY
STORAGE_BUCKET_NAME=heatmap.e2shub
STORAGE_CDN_BASE_URL=https://d2sdbrggjmki87.cloudfront.net
```

Then in `application.yml`, keep only the variable references:
```yaml
app:
  aws:
    mode: ${APP_AWS_MODE}
    default-region: ${APP_AWS_DEFAULT_REGION}
    base:
      access-key-id: ${APP_AWS_ACCESS_KEY_ID}
      secret-access-key: ${APP_AWS_SECRET_ACCESS_KEY}
```

### Step 6: Check Backend Logs

After restarting the backend, check logs for S3 upload attempts:

```bash
# If running with maven
mvn spring-boot:run

# Or if running the jar
java -jar backend/target/backend-0.0.1-SNAPSHOT.jar

# Look for logs like:
# "Attempting to upload to S3..."
# "Successfully uploaded to S3..." or "Failed to upload to S3..."
```

### Step 7: Verify Bucket Exists and is Accessible

```bash
# Create bucket if it doesn't exist
aws s3 mb s3://heatmap.e2shub --region ap-south-1

# Set bucket policy to allow your IAM user
aws s3api put-bucket-policy --bucket heatmap.e2shub --policy '{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "AllowUXRayUpload",
    "Effect": "Allow",
    "Principal": {
      "AWS": "arn:aws:iam::548616829597:user/dryno-ai"
    },
    "Action": [
      "s3:PutObject",
      "s3:GetObject",
      "s3:ListBucket"
    ],
    "Resource": [
      "arn:aws:s3:::heatmap.e2shub",
      "arn:aws:s3:::heatmap.e2shub/*"
    ]
  }]
}'

# Enable public read if needed (for images)
aws s3api put-bucket-acl --bucket heatmap.e2shub --acl public-read
```

---

## Testing the Fix

1. **Restart the backend**:
```bash
cd backend
mvn clean package
java -jar target/backend-0.0.1-SNAPSHOT.jar
```

2. **Trigger a new crawl job** from the frontend

3. **Check backend logs** for S3 upload messages

4. **Verify files in S3**:
```bash
aws s3 ls s3://heatmap.e2shub/screenshots/ --recursive
```

5. **Check the database** to see if `image_public_url` is populated:
```sql
SELECT id, page_url, image_storage_path, image_public_url 
FROM screenshot 
ORDER BY created_at DESC 
LIMIT 10;
```

---

## Common Issues and Solutions

### Issue 1: "Access Denied" Error
**Solution**: Your IAM user doesn't have S3 permissions. Add the policy shown in Step 2.

### Issue 2: "NoSuchBucket" Error
**Solution**: Bucket doesn't exist or wrong region. Create it with `aws s3 mb`.

### Issue 3: "Invalid Credentials" Error
**Solution**: Access key or secret key is wrong. Verify with `aws sts get-caller-identity`.

### Issue 4: Files upload but URLs don't work
**Solution**: 
- Check bucket is public or has correct CloudFront distribution
- Verify CDN URL is correct: `https://d2sdbrggjmki87.cloudfront.net`

### Issue 5: No errors but still not uploading
**Solution**: 
- Check if `request.hasImageBinary()` returns true in `JobService.addScreenshot()`
- Verify base64 data is being sent from crawler
- Add debug logging in `JobService.addScreenshot()` method

---

## Quick Verification Script

Create `test-s3-upload.sh`:
```bash
#!/bin/bash

echo "Testing S3 Upload Configuration..."

# Test AWS credentials
echo "1. Testing AWS credentials..."
aws sts get-caller-identity

# Test bucket access
echo -e "\n2. Testing bucket access..."
aws s3 ls s3://heatmap.e2shub/

# Test file upload
echo -e "\n3. Testing file upload..."
echo "test content" > /tmp/test-upload.txt
aws s3 cp /tmp/test-upload.txt s3://heatmap.e2shub/test-upload.txt
rm /tmp/test-upload.txt

# Verify upload
echo -e "\n4. Verifying upload..."
aws s3 ls s3://heatmap.e2shub/test-upload.txt

# Get public URL
echo -e "\n5. Public URL:"
echo "https://heatmap.e2shub.s3.ap-south-1.amazonaws.com/test-upload.txt"

# Cleanup
echo -e "\n6. Cleaning up..."
aws s3 rm s3://heatmap.e2shub/test-upload.txt

echo -e "\nDone!"
```

Run it:
```bash
chmod +x test-s3-upload.sh
./test-s3-upload.sh
```

---

## Next Steps

1. ✅ Fix the AWS configuration in `application.yml`
2. ✅ Test AWS credentials with AWS CLI
3. ✅ Add logging to `StorageService`
4. ✅ Restart backend and monitor logs
5. ✅ Trigger a new crawl job
6. ✅ Verify files in S3
7. ✅ Check URLs work in browser

