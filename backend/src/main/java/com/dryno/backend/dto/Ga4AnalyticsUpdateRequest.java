package com.dryno.backend.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;

import java.util.List;

public class Ga4AnalyticsUpdateRequest {

    private Integer totalUsers;
    private Integer newUsers;
    private Integer sessions;
    private Integer engagedSessions;
    private Double averageSessionDuration;
    private Double engagementRate;

    private List<@Valid TopPage> topPages;
    private List<@Valid TrafficSource> trafficSources;
    private List<@Valid TopCountry> topCountries;
    private List<@Valid TopEvent> topEvents;
    private List<@Valid AcquisitionChannel> acquisitionChannels;
    private List<@Valid DeviceTechnology> deviceTechnology;
    private List<@Valid Demographics> demographics;
    private List<@Valid CoreWebVital> coreWebVitals;

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

    public List<TopPage> getTopPages() {
        return topPages;
    }

    public void setTopPages(List<TopPage> topPages) {
        this.topPages = topPages;
    }

    public List<TrafficSource> getTrafficSources() {
        return trafficSources;
    }

    public void setTrafficSources(List<TrafficSource> trafficSources) {
        this.trafficSources = trafficSources;
    }

    public List<TopCountry> getTopCountries() {
        return topCountries;
    }

    public void setTopCountries(List<TopCountry> topCountries) {
        this.topCountries = topCountries;
    }

    public List<TopEvent> getTopEvents() {
        return topEvents;
    }

    public void setTopEvents(List<TopEvent> topEvents) {
        this.topEvents = topEvents;
    }

    public List<AcquisitionChannel> getAcquisitionChannels() {
        return acquisitionChannels;
    }

    public void setAcquisitionChannels(List<AcquisitionChannel> acquisitionChannels) {
        this.acquisitionChannels = acquisitionChannels;
    }

    public List<DeviceTechnology> getDeviceTechnology() {
        return deviceTechnology;
    }

    public void setDeviceTechnology(List<DeviceTechnology> deviceTechnology) {
        this.deviceTechnology = deviceTechnology;
    }

    public List<Demographics> getDemographics() {
        return demographics;
    }

    public void setDemographics(List<Demographics> demographics) {
        this.demographics = demographics;
    }

    public List<CoreWebVital> getCoreWebVitals() {
        return coreWebVitals;
    }

    public void setCoreWebVitals(List<CoreWebVital> coreWebVitals) {
        this.coreWebVitals = coreWebVitals;
    }

    public record TopPage(
            @Size(max = 512) String pagePath,
            @Size(max = 512) String pageTitle,
            Integer views,
            Integer users,
            Double avgEngagementTime
    ) {}

    public record TrafficSource(
            @Size(max = 128) String source,
            @Size(max = 128) String medium,
            Integer sessions
    ) {}

    public record TopCountry(
            @Size(max = 128) String country,
            Integer users
    ) {}

    public record TopEvent(
            @Size(max = 256) String eventName,
            Integer eventCount
    ) {}

    public record AcquisitionChannel(
            @Size(max = 256) String channel,
            Integer sessions,
            Integer activeUsers
    ) {}

    public record DeviceTechnology(
            @Size(max = 128) String deviceCategory,
            @Size(max = 128) String operatingSystem,
            @Size(max = 128) String browser,
            Integer sessions,
            Integer activeUsers
    ) {}

    public record Demographics(
            @Size(max = 128) String country,
            @Size(max = 256) String city,
            @Size(max = 128) String language,
            Integer activeUsers
    ) {}

    public record CoreWebVital(
            @Size(max = 512) String url,
            Double lcpMs,
            Double inpMs,
            Double cls,
            @Size(max = 512) String error
    ) {}
}
