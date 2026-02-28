package com.dryno.backend.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;

import java.util.List;

public class ClarityInsightsUpdateRequest {

    private Integer totalSessions;
    private Integer totalRecordings;
    private Integer activeUsers;
    private Double averageEngagementSeconds;
    private Double averageScrollDepth;
    private Integer rageClicks;
    private Integer deadClicks;
    private Integer quickBacks;
    private List<@Valid ClarityIssue> topIssues;
    private List<@Valid ClarityHeatmap> heatmaps;
    private List<@Valid ClaritySession> standoutSessions;
    private List<@Valid TrafficSource> trafficSources;
    private List<@Valid BrowserInfo> browsers;
    private List<@Valid DeviceInfo> devices;
    private List<@Valid OperatingSystemInfo> operatingSystems;
    private List<@Valid CountryInfo> countries;
    private List<@Valid PageTitleInfo> pageTitles;
    private PerformanceMetrics performanceMetrics;
    private List<@Valid DiagnosticEvent> diagnosticEvents;
    private PageEvents pageEvents;
    private List<@Valid CustomEvent> customEvents;

    public Integer getTotalSessions() {
        return totalSessions;
    }

    public void setTotalSessions(Integer totalSessions) {
        this.totalSessions = totalSessions;
    }

    public Integer getTotalRecordings() {
        return totalRecordings;
    }

    public void setTotalRecordings(Integer totalRecordings) {
        this.totalRecordings = totalRecordings;
    }

    public Integer getActiveUsers() {
        return activeUsers;
    }

    public void setActiveUsers(Integer activeUsers) {
        this.activeUsers = activeUsers;
    }

    public Double getAverageEngagementSeconds() {
        return averageEngagementSeconds;
    }

    public void setAverageEngagementSeconds(Double averageEngagementSeconds) {
        this.averageEngagementSeconds = averageEngagementSeconds;
    }

    public Double getAverageScrollDepth() {
        return averageScrollDepth;
    }

    public void setAverageScrollDepth(Double averageScrollDepth) {
        this.averageScrollDepth = averageScrollDepth;
    }

    public Integer getRageClicks() {
        return rageClicks;
    }

    public void setRageClicks(Integer rageClicks) {
        this.rageClicks = rageClicks;
    }

    public Integer getDeadClicks() {
        return deadClicks;
    }

    public void setDeadClicks(Integer deadClicks) {
        this.deadClicks = deadClicks;
    }

    public Integer getQuickBacks() {
        return quickBacks;
    }

    public void setQuickBacks(Integer quickBacks) {
        this.quickBacks = quickBacks;
    }

    public List<ClarityIssue> getTopIssues() {
        return topIssues;
    }

    public void setTopIssues(List<ClarityIssue> topIssues) {
        this.topIssues = topIssues;
    }

    public List<ClarityHeatmap> getHeatmaps() {
        return heatmaps;
    }

    public void setHeatmaps(List<ClarityHeatmap> heatmaps) {
        this.heatmaps = heatmaps;
    }

    public List<ClaritySession> getStandoutSessions() {
        return standoutSessions;
    }

    public void setStandoutSessions(List<ClaritySession> standoutSessions) {
        this.standoutSessions = standoutSessions;
    }

    public List<TrafficSource> getTrafficSources() {
        return trafficSources;
    }

    public void setTrafficSources(List<TrafficSource> trafficSources) {
        this.trafficSources = trafficSources;
    }

    public List<BrowserInfo> getBrowsers() {
        return browsers;
    }

    public void setBrowsers(List<BrowserInfo> browsers) {
        this.browsers = browsers;
    }

    public List<DeviceInfo> getDevices() {
        return devices;
    }

    public void setDevices(List<DeviceInfo> devices) {
        this.devices = devices;
    }

    public List<OperatingSystemInfo> getOperatingSystems() {
        return operatingSystems;
    }

    public void setOperatingSystems(List<OperatingSystemInfo> operatingSystems) {
        this.operatingSystems = operatingSystems;
    }

    public List<CountryInfo> getCountries() {
        return countries;
    }

    public void setCountries(List<CountryInfo> countries) {
        this.countries = countries;
    }

    public List<PageTitleInfo> getPageTitles() {
        return pageTitles;
    }

    public void setPageTitles(List<PageTitleInfo> pageTitles) {
        this.pageTitles = pageTitles;
    }

    public PerformanceMetrics getPerformanceMetrics() {
        return performanceMetrics;
    }

    public void setPerformanceMetrics(PerformanceMetrics performanceMetrics) {
        this.performanceMetrics = performanceMetrics;
    }

    public List<DiagnosticEvent> getDiagnosticEvents() {
        return diagnosticEvents;
    }

    public void setDiagnosticEvents(List<DiagnosticEvent> diagnosticEvents) {
        this.diagnosticEvents = diagnosticEvents;
    }

    public PageEvents getPageEvents() {
        return pageEvents;
    }

    public void setPageEvents(PageEvents pageEvents) {
        this.pageEvents = pageEvents;
    }

    public List<CustomEvent> getCustomEvents() {
        return customEvents;
    }

    public void setCustomEvents(List<CustomEvent> customEvents) {
        this.customEvents = customEvents;
    }

    public record ClarityIssue(
            @Size(max = 256) String title,
            @Size(max = 128) String metric,
            @Size(max = 64) String severity,
            @Size(max = 2000) String url,
            Double value,
            @Size(max = 512) String description
    ) {}

    public record ClarityHeatmap(
            @Size(max = 2000) String pageUrl,
            Integer views,
            Double clickRate,
            Double scrollDepth,
            Double engagementTime
    ) {}

    public record ClaritySession(
            @Size(max = 64) String sessionId,
            @Size(max = 2000) String entryPage,
            @Size(max = 2000) String exitPage,
            Double durationSeconds,
            Integer interactions,
            @Size(max = 64) String device,
            @Size(max = 512) String notes
    ) {}

    public record TrafficSource(
            @Size(max = 256) String source,
            @Size(max = 64) String medium,
            Integer sessionsCount,
            Double percentage
    ) {}

    public record BrowserInfo(
            @Size(max = 128) String name,
            Integer sessionsCount,
            Double percentage
    ) {}

    public record DeviceInfo(
            @Size(max = 64) String type,
            Integer sessionsCount,
            Double percentage
    ) {}

    public record OperatingSystemInfo(
            @Size(max = 128) String name,
            Integer sessionsCount,
            Double percentage
    ) {}

    public record CountryInfo(
            @Size(max = 128) String name,
            Integer sessionsCount,
            Double percentage
    ) {}

    public record PageTitleInfo(
            @Size(max = 512) String title,
            Integer sessionsCount,
            Double percentage
    ) {}

    public record PerformanceMetrics(
            Integer botSessions,
            Double pagesPerSession,
            Integer totalTime,
            Integer activeTime
    ) {}

    public record DiagnosticEvent(
            @Size(max = 128) String eventType,
            Integer count,
            Integer sessionsAffected,
            Double percentage,
            Object details
    ) {}

    public record PageEvents(
            Object documentSizes,
            Object pageVisibility,
            Object pageUnload
    ) {}

    public record CustomEvent(
            @Size(max = 256) String eventName,
            Integer count,
            Object variables
    ) {}
}

