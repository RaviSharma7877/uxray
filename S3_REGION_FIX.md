# S3 Region Mismatch Fix (HTTP 301 Error)

## The Error

```
S3Exception: The bucket you are attempting to access must be addressed using 
the specified endpoint. Please send all future requests to this endpoint. 
(Service: S3, Status Code: 301)
```

**What this means:** Your bucket either:
1. Doesn't exist in the region you specified (`ap-south-1`)
2. Doesn't exist at all
3. Has a name with dots that causes endpoint issues

---

## Solution 1: Find and Use the Correct Region

### Step 1: Check if bucket exists

Run this command to list all your S3 buckets:

```bash
aws s3 ls
```

Look for `heatmap.e2shub` in the list.

### Step 2: Find the bucket's region

```bash
# Replace BUCKET_NAME with your actual bucket name
aws s3api get-bucket-location --bucket heatmap.e2shub

# Output examples:
# us-east-1 buckets return: None or null
# Other regions return: "eu-west-1", "ap-south-1", etc.
```

### Step 3: Update application.yml with the correct region

Once you know the region, update your `backend/src/main/resources/application.yml`:

```yaml
app:
  aws:
    default-region: us-east-1  # Change to your bucket's actual region
```

Common regions:
- `us-east-1` - US East (N. Virginia) - Default region
- `us-east-2` - US East (Ohio)
- `us-west-1` - US West (N. California)  
- `us-west-2` - US West (Oregon)
- `ap-south-1` - Asia Pacific (Mumbai)
- `ap-southeast-1` - Asia Pacific (Singapore)
- `eu-west-1` - Europe (Ireland)
- `eu-central-1` - Europe (Frankfurt)

---

## Solution 2: Create the Bucket in ap-south-1

If the bucket doesn't exist, create it in your desired region:

```bash
# Create bucket in ap-south-1
aws s3 mb s3://heatmap.e2shub --region ap-south-1
```

**Note:** S3 bucket names with dots (like `heatmap.e2shub`) can cause SSL issues. Consider using a bucket name without dots.

---

## Solution 3: Use a Bucket Name Without Dots (RECOMMENDED)

Bucket names with dots can cause problems with SSL/TLS certificate validation.

### Option A: Create new bucket without dots

```bash
# Create a bucket with dashes instead of dots
aws s3 mb s3://heatmap-e2shub --region ap-south-1

# Or use a simpler name
aws s3 mb s3://uxray-screenshots --region ap-south-1
```

Then update `application.yml`:

```yaml
storage:
  bucket-name: uxray-screenshots  # No dots!
```

### Option B: Keep the bucket name but disable SSL verification (NOT RECOMMENDED)

This is a workaround but less secure:

Update `AwsS3ClientFactory.java` to use path-style access:

```java
this.s3Client = S3Client.builder()
        .region(region)
        .credentialsProvider(finalProvider)
        .forcePathStyle(true)  // Add this line
        .build();
```

---

## Solution 4: Configure S3 Client for Path-Style Access

The safest fix for buckets with dots is to use path-style access instead of virtual-hosted-style.

### Update AwsS3ClientFactory.java

Add path-style configuration:

```java
this.s3Client = S3Client.builder()
        .region(region)
        .credentialsProvider(finalProvider)
        .serviceConfiguration(S3Configuration.builder()
                .pathStyleAccessEnabled(true)
                .build())
        .build();
```

You'll need to import:
```java
import software.amazon.awssdk.services.s3.S3Configuration;
```

---

## Quick Fix Steps

### If bucket doesn't exist:

1. **Create bucket in ap-south-1 with a better name:**
   ```bash
   aws s3 mb s3://uxray-screenshots --region ap-south-1
   ```

2. **Update application.yml:**
   ```yaml
   storage:
     bucket-name: uxray-screenshots
   ```

3. **Rebuild and restart:**
   ```bash
   cd backend
   mvn clean package
   java -jar target/backend-0.0.1-SNAPSHOT.jar
   ```

### If bucket exists in different region:

1. **Find the region:**
   ```bash
   aws s3api get-bucket-location --bucket heatmap.e2shub
   ```

2. **Update application.yml:**
   ```yaml
   app:
     aws:
       default-region: YOUR_BUCKET_REGION  # e.g., us-east-1
   ```

3. **Rebuild and restart:**
   ```bash
   cd backend
   mvn clean package
   java -jar target/backend-0.0.1-SNAPSHOT.jar
   ```

---

## Verify the Fix

After making changes:

1. **Test bucket access:**
   ```bash
   aws s3 ls s3://YOUR_BUCKET_NAME/ --region YOUR_REGION
   ```

2. **Restart backend and watch logs:**
   ```bash
   java -jar backend/target/backend-0.0.1-SNAPSHOT.jar | grep -E "S3|upload"
   ```

3. **Trigger a crawl job**

4. **Check for successful upload:**
   ```bash
   aws s3 ls s3://YOUR_BUCKET_NAME/screenshots/ --recursive
   ```

You should see:
```
✓ Successfully uploaded to S3: key=screenshots/...
```

Instead of:
```
✗ S3Exception: The bucket you are attempting to access must be addressed...
```

---

## Best Practice: Bucket Naming

✅ **Good bucket names:**
- `uxray-screenshots`
- `my-app-images`
- `company-heatmaps-prod`

❌ **Problematic bucket names:**
- `heatmap.e2shub` (has dots - SSL issues)
- `my_bucket` (has underscores)
- `MyBucket` (has uppercase)

**Rules:**
- Only lowercase letters, numbers, and hyphens
- Must start and end with letter or number
- 3-63 characters long
- No dots (to avoid SSL issues)

---

## What I Recommend

**Recommended Solution:**

1. Create a new bucket without dots:
   ```bash
   aws s3 mb s3://uxray-screenshots --region ap-south-1
   ```

2. Update `application.yml`:
   ```yaml
   storage:
     bucket-name: uxray-screenshots
   ```

3. If you need the bucket public, set the policy:
   ```bash
   aws s3api put-bucket-policy --bucket uxray-screenshots --policy '{
     "Version": "2012-10-17",
     "Statement": [{
       "Sid": "PublicReadGetObject",
       "Effect": "Allow",
       "Principal": "*",
       "Action": "s3:GetObject",
       "Resource": "arn:aws:s3:::uxray-screenshots/*"
     }]
   }'
   ```

4. Rebuild and restart backend

5. Test with a new crawl job

This will avoid all SSL and region issues.

