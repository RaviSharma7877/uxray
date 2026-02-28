package com.dryno.backend.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Embeddable
public class ClarityInsights {

    @Column(name = "clarity_total_sessions")
    private Integer totalSessions;

    @Column(name = "clarity_total_recordings")
    private Integer totalRecordings;

    @Column(name = "clarity_active_users")
    private Integer activeUsers;

    @Column(name = "clarity_avg_engagement")
    private Double averageEngagementSeconds;

    @Column(name = "clarity_avg_scroll_depth")
    private Double averageScrollDepth;

    @Column(name = "clarity_rage_clicks")
    private Integer rageClicks;

    @Column(name = "clarity_dead_clicks")
    private Integer deadClicks;

    @Column(name = "clarity_quick_backs")
    private Integer quickBacks;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "clarity_top_issues", columnDefinition = "JSON")
    private List<ClarityInsight> topIssues = new ArrayList<>();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "clarity_heatmaps", columnDefinition = "JSON")
    private List<ClarityHeatmap> heatmaps = new ArrayList<>();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "clarity_sessions", columnDefinition = "JSON")
    private List<ClaritySession> standoutSessions = new ArrayList<>();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "clarity_traffic_sources", columnDefinition = "JSON")
    private List<TrafficSource> trafficSources = new ArrayList<>();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "clarity_browsers", columnDefinition = "JSON")
    private List<BrowserInfo> browsers = new ArrayList<>();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "clarity_devices", columnDefinition = "JSON")
    private List<DeviceInfo> devices = new ArrayList<>();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "clarity_operating_systems", columnDefinition = "JSON")
    private List<OperatingSystemInfo> operatingSystems = new ArrayList<>();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "clarity_countries", columnDefinition = "JSON")
    private List<CountryInfo> countries = new ArrayList<>();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "clarity_page_titles", columnDefinition = "JSON")
    private List<PageTitleInfo> pageTitles = new ArrayList<>();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "clarity_performance_metrics", columnDefinition = "JSON")
    private PerformanceMetrics performanceMetrics;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "clarity_diagnostic_events", columnDefinition = "JSON")
    private List<DiagnosticEvent> diagnosticEvents = new ArrayList<>();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "clarity_page_events", columnDefinition = "JSON")
    private PageEvents pageEvents;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "clarity_custom_events", columnDefinition = "JSON")
    private List<CustomEvent> customEvents = new ArrayList<>();

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

    public List<ClarityInsight> getTopIssues() {
        return topIssues == null ? Collections.emptyList() : Collections.unmodifiableList(topIssues);
    }

    public void replaceTopIssues(List<ClarityInsight> issues) {
        if (this.topIssues == null) {
            this.topIssues = new ArrayList<>();
        }
        this.topIssues.clear();
        if (issues != null) {
            this.topIssues.addAll(issues);
        }
    }

    public List<ClarityHeatmap> getHeatmaps() {
        return heatmaps == null ? Collections.emptyList() : Collections.unmodifiableList(heatmaps);
    }

    public void replaceHeatmaps(List<ClarityHeatmap> heatmaps) {
        if (this.heatmaps == null) {
            this.heatmaps = new ArrayList<>();
        }
        this.heatmaps.clear();
        if (heatmaps != null) {
            this.heatmaps.addAll(heatmaps);
        }
    }

    public List<ClaritySession> getStandoutSessions() {
        return standoutSessions == null ? Collections.emptyList() : Collections.unmodifiableList(standoutSessions);
    }

    public void replaceStandoutSessions(List<ClaritySession> sessions) {
        if (this.standoutSessions == null) {
            this.standoutSessions = new ArrayList<>();
        }
        this.standoutSessions.clear();
        if (sessions != null) {
            this.standoutSessions.addAll(sessions);
        }
    }

    public List<TrafficSource> getTrafficSources() {
        return trafficSources == null ? Collections.emptyList() : Collections.unmodifiableList(trafficSources);
    }

    public void replaceTrafficSources(List<TrafficSource> sources) {
        if (this.trafficSources == null) {
            this.trafficSources = new ArrayList<>();
        }
        this.trafficSources.clear();
        if (sources != null) {
            this.trafficSources.addAll(sources);
        }
    }

    public List<BrowserInfo> getBrowsers() {
        return browsers == null ? Collections.emptyList() : Collections.unmodifiableList(browsers);
    }

    public void replaceBrowsers(List<BrowserInfo> browsers) {
        if (this.browsers == null) {
            this.browsers = new ArrayList<>();
        }
        this.browsers.clear();
        if (browsers != null) {
            this.browsers.addAll(browsers);
        }
    }

    public List<DeviceInfo> getDevices() {
        return devices == null ? Collections.emptyList() : Collections.unmodifiableList(devices);
    }

    public void replaceDevices(List<DeviceInfo> devices) {
        if (this.devices == null) {
            this.devices = new ArrayList<>();
        }
        this.devices.clear();
        if (devices != null) {
            this.devices.addAll(devices);
        }
    }

    public List<OperatingSystemInfo> getOperatingSystems() {
        return operatingSystems == null ? Collections.emptyList() : Collections.unmodifiableList(operatingSystems);
    }

    public void replaceOperatingSystems(List<OperatingSystemInfo> operatingSystems) {
        if (this.operatingSystems == null) {
            this.operatingSystems = new ArrayList<>();
        }
        this.operatingSystems.clear();
        if (operatingSystems != null) {
            this.operatingSystems.addAll(operatingSystems);
        }
    }

    public List<CountryInfo> getCountries() {
        return countries == null ? Collections.emptyList() : Collections.unmodifiableList(countries);
    }

    public void replaceCountries(List<CountryInfo> countries) {
        if (this.countries == null) {
            this.countries = new ArrayList<>();
        }
        this.countries.clear();
        if (countries != null) {
            this.countries.addAll(countries);
        }
    }

    public List<PageTitleInfo> getPageTitles() {
        return pageTitles == null ? Collections.emptyList() : Collections.unmodifiableList(pageTitles);
    }

    public void replacePageTitles(List<PageTitleInfo> pageTitles) {
        if (this.pageTitles == null) {
            this.pageTitles = new ArrayList<>();
        }
        this.pageTitles.clear();
        if (pageTitles != null) {
            this.pageTitles.addAll(pageTitles);
        }
    }

    public PerformanceMetrics getPerformanceMetrics() {
        return performanceMetrics;
    }

    public void setPerformanceMetrics(PerformanceMetrics performanceMetrics) {
        this.performanceMetrics = performanceMetrics;
    }

    public List<DiagnosticEvent> getDiagnosticEvents() {
        return diagnosticEvents == null ? Collections.emptyList() : Collections.unmodifiableList(diagnosticEvents);
    }

    public void replaceDiagnosticEvents(List<DiagnosticEvent> events) {
        if (this.diagnosticEvents == null) {
            this.diagnosticEvents = new ArrayList<>();
        }
        this.diagnosticEvents.clear();
        if (events != null) {
            this.diagnosticEvents.addAll(events);
        }
    }

    public PageEvents getPageEvents() {
        return pageEvents;
    }

    public void setPageEvents(PageEvents pageEvents) {
        this.pageEvents = pageEvents;
    }

    public List<CustomEvent> getCustomEvents() {
        return customEvents == null ? Collections.emptyList() : Collections.unmodifiableList(customEvents);
    }

    public void replaceCustomEvents(List<CustomEvent> events) {
        if (this.customEvents == null) {
            this.customEvents = new ArrayList<>();
        }
        this.customEvents.clear();
        if (events != null) {
            this.customEvents.addAll(events);
        }
    }

    public boolean isEmpty() {
        return totalSessions == null
                && totalRecordings == null
                && activeUsers == null
                && rageClicks == null
                && deadClicks == null
                && quickBacks == null
                && (topIssues == null || topIssues.isEmpty())
                && (heatmaps == null || heatmaps.isEmpty())
                && (trafficSources == null || trafficSources.isEmpty())
                && (browsers == null || browsers.isEmpty())
                && (devices == null || devices.isEmpty())
                && (operatingSystems == null || operatingSystems.isEmpty())
                && (countries == null || countries.isEmpty())
                && (pageTitles == null || pageTitles.isEmpty())
                && performanceMetrics == null
                && (diagnosticEvents == null || diagnosticEvents.isEmpty())
                && pageEvents == null
                && (customEvents == null || customEvents.isEmpty());
    }

    public record ClarityInsight(String title,
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

