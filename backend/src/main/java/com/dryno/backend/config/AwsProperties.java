package com.dryno.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.aws")
public class AwsProperties {

    private String mode = "static";
    private String defaultRegion = "ap-south-1";
    private final Base base = new Base();
    private final Sts sts = new Sts();

    public String getMode() {
        return mode;
    }

    public void setMode(String mode) {
        this.mode = mode;
    }

    public String getDefaultRegion() {
        return defaultRegion;
    }

    public void setDefaultRegion(String defaultRegion) {
        this.defaultRegion = defaultRegion;
    }

    public Base getBase() {
        return base;
    }

    public Sts getSts() {
        return sts;
    }

    public static class Base {
        private String accessKeyId;
        private String secretAccessKey;
        private String sessionToken;

        public String getAccessKeyId() {
            return accessKeyId;
        }

        public void setAccessKeyId(String accessKeyId) {
            this.accessKeyId = accessKeyId;
        }

        public String getSecretAccessKey() {
            return secretAccessKey;
        }

        public void setSecretAccessKey(String secretAccessKey) {
            this.secretAccessKey = secretAccessKey;
        }

        public String getSessionToken() {
            return sessionToken;
        }

        public void setSessionToken(String sessionToken) {
            this.sessionToken = sessionToken;
        }
    }

    public static class Sts {
        private String roleArn;
        private String externalId;
        private int sessionDurationSeconds = 3600;

        public String getRoleArn() {
            return roleArn;
        }

        public void setRoleArn(String roleArn) {
            this.roleArn = roleArn;
        }

        public String getExternalId() {
            return externalId;
        }

        public void setExternalId(String externalId) {
            this.externalId = externalId;
        }

        public int getSessionDurationSeconds() {
            return sessionDurationSeconds;
        }

        public void setSessionDurationSeconds(int sessionDurationSeconds) {
            this.sessionDurationSeconds = sessionDurationSeconds;
        }
    }
}
