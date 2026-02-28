package com.dryno.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

@ConfigurationProperties(prefix = "app.clarity")
public class ClarityProperties {

    /**
     * Toggles the Clarity integration without redeploying code.
     */
    private boolean enabled = false;

    /**
     * Microsoft Clarity project identifier (GUID).
     */
    private String projectId;

    /**
     * API key issued from the Clarity portal (Project settings → API).
     */
    private String apiKey;

    /**
     * Base URL for the Clarity API. Defaults to the public SaaS endpoint.
     */
    private String baseUrl = "https://api.clarity.ms/v1";

    /**
     * Number of trailing days to request when pulling aggregates.
     */
    private int lookbackDays = 7;

    /**
     * Maximum number of issues/heatmaps/sessions to persist.
     */
    private int topEntries = 5;

    /**
     * Minimum duration between background refreshes per job.
     */
    private Duration refreshInterval = Duration.ofMinutes(15);

    public boolean isEnabled() {
        return enabled && projectId != null && !projectId.isBlank() && apiKey != null && !apiKey.isBlank();
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getProjectId() {
        return projectId;
    }

    public void setProjectId(String projectId) {
        this.projectId = projectId;
    }

    public String getApiKey() {
        return apiKey;
    }

    public void setApiKey(String apiKey) {
        this.apiKey = apiKey;
    }

    public String getBaseUrl() {
        return baseUrl;
    }

    public void setBaseUrl(String baseUrl) {
        this.baseUrl = baseUrl;
    }

    public int getLookbackDays() {
        return lookbackDays;
    }

    public void setLookbackDays(int lookbackDays) {
        this.lookbackDays = lookbackDays;
    }

    public int getTopEntries() {
        return topEntries;
    }

    public void setTopEntries(int topEntries) {
        this.topEntries = topEntries;
    }

    public Duration getRefreshInterval() {
        return refreshInterval;
    }

    public void setRefreshInterval(Duration refreshInterval) {
        this.refreshInterval = refreshInterval;
    }
}

