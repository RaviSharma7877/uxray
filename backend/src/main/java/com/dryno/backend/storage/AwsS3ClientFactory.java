package com.dryno.backend.storage;

import com.dryno.backend.config.AwsProperties;
import jakarta.annotation.PreDestroy;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.AwsCredentialsProvider;
import software.amazon.awssdk.auth.credentials.AwsSessionCredentials;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.sts.StsClient;
import software.amazon.awssdk.services.sts.auth.StsAssumeRoleCredentialsProvider;

@Component
public class AwsS3ClientFactory {

    private final AwsProperties awsProperties;
    private final Region region;
    private final S3Client s3Client;
    private final StsClient stsClient;

    public AwsS3ClientFactory(AwsProperties awsProperties) {
        this.awsProperties = awsProperties;
        this.region = Region.of(awsProperties.getDefaultRegion());

        AwsCredentialsProvider baseProvider = buildBaseProvider();
        StsClient tempStsClient = null;
        AwsCredentialsProvider finalProvider = baseProvider;

        if (isAssumeRoleMode() && StringUtils.hasText(awsProperties.getSts().getRoleArn())) {
            tempStsClient = StsClient.builder()
                    .region(region)
                    .credentialsProvider(baseProvider)
                    .build();
            finalProvider = StsAssumeRoleCredentialsProvider.builder()
                    .stsClient(tempStsClient)
                    .refreshRequest(builder -> {
                        builder.roleArn(awsProperties.getSts().getRoleArn());
                        builder.roleSessionName("uxray-storage-session");
                        builder.durationSeconds(awsProperties.getSts().getSessionDurationSeconds());
                        if (StringUtils.hasText(awsProperties.getSts().getExternalId())) {
                            builder.externalId(awsProperties.getSts().getExternalId());
                        }
                    })
                    .build();
        }

        this.stsClient = tempStsClient;
        this.s3Client = S3Client.builder()
                .region(region)
                .credentialsProvider(finalProvider)
                .build();
    }

    public S3Client getClient() {
        return s3Client;
    }

    public Region getRegion() {
        return region;
    }

    private boolean isAssumeRoleMode() {
        return "assume-role".equalsIgnoreCase(awsProperties.getMode());
    }

    private AwsCredentialsProvider buildBaseProvider() {
        String accessKeyId = awsProperties.getBase().getAccessKeyId();
        String secretAccessKey = awsProperties.getBase().getSecretAccessKey();
        String sessionToken = awsProperties.getBase().getSessionToken();
        if (StringUtils.hasText(accessKeyId) && StringUtils.hasText(secretAccessKey)) {
            if (StringUtils.hasText(sessionToken)) {
                return StaticCredentialsProvider.create(
                        AwsSessionCredentials.create(accessKeyId.trim(), secretAccessKey.trim(), sessionToken.trim())
                );
            }
            return StaticCredentialsProvider.create(
                    AwsBasicCredentials.create(accessKeyId.trim(), secretAccessKey.trim())
            );
        }
        return DefaultCredentialsProvider.create();
    }

    @PreDestroy
    public void close() {
        if (s3Client != null) {
            s3Client.close();
        }
        if (stsClient != null) {
            stsClient.close();
        }
    }
}
