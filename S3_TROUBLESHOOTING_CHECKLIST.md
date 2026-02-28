# S3 Upload Troubleshooting Checklist

## Quick Diagnosis

Run this command to test your S3 setup:
```bash
./test-s3-upload.sh
```

If the test passes but screenshots still aren't uploading, follow the steps below.

---

## Step-by-Step Troubleshooting

### ✅ Step 1: Verify AWS Credentials

```bash
# Configure AWS CLI (if not already done)
aws configure set aws_access_key_id AKIAX7PA4PKOVP7JDRK2
aws configure set aws_secret_access_key YOUR_SECRET_ACCESS_KEY
aws configure set default.region ap-south-1

# Test credentials
aws sts get-caller-identity
```

**Expected output:**
```json
{
    "UserId": "...",
    "Account": "548616829597",
    "Arn": "arn:aws:iam::548616829597:user/dryno-ai"
}
```

❌ If this fails: Your credentials are invalid. Get new ones from AWS Console.

---

### ✅ Step 2: Test S3 Bucket Access

```bash
# Test bucket exists and is accessible
aws s3 ls s3://heatmap.e2shub/

# Try to create a test file
echo "test" > test.txt
aws s3 cp test.txt s3://heatmap.e2shub/test.txt
rm test.txt

# Verify upload
aws s3 ls s3://heatmap.e2shub/test.txt

# Cleanup
aws s3 rm s3://heatmap.e2shub/test.txt
```

❌ If "NoSuchBucket" error:
```bash
# Create the bucket
aws s3 mb s3://heatmap.e2shub --region ap-south-1
```

❌ If "AccessDenied" error: Your IAM user needs S3 permissions. See Step 6.

---

### ✅ Step 3: Rebuild Backend with Updated Configuration

I've already updated your configuration. Now rebuild:

```bash
cd /Users/ravisharma/Desktop/uxray/backend

# Clean and rebuild
mvn clean package -DskipTests

# You should see:
# [INFO] BUILD SUCCESS
```

---

### ✅ Step 4: Start Backend and Monitor Logs

```bash
# Start backend and watch for S3 logs
java -jar target/backend-0.0.1-SNAPSHOT.jar | grep -E "S3|upload|StorageService"
```

**What to look for:**

✅ **Good signs:**
```
Attempting to upload to S3: bucket=heatmap.e2shub, key=screenshots/example.com/1-1.png
Successfully uploaded to S3: key=screenshots/example.com/1-1.png
```

❌ **Bad signs:**
```
No image binary data provided for screenshot
Failed to upload to S3: bucket=heatmap.e2shub, key=...
Access Denied
```

---

### ✅ Step 5: Trigger a Test Crawl

1. Start all services:
```bash
cd /Users/ravisharma/Desktop/uxray
./start-all-services.sh
```

2. Open frontend: http://localhost:3000

3. Create a new job to crawl a simple website (e.g., example.com)

4. Watch backend logs for S3 upload messages

---

### ✅ Step 6: Verify IAM Permissions

Your IAM user needs these S3 permissions:

Go to AWS Console → IAM → Users → dryno-ai → Permissions

**Required Policy:**
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

**How to add:**
1. AWS Console → IAM → Users → dryno-ai
2. Permissions tab → Add permissions → Create inline policy
3. JSON tab → Paste the policy above
4. Review → Create policy

---

### ✅ Step 7: Check Database for Uploaded Images

```bash
# Connect to MySQL
mysql -h localhost -u root -p

# Use your database
USE uxray;

# Check recent screenshots
SELECT 
    id,
    page_url,
    image_storage_path,
    image_public_url,
    created_at
FROM screenshot
ORDER BY created_at DESC
LIMIT 10;
```

**What to look for:**

✅ **Good (S3 working):**
```
image_storage_path: screenshots/example.com/1-1.png
image_public_url: https://d2sdbrggjmki87.cloudfront.net/screenshots/example.com/1-1.png
```

❌ **Bad (S3 not working):**
```
image_storage_path: job-id-123/1-1.png
image_public_url: NULL or http://localhost:8081/...
```

---

### ✅ Step 8: Verify Files in S3

```bash
# List screenshots in S3
aws s3 ls s3://heatmap.e2shub/screenshots/ --recursive | head -20

# Count total files
aws s3 ls s3://heatmap.e2shub/screenshots/ --recursive | wc -l
```

✅ If you see files: S3 upload is working!
❌ If empty: S3 upload is not working. Check logs.

---

### ✅ Step 9: Test Public Access to Uploaded Images

```bash
# Get a sample S3 URL from database
# Then test it:
curl -I https://d2sdbrggjmki87.cloudfront.net/screenshots/example.com/1-1.png
```

✅ **Good response:**
```
HTTP/2 200
content-type: image/png
```

❌ **Bad response:**
```
HTTP/2 403 Forbidden
```
→ S3 bucket is not public or CloudFront is misconfigured

**Fix public access:**
```bash
# Make bucket objects publicly readable
aws s3api put-bucket-acl --bucket heatmap.e2shub --acl public-read

# Or set bucket policy for public read
aws s3api put-bucket-policy --bucket heatmap.e2shub --policy '{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "PublicReadGetObject",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::heatmap.e2shub/*"
  }]
}'
```

---

## Common Issues and Solutions

### Issue 1: "No image binary data provided"

**Cause:** Crawler is not sending base64 image data to backend.

**Check:**
```bash
# Look at crawler logs
cd /Users/ravisharma/Desktop/uxray/crawler
npm start | grep -i base64
```

**Fix:** Verify `crawler/src/crawler.js` is sending `imageBase64` in the request:
```javascript
await api.addScreenshot(jobId, currentUrl, {
    imageStoragePath: storagePath,
    imageBase64: s.base64,  // ← This must be present
    imageFileName: fileName,
    imageContentType: 'image/png'
});
```

---

### Issue 2: "Access Denied" when uploading to S3

**Causes:**
1. AWS credentials are invalid
2. IAM user lacks S3 permissions
3. S3 bucket policy blocks the user

**Fix:**
1. Test credentials: `aws sts get-caller-identity`
2. Add IAM permissions (see Step 6)
3. Check bucket policy in AWS Console

---

### Issue 3: Files upload but URLs don't work

**Cause:** CloudFront or S3 bucket is not publicly accessible.

**Fix:**
```bash
# Option A: Make bucket public
aws s3api put-bucket-acl --bucket heatmap.e2shub --acl public-read

# Option B: Use CloudFront with proper origin
# Check CloudFront distribution settings in AWS Console
```

---

### Issue 4: "Invalid credentials" error

**Cause:** Access key or secret key is wrong/expired.

**Fix:**
1. Go to AWS Console → IAM → Users → dryno-ai → Security credentials
2. Create new access key
3. Update `application.yml` or environment variables
4. Restart backend

---

### Issue 5: Backend logs show no S3 upload attempts

**Cause:** Request from crawler is missing or malformed.

**Debug:**
1. Check crawler is running: `ps aux | grep node`
2. Check RabbitMQ is running: `rabbitmq-server status`
3. Check crawler logs for API errors
4. Verify backend received request:
   ```bash
   # In backend logs, look for:
   "Adding screenshot for job=..."
   ```

---

## Configuration Files Updated

I've updated these files with better configuration and logging:

### 1. `backend/src/main/resources/application.yml`
- ✅ Fixed CDN URL (added `https://`)
- ✅ Removed invalid user ARN from role-arn
- ✅ Added comments explaining configuration
- ✅ Set mode to `static` (direct credentials)

### 2. `backend/src/main/java/com/dryno/backend/storage/StorageService.java`
- ✅ Added detailed logging for uploads
- ✅ Added error handling with descriptive messages
- ✅ Logs bucket, key, size for each upload

### 3. `backend/src/main/java/com/dryno/backend/service/JobService.java`
- ✅ Added logging when screenshots are added
- ✅ Logs whether image binary data is present
- ✅ Logs upload success/failure

---

## Next Steps

1. **Run the test script:**
   ```bash
   ./test-s3-upload.sh
   ```

2. **If test passes, rebuild and restart backend:**
   ```bash
   cd backend
   mvn clean package
   java -jar target/backend-0.0.1-SNAPSHOT.jar
   ```

3. **Trigger a new crawl job** and watch the logs

4. **Check S3 for uploaded files:**
   ```bash
   aws s3 ls s3://heatmap.e2shub/screenshots/ --recursive
   ```

5. **If still not working, share:**
   - Backend logs (especially lines with "S3", "upload", "StorageService")
   - Output of `./test-s3-upload.sh`
   - Any error messages you see

---

## Quick Commands Reference

```bash
# Test AWS credentials
aws sts get-caller-identity

# List S3 bucket
aws s3 ls s3://heatmap.e2shub/

# Upload test file
echo "test" > test.txt && aws s3 cp test.txt s3://heatmap.e2shub/test.txt

# Count screenshots in S3
aws s3 ls s3://heatmap.e2shub/screenshots/ --recursive | wc -l

# Rebuild backend
cd backend && mvn clean package

# Start backend with S3 logs
java -jar backend/target/backend-0.0.1-SNAPSHOT.jar | grep -E "S3|upload"

# Check database
mysql -u root -p -e "SELECT page_url, image_public_url FROM uxray.screenshot ORDER BY created_at DESC LIMIT 5;"
```

