# S3 Upload Fix - Summary

## What I Fixed

### 1. **AWS Configuration Issues** (`application.yml`)
**Problem:** 
- Invalid user ARN was set as role ARN: `arn:aws:iam::548616829597:user/dryno-ai`
- Missing `https://` in CDN URL

**Fixed:**
- ✅ Removed the invalid role ARN (left empty for static mode)
- ✅ Added `https://` to CDN URL: `https://d2sdbrggjmki87.cloudfront.net`
- ✅ Added clear comments explaining the configuration

### 2. **Added Detailed Logging** (`StorageService.java`)
**Problem:** No visibility into S3 upload attempts or failures

**Fixed:**
- ✅ Added SLF4J logger to StorageService
- ✅ Logs before upload: bucket, key, size, content type
- ✅ Logs after successful upload: key and public URL
- ✅ Logs detailed error messages on failure

### 3. **Added Screenshot Upload Tracking** (`JobService.java`)
**Problem:** Couldn't tell if crawler was sending image data

**Fixed:**
- ✅ Logs when screenshot is added: jobId, pageUrl, hasImageBinary
- ✅ Logs when image binary is present and attempting upload
- ✅ Logs successful uploads with key and URL
- ✅ Warns when no image binary data is provided

### 4. **Created Diagnostic Tools**
Created three helpful scripts:

- **`test-s3-upload.sh`** - Tests AWS credentials and S3 access
- **`diagnose-upload-issue.sh`** - Comprehensive diagnostic of the entire system
- **`AWS_S3_UPLOAD_FIX.md`** - Detailed troubleshooting guide
- **`S3_TROUBLESHOOTING_CHECKLIST.md`** - Step-by-step checklist

---

## What You Need to Do Next

### Step 1: Test AWS Credentials

```bash
cd /Users/ravisharma/Desktop/uxray

# Run the test script
./test-s3-upload.sh
```

**Expected outcome:** All tests should pass. If not, follow the error messages.

### Step 2: Rebuild Backend

```bash
cd /Users/ravisharma/Desktop/uxray/backend

# Clean and rebuild
mvn clean package

# Should see: [INFO] BUILD SUCCESS
```

### Step 3: Restart Backend and Monitor Logs

```bash
# Start backend with logging
java -jar target/backend-0.0.1-SNAPSHOT.jar | tee backend.log
```

In another terminal, watch for S3 logs:
```bash
tail -f backend.log | grep -E "S3|upload|StorageService|Adding screenshot"
```

### Step 4: Trigger a New Crawl Job

1. Make sure all services are running:
   ```bash
   ./start-all-services.sh
   ```

2. Open frontend: http://localhost:3000

3. Create a new crawl job (e.g., crawl `https://example.com`)

4. Watch the backend logs

### Step 5: Verify What You Should See

**In backend logs, you should see:**
```
Adding screenshot for job=xxx, pageUrl=https://example.com, hasImageBinary=true
Image binary data present, attempting S3 upload for file: 1-1.png
Attempting to upload to S3: bucket=heatmap.e2shub, key=screenshots/example.com/1-1.png, size=12345 bytes
Successfully uploaded to S3: key=screenshots/example.com/1-1.png, publicUrl=https://...
Screenshot uploaded successfully: key=screenshots/example.com/1-1.png
```

**If you see this instead:**
```
Adding screenshot for job=xxx, pageUrl=https://example.com, hasImageBinary=false
No image binary data provided for screenshot.
```
→ This means the crawler is NOT sending base64 data. See "Issue: No Base64 Data" below.

### Step 6: Verify Files in S3

```bash
# List screenshots in S3
aws s3 ls s3://heatmap.e2shub/screenshots/ --recursive

# Count files
aws s3 ls s3://heatmap.e2shub/screenshots/ --recursive | wc -l
```

### Step 7: Check Database

```bash
mysql -u root -p uxray -e "
SELECT 
    SUBSTRING(id, 1, 8) as id,
    SUBSTRING(page_url, 1, 40) as url,
    image_storage_path,
    image_public_url
FROM screenshot 
ORDER BY created_at DESC 
LIMIT 5;
"
```

**Good result:**
```
image_storage_path: screenshots/example.com/1-1.png
image_public_url: https://d2sdbrggjmki87.cloudfront.net/screenshots/example.com/1-1.png
```

**Bad result:**
```
image_storage_path: job-id/1-1.png
image_public_url: NULL
```

---

## Common Issues and Quick Fixes

### Issue: AWS Credentials Invalid

**Symptoms:**
```
Failed to upload to S3: ... Access Denied
```

**Fix:**
1. Get your AWS secret access key
2. Configure AWS CLI:
   ```bash
   aws configure set aws_access_key_id AKIAX7PA4PKOVP7JDRK2
   aws configure set aws_secret_access_key YOUR_SECRET_KEY
   aws configure set default.region ap-south-1
   ```
3. Test: `aws sts get-caller-identity`
4. Restart backend

### Issue: No Base64 Data Being Sent

**Symptoms:**
```
No image binary data provided for screenshot
```

**Fix:**
Check that `crawler/src/crawler.js` is sending the base64 data:

```javascript
// Around line 96-104 in crawler.js
await api.addScreenshot(jobId, currentUrl, {
    imageStoragePath: storagePath,
    imageBase64: s.base64,  // ← Must be here
    imageFileName: fileName,
    imageContentType: 'image/png'
});
```

If `s.base64` is missing, check that `captureMultipleScreenshots` is returning it:

```javascript
// Around line 36 in crawler.js
const base64 = await page.screenshot({ 
    path: screenshotPath, 
    encoding: 'base64'  // ← Must be here
});
screenshots.push({ 
    path: screenshotPath, 
    num: i + 1, 
    base64  // ← Must be here
});
```

### Issue: S3 Bucket Doesn't Exist

**Symptoms:**
```
NoSuchBucket: The specified bucket does not exist
```

**Fix:**
```bash
aws s3 mb s3://heatmap.e2shub --region ap-south-1
```

### Issue: Files Upload but URLs Don't Work (403 Forbidden)

**Symptoms:**
- Files are in S3
- URLs return 403 Forbidden

**Fix:**
```bash
# Make bucket publicly readable
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

Or check CloudFront distribution settings if using CDN.

### Issue: IAM User Lacks S3 Permissions

**Symptoms:**
```
Access Denied (403) when uploading to S3
```

**Fix:**
1. Go to AWS Console → IAM → Users → dryno-ai
2. Click "Add permissions" → "Create inline policy"
3. Use JSON and paste:
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
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
}
```
4. Name it "S3UploadPolicy" and create

---

## Files Modified

### Backend Files
- ✅ `backend/src/main/resources/application.yml`
  - Fixed AWS configuration
  - Removed invalid role ARN
  - Fixed CDN URL

- ✅ `backend/src/main/java/com/dryno/backend/storage/StorageService.java`
  - Added logging for S3 uploads
  - Added error handling

- ✅ `backend/src/main/java/com/dryno/backend/service/JobService.java`
  - Added logging for screenshot additions
  - Track image binary presence

### New Files Created
- ✅ `AWS_S3_UPLOAD_FIX.md` - Comprehensive fix guide
- ✅ `S3_TROUBLESHOOTING_CHECKLIST.md` - Step-by-step checklist
- ✅ `test-s3-upload.sh` - AWS/S3 test script
- ✅ `diagnose-upload-issue.sh` - System diagnostic script
- ✅ `S3_FIX_SUMMARY.md` - This file

---

## Quick Diagnostic

Run this one command to check everything:

```bash
./diagnose-upload-issue.sh
```

This will check:
- ✅ Local screenshots
- ✅ AWS credentials
- ✅ S3 bucket access
- ✅ Backend service status
- ✅ Crawler service status
- ✅ RabbitMQ status
- ✅ Database screenshot records
- ✅ Configuration files

---

## What to Share if Still Not Working

If you're still having issues after following the steps above, share:

1. **Output of diagnostic script:**
   ```bash
   ./diagnose-upload-issue.sh > diagnostic-output.txt
   ```

2. **Backend logs showing S3 upload attempts:**
   ```bash
   # From backend logs, share lines containing:
   grep -E "Adding screenshot|Image binary|Attempting to upload|Successfully uploaded|Failed to upload" backend.log
   ```

3. **AWS credentials test:**
   ```bash
   aws sts get-caller-identity
   ```

4. **S3 test:**
   ```bash
   ./test-s3-upload.sh > s3-test-output.txt
   ```

---

## Expected Behavior After Fix

Once working correctly:

1. **Crawler** captures screenshots and generates base64 data
2. **Crawler** sends base64 data to backend via API
3. **Backend** receives request and logs: "Adding screenshot... hasImageBinary=true"
4. **Backend** decodes base64 and uploads to S3
5. **Backend** logs: "Successfully uploaded to S3: key=... publicUrl=..."
6. **Backend** saves screenshot record with S3 URL in database
7. **Frontend** displays images from CloudFront/S3 URL

You can verify by:
- Checking backend logs for successful upload messages
- Listing files in S3: `aws s3 ls s3://heatmap.e2shub/screenshots/ --recursive`
- Checking database for public URLs
- Opening image URLs in browser

---

## Contact/Support

If you need help:
1. Share the diagnostic output
2. Share backend logs (especially S3-related lines)
3. Share any error messages you see
4. Mention which step failed in the troubleshooting process

Good luck! 🚀

