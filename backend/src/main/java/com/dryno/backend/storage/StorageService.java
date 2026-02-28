package com.dryno.backend.storage;

import com.dryno.backend.config.AwsProperties;
import com.dryno.backend.config.StorageProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetUrlRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.InputStream;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.URL;
import java.text.Normalizer;
import java.util.Locale;
import java.util.UUID;

@Service
public class StorageService {

    private static final Logger log = LoggerFactory.getLogger(StorageService.class);

    private final AwsS3ClientFactory clientFactory;
    private final StorageProperties storageProperties;
    private final AwsProperties awsProperties;

    public StorageService(AwsS3ClientFactory clientFactory,
                          StorageProperties storageProperties,
                          AwsProperties awsProperties) {
        this.clientFactory = clientFactory;
        this.storageProperties = storageProperties;
        this.awsProperties = awsProperties;
    }

    public StoredObject storeScreenshot(InputStream data, long contentLength, String domain, String objectName, String contentType) {
        return store(data, contentLength, domain, objectName, contentType, storageProperties.getScreenshotPrefix());
    }

    public StoredObject storeHeatmap(InputStream data, long contentLength, String domain, String objectName, String contentType) {
        return store(data, contentLength, domain, objectName, contentType, storageProperties.getHeatmapPrefix());
    }

    public StoredObject storeDesignFile(InputStream data, long contentLength, String domain, String objectName, String contentType) {
        return store(data, contentLength, domain, objectName, contentType, storageProperties.getDesignPrefix());
    }

    private StoredObject store(InputStream data,
                               long contentLength,
                               String domain,
                               String objectName,
                               String contentType,
                               String prefix) {
        validateSize(contentLength);
        String key = buildObjectKey(prefix, domain, objectName);

        log.info("Attempting to upload to S3: bucket={}, key={}, size={} bytes, contentType={}", 
                 storageProperties.getBucketName(), key, contentLength, contentType);

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
            String publicUrl = buildPublicUrl(s3, key);
            log.info("Successfully uploaded to S3: key={}, publicUrl={}", key, publicUrl);
            return new StoredObject(key, publicUrl);
        } catch (Exception ex) {
            log.error("Failed to upload to S3: bucket={}, key={}, error={}", 
                     storageProperties.getBucketName(), key, ex.getMessage(), ex);
            throw ex;
        }
    }

    private void validateSize(long contentLength) {
        long maxBytes = storageProperties.getMaxFileSizeMb() * 1024L * 1024L;
        if (contentLength > maxBytes) {
            throw new IllegalArgumentException("File exceeds configured max size of " + storageProperties.getMaxFileSizeMb() + " MB");
        }
    }

    private String buildObjectKey(String prefix, String domain, String objectName) {
        StringBuilder key = new StringBuilder();
        if (StringUtils.hasText(prefix)) {
            key.append(stripSlashes(prefix));
        }
        if (storageProperties.isUseDomainFolders()) {
            String sanitizedDomain = sanitizeDomain(domain);
            if (StringUtils.hasText(sanitizedDomain)) {
                if (key.length() > 0) {
                    key.append('/');
                }
                key.append(sanitizedDomain);
            }
        }
        String sanitizedObjectName = sanitizeObjectName(objectName);
        if (key.length() > 0) {
            key.append('/');
        }
        key.append(sanitizedObjectName);
        return key.toString();
    }

    private String sanitizeDomain(String domain) {
        if (!StringUtils.hasText(domain)) {
            return "unknown";
        }
        String trimmed = domain.trim();
        String hostCandidate = trimmed;
        try {
            if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
                URI uri = new URI(trimmed);
                if (StringUtils.hasText(uri.getHost())) {
                    hostCandidate = uri.getHost();
                }
            }
        } catch (URISyntaxException ignored) {
        }

        String lower = hostCandidate.toLowerCase(Locale.ROOT);
        String sanitized = lower.replaceAll("[^a-z0-9.-]", "-");
        sanitized = sanitized.replaceAll("-{2,}", "-");
        sanitized = sanitized.replaceAll("^-|-$", "");
        return StringUtils.hasText(sanitized) ? sanitized : "unknown";
    }

    private String sanitizeObjectName(String objectName) {
        String candidate = StringUtils.hasText(objectName) ? objectName : UUID.randomUUID() + ".bin";
        String normalized = Normalizer.normalize(candidate, Normalizer.Form.NFKC);
        String sanitized = normalized.replaceAll("[^a-zA-Z0-9._-]", "-");
        sanitized = sanitized.replaceAll("-{2,}", "-");
        sanitized = sanitized.replaceAll("^-|-$", "");
        return StringUtils.hasText(sanitized) ? sanitized : UUID.randomUUID() + ".bin";
    }

    private String stripSlashes(String value) {
        String trimmed = value.trim();
        trimmed = trimmed.replaceAll("^/+", "");
        return trimmed.replaceAll("/+$", "");
    }

    private String buildPublicUrl(S3Client s3, String key) {
        if (StringUtils.hasText(storageProperties.getCdnBaseUrl())) {
            return storageProperties.getCdnBaseUrl() + "/" + key;
        }
        try {
            URL url = s3.utilities().getUrl(GetUrlRequest.builder()
                    .bucket(storageProperties.getBucketName())
                    .key(key)
                    .build());
            return url.toExternalForm();
        } catch (RuntimeException ex) {
            return "https://" + storageProperties.getBucketName()
                    + ".s3." + awsProperties.getDefaultRegion()
                    + ".amazonaws.com/" + key;
        }
    }

    public String publicUrl(String key) {
        if (!StringUtils.hasText(key)) {
            return null;
        }
        try {
            return buildPublicUrl(clientFactory.getClient(), stripSlashes(key));
        } catch (RuntimeException ex) {
            return null;
        }
    }
}
