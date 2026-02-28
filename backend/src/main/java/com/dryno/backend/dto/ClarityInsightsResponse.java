package com.dryno.backend.dto;

import com.dryno.backend.domain.ClarityInsights;

import java.util.List;

public class ClarityInsightsResponse {

    private Integer totalSessions;
    private Integer totalRecordings;
    private Integer activeUsers;
    private Double averageEngagementSeconds;
    private Double averageScrollDepth;
    private Integer rageClicks;
    private Integer deadClicks;
    private Integer quickBacks;
    private List<ClarityIssue> topIssues;
    private List<ClarityHeatmap> heatmaps;
    private List<ClaritySession> standoutSessions;
    private List<TrafficSource> trafficSources;
    private List<BrowserInfo> browsers;
    private List<DeviceInfo> devices;
    private List<OperatingSystemInfo> operatingSystems;
    private List<CountryInfo> countries;
    private List<PageTitleInfo> pageTitles;
    private PerformanceMetrics performanceMetrics;
    private List<DiagnosticEvent> diagnosticEvents;
    private PageEvents pageEvents;
    private List<CustomEvent> customEvents;

    public static ClarityInsightsResponse from(ClarityInsights source) {
        if (source == null || source.isEmpty()) {
            return null;
        }
        ClarityInsightsResponse response = new ClarityInsightsResponse();
        response.totalSessions = source.getTotalSessions();
        response.totalRecordings = source.getTotalRecordings();
        response.activeUsers = source.getActiveUsers();
        response.averageEngagementSeconds = source.getAverageEngagementSeconds();
        response.averageScrollDepth = source.getAverageScrollDepth();
        response.rageClicks = source.getRageClicks();
        response.deadClicks = source.getDeadClicks();
        response.quickBacks = source.getQuickBacks();
        response.topIssues = source.getTopIssues().stream()
                .map(issue -> new ClarityIssue(
                        issue.title(),
                        issue.metric(),
                        issue.severity(),
                        issue.url(),
                        issue.value(),
                        issue.description()))
                .toList();
        response.heatmaps = source.getHeatmaps().stream()
                .map(heatmap -> new ClarityHeatmap(
                        heatmap.pageUrl(),
                        heatmap.views(),
                        heatmap.clickRate(),
                        heatmap.scrollDepth(),
                        heatmap.engagementTime()))
                .toList();
        response.standoutSessions = source.getStandoutSessions().stream()
                .map(session -> new ClaritySession(
                        session.sessionId(),
                        session.entryPage(),
                        session.exitPage(),
                        session.durationSeconds(),
                        session.interactions(),
                        session.device(),
                        session.notes()))
                .toList();
        // New detailed fields
        response.trafficSources = source.getTrafficSources().stream()
                .map(sourceItem -> new TrafficSource(
                        sourceItem.source(),
                        sourceItem.medium(),
                        sourceItem.sessionsCount(),
                        sourceItem.percentage()))
                .toList();
        response.browsers = source.getBrowsers().stream()
                .map(browser -> new BrowserInfo(
                        browser.name(),
                        browser.sessionsCount(),
                        browser.percentage()))
                .toList();
        response.devices = source.getDevices().stream()
                .map(device -> new DeviceInfo(
                        device.type(),
                        device.sessionsCount(),
                        device.percentage()))
                .toList();
        response.operatingSystems = source.getOperatingSystems().stream()
                .map(os -> new OperatingSystemInfo(
                        os.name(),
                        os.sessionsCount(),
                        os.percentage()))
                .toList();
        response.countries = source.getCountries().stream()
                .map(country -> new CountryInfo(
                        country.name(),
                        country.sessionsCount(),
                        country.percentage()))
                .toList();
        response.pageTitles = source.getPageTitles().stream()
                .map(page -> new PageTitleInfo(
                        page.title(),
                        page.sessionsCount(),
                        page.percentage()))
                .toList();
        if (source.getPerformanceMetrics() != null) {
            var perf = source.getPerformanceMetrics();
            response.performanceMetrics = new PerformanceMetrics(
                    perf.botSessions(),
                    perf.pagesPerSession(),
                    perf.totalTime(),
                    perf.activeTime());
        }
        response.diagnosticEvents = source.getDiagnosticEvents().stream()
                .map(event -> new DiagnosticEvent(
                        event.eventType(),
                        event.count(),
                        event.sessionsAffected(),
                        event.percentage(),
                        event.details()))
                .toList();
        if (source.getPageEvents() != null) {
            var pageEvents = source.getPageEvents();
            response.pageEvents = new PageEvents(
                    pageEvents.documentSizes(),
                    pageEvents.pageVisibility(),
                    pageEvents.pageUnload());
        }
        response.customEvents = source.getCustomEvents().stream()
                .map(event -> new CustomEvent(
                        event.eventName(),
                        event.count(),
                        event.variables()))
                .toList();
        return response;
    }

    public Integer getTotalSessions() {
        return totalSessions;
    }

    public Integer getTotalRecordings() {
        return totalRecordings;
    }

    public Integer getActiveUsers() {
        return activeUsers;
    }

    public Double getAverageEngagementSeconds() {
        return averageEngagementSeconds;
    }

    public Double getAverageScrollDepth() {
        return averageScrollDepth;
    }

    public Integer getRageClicks() {
        return rageClicks;
    }

    public Integer getDeadClicks() {
        return deadClicks;
    }

    public Integer getQuickBacks() {
        return quickBacks;
    }

    public List<ClarityIssue> getTopIssues() {
        return topIssues;
    }

    public List<ClarityHeatmap> getHeatmaps() {
        return heatmaps;
    }

    public List<ClaritySession> getStandoutSessions() {
        return standoutSessions;
    }

    public List<TrafficSource> getTrafficSources() {
        return trafficSources;
    }

    public List<BrowserInfo> getBrowsers() {
        return browsers;
    }

    public List<DeviceInfo> getDevices() {
        return devices;
    }

    public List<OperatingSystemInfo> getOperatingSystems() {
        return operatingSystems;
    }

    public List<CountryInfo> getCountries() {
        return countries;
    }

    public List<PageTitleInfo> getPageTitles() {
        return pageTitles;
    }

    public PerformanceMetrics getPerformanceMetrics() {
        return performanceMetrics;
    }

    public List<DiagnosticEvent> getDiagnosticEvents() {
        return diagnosticEvents;
    }

    public PageEvents getPageEvents() {
        return pageEvents;
    }

    public List<CustomEvent> getCustomEvents() {
        return customEvents;
    }

    public record ClarityIssue(String title,
                              String metric,
                              String severity,
                              String url,
                              Double value,
                              String description) {
    }

    public record ClarityHeatmap(String pageUrl,
                                Integer views,
                                Double clickRate,
                                Double scrollDepth,
                                Double engagementTime) {
    }

    public record ClaritySession(String sessionId,
                                String entryPage,
                                String exitPage,
                                Double durationSeconds,
                                Integer interactions,
                                String device,
                                String notes) {
    }

    public record TrafficSource(String source,
                               String medium,
                               Integer sessionsCount,
                               Double percentage) {
    }

    public record BrowserInfo(String name,
                             Integer sessionsCount,
                             Double percentage) {
    }

    public record DeviceInfo(String type,
                            Integer sessionsCount,
                            Double percentage) {
    }

    public record OperatingSystemInfo(String name,
                                     Integer sessionsCount,
                                     Double percentage) {
    }

    public record CountryInfo(String name,
                             Integer sessionsCount,
                             Double percentage) {
    }

    public record PageTitleInfo(String title,
                               Integer sessionsCount,
                               Double percentage) {
    }

    public record PerformanceMetrics(Integer botSessions,
                                    Double pagesPerSession,
                                    Integer totalTime,
                                    Integer activeTime) {
    }

    public record DiagnosticEvent(String eventType,
                                Integer count,
                                Integer sessionsAffected,
                                Double percentage,
                                Object details) {
    }

    public record PageEvents(Object documentSizes,
                            Object pageVisibility,
                            Object pageUnload) {
    }

    public record CustomEvent(String eventName,
                             Integer count,
                             Object variables) {
    }
}
