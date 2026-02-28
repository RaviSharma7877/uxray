package com.dryno.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.util.StringUtils;

@ConfigurationProperties(prefix = "storage")
public class StorageProperties {

    private String bucketName = "heatmap.e2shub";
    private String screenshotPrefix = "screenshots";
    private String heatmapPrefix = "heatmap";
    private String designPrefix = "designs";
    private boolean useDomainFolders = true;
    private String cdnBaseUrl;
    private int maxFileSizeMb = 5000;

    public String getBucketName() {
        return bucketName;
    }

    public void setBucketName(String bucketName) {
        this.bucketName = bucketName;
    }

    public String getScreenshotPrefix() {
        return screenshotPrefix;
    }

    public void setScreenshotPrefix(String screenshotPrefix) {
        this.screenshotPrefix = screenshotPrefix;
    }

    public String getHeatmapPrefix() {
        return heatmapPrefix;
    }

    public void setHeatmapPrefix(String heatmapPrefix) {
        this.heatmapPrefix = heatmapPrefix;
    }

    public String getDesignPrefix() {
        return designPrefix;
    }

    public void setDesignPrefix(String designPrefix) {
        this.designPrefix = designPrefix;
    }

    public boolean isUseDomainFolders() {
        return useDomainFolders;
    }

    public void setUseDomainFolders(boolean useDomainFolders) {
        this.useDomainFolders = useDomainFolders;
    }

    public String getCdnBaseUrl() {
        return cdnBaseUrl;
    }

    public void setCdnBaseUrl(String cdnBaseUrl) {
        this.cdnBaseUrl = StringUtils.hasText(cdnBaseUrl) ? cdnBaseUrl.trim().replaceAll("/+$", "") : null;
    }

    public int getMaxFileSizeMb() {
        return maxFileSizeMb;
    }

    public void setMaxFileSizeMb(int maxFileSizeMb) {
        this.maxFileSizeMb = maxFileSizeMb;
    }
}
