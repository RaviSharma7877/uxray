package com.dryno.backend.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Embeddable
public class Ga4Results {
    
    @Column(name = "ga4_total_users")
    private Integer totalUsers;
    
    @Column(name = "ga4_new_users")
    private Integer newUsers;
    
    @Column(name = "ga4_sessions")
    private Integer sessions;
    
    @Column(name = "ga4_engaged_sessions")
    private Integer engagedSessions;
    
    @Column(name = "ga4_avg_session_duration")
    private Double averageSessionDuration;
    
    @Column(name = "ga4_engagement_rate")
    private Double engagementRate;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "ga4_top_pages", columnDefinition = "JSON")
    private List<Ga4Page> topPages = new ArrayList<>();
    
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "ga4_traffic_sources", columnDefinition = "JSON")
    private List<Ga4TrafficSource> trafficSources = new ArrayList<>();
    
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "ga4_top_countries", columnDefinition = "JSON")
    private List<Ga4Country> topCountries = new ArrayList<>();
    
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "ga4_top_events", columnDefinition = "JSON")
    private List<Ga4Event> topEvents = new ArrayList<>();
    
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "ga4_acquisition_channels", columnDefinition = "JSON")
    private List<Ga4AcquisitionChannel> acquisitionChannels = new ArrayList<>();
    
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "ga4_device_technology", columnDefinition = "JSON")
    private List<Ga4DeviceTechnology> deviceTechnology = new ArrayList<>();
    
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "ga4_demographics", columnDefinition = "JSON")
    private List<Ga4Demographics> demographics = new ArrayList<>();
    
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "ga4_core_web_vitals", columnDefinition = "JSON")
    private List<Ga4CoreWebVital> coreWebVitals = new ArrayList<>();

    public Integer getTotalUsers() {
        return totalUsers;
    }

    public void setTotalUsers(Integer totalUsers) {
        this.totalUsers = totalUsers;
    }

    public Integer getNewUsers() {
        return newUsers;
    }

    public void setNewUsers(Integer newUsers) {
        this.newUsers = newUsers;
    }

    public Integer getSessions() {
        return sessions;
    }

    public void setSessions(Integer sessions) {
        this.sessions = sessions;
    }

    public Integer getEngagedSessions() {
        return engagedSessions;
    }

    public void setEngagedSessions(Integer engagedSessions) {
        this.engagedSessions = engagedSessions;
    }

    public Double getAverageSessionDuration() {
        return averageSessionDuration;
    }

    public void setAverageSessionDuration(Double averageSessionDuration) {
        this.averageSessionDuration = averageSessionDuration;
    }

    public Double getEngagementRate() {
        return engagementRate;
    }

    public void setEngagementRate(Double engagementRate) {
        this.engagementRate = engagementRate;
    }

    public List<Ga4Page> getTopPages() {
        return topPages == null ? Collections.emptyList() : Collections.unmodifiableList(topPages);
    }

    public List<Ga4TrafficSource> getTrafficSources() {
        return trafficSources == null ? Collections.emptyList() : Collections.unmodifiableList(trafficSources);
    }

    public List<Ga4Country> getTopCountries() {
        return topCountries == null ? Collections.emptyList() : Collections.unmodifiableList(topCountries);
    }

    public void replaceTopPages(List<Ga4Page> pages) {
        if (this.topPages == null) {
            this.topPages = new ArrayList<>();
        }
        this.topPages.clear();
        if (pages != null) {
            this.topPages.addAll(pages);
        }
    }

    public void replaceTrafficSources(List<Ga4TrafficSource> sources) {
        if (this.trafficSources == null) {
            this.trafficSources = new ArrayList<>();
        }
        this.trafficSources.clear();
        if (sources != null) {
            this.trafficSources.addAll(sources);
        }
    }

    public void replaceTopCountries(List<Ga4Country> countries) {
        if (this.topCountries == null) {
            this.topCountries = new ArrayList<>();
        }
        this.topCountries.clear();
        if (countries != null) {
            this.topCountries.addAll(countries);
        }
    }

    public List<Ga4Event> getTopEvents() {
        return topEvents == null ? Collections.emptyList() : Collections.unmodifiableList(topEvents);
    }

    public void replaceTopEvents(List<Ga4Event> events) {
        if (this.topEvents == null) {
            this.topEvents = new ArrayList<>();
        }
        this.topEvents.clear();
        if (events != null) {
            this.topEvents.addAll(events);
        }
    }

    public List<Ga4AcquisitionChannel> getAcquisitionChannels() {
        return acquisitionChannels == null ? Collections.emptyList() : Collections.unmodifiableList(acquisitionChannels);
    }

    public void replaceAcquisitionChannels(List<Ga4AcquisitionChannel> channels) {
        if (this.acquisitionChannels == null) {
            this.acquisitionChannels = new ArrayList<>();
        }
        this.acquisitionChannels.clear();
        if (channels != null) {
            this.acquisitionChannels.addAll(channels);
        }
    }

    public List<Ga4DeviceTechnology> getDeviceTechnology() {
        return deviceTechnology == null ? Collections.emptyList() : Collections.unmodifiableList(deviceTechnology);
    }

    public void replaceDeviceTechnology(List<Ga4DeviceTechnology> devices) {
        if (this.deviceTechnology == null) {
            this.deviceTechnology = new ArrayList<>();
        }
        this.deviceTechnology.clear();
        if (devices != null) {
            this.deviceTechnology.addAll(devices);
        }
    }

    public List<Ga4Demographics> getDemographics() {
        return demographics == null ? Collections.emptyList() : Collections.unmodifiableList(demographics);
    }

    public void replaceDemographics(List<Ga4Demographics> demo) {
        if (this.demographics == null) {
            this.demographics = new ArrayList<>();
        }
        this.demographics.clear();
        if (demo != null) {
            this.demographics.addAll(demo);
        }
    }

    public List<Ga4CoreWebVital> getCoreWebVitals() {
        return coreWebVitals == null ? Collections.emptyList() : Collections.unmodifiableList(coreWebVitals);
    }

    public void replaceCoreWebVitals(List<Ga4CoreWebVital> vitals) {
        if (this.coreWebVitals == null) {
            this.coreWebVitals = new ArrayList<>();
        }
        this.coreWebVitals.clear();
        if (vitals != null) {
            this.coreWebVitals.addAll(vitals);
        }
    }

    public record Ga4Page(String pagePath, String pageTitle, Integer views, Integer users, Double avgEngagementTime) {}

    public record Ga4TrafficSource(String source, String medium, Integer sessions) {}

    public record Ga4Country(String country, Integer users) {}

    public record Ga4Event(String eventName, Integer eventCount) {}

    public record Ga4AcquisitionChannel(String channel, Integer sessions, Integer activeUsers) {}

    public record Ga4DeviceTechnology(String deviceCategory, String operatingSystem, String browser, Integer sessions, Integer activeUsers) {}

    public record Ga4Demographics(String country, String city, String language, Integer activeUsers) {}

    public record Ga4CoreWebVital(String url, Double lcpMs, Double inpMs, Double cls, String error) {}
}
