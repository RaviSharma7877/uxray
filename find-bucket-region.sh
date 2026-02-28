#!/bin/bash

# Find the region where S3 bucket actually exists

BUCKET_NAME="heatmap.e2shub"

echo "Finding region for bucket: $BUCKET_NAME"
echo ""

# Method 1: Using aws s3api get-bucket-location
echo "Method 1: Using get-bucket-location..."
REGION=$(aws s3api get-bucket-location --bucket $BUCKET_NAME --output text 2>/dev/null)

if [ $? -eq 0 ]; then
    # AWS returns "None" for us-east-1 buckets
    if [ "$REGION" == "None" ] || [ -z "$REGION" ]; then
        echo "✓ Bucket is in region: us-east-1"
        echo ""
        echo "Update your application.yml:"
        echo "  default-region: us-east-1"
    else
        echo "✓ Bucket is in region: $REGION"
        echo ""
        echo "Update your application.yml:"
        echo "  default-region: $REGION"
    fi
else
    echo "✗ Could not determine bucket location"
    echo ""
    echo "Trying alternative method..."
    
    # Method 2: Try different common regions
    echo ""
    echo "Method 2: Checking common regions..."
    
    REGIONS=("us-east-1" "us-east-2" "us-west-1" "us-west-2" "ap-south-1" "ap-southeast-1" "eu-west-1" "eu-central-1")
    
    for region in "${REGIONS[@]}"; do
        echo -n "Trying $region... "
        if aws s3api head-bucket --bucket $BUCKET_NAME --region $region 2>/dev/null; then
            echo "✓ FOUND!"
            echo ""
            echo "Bucket '$BUCKET_NAME' is in region: $region"
            echo ""
            echo "Update your application.yml:"
            echo "  default-region: $region"
            exit 0
        else
            echo "✗"
        fi
    done
    
    echo ""
    echo "Could not find bucket in common regions."
    echo "The bucket might not exist or you don't have access."
fi

