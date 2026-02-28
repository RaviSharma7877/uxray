package com.dryno.backend.dto;

import com.dryno.backend.domain.Ga4Results;

import java.util.List;

public class Ga4ResultsResponse {
    private Integer totalUsers;
    private Integer newUsers;
    private Integer sessions;
    private Integer engagedSessions;
    private Double averageSessionDuration;
    private Double engagementRate;
    private List<TopPage> topPages;
    private List<TrafficSource> trafficSources;
    private List<TopCountry> topCountries;
    private List<TopEvent> topEvents;
    private List<AcquisitionChannel> acquisitionChannels;
    private List<DeviceTechnology> deviceTechnology;
    private List<Demographics> demographics;
    private List<CoreWebVital> coreWebVitals;

    public static Ga4ResultsResponse from(Ga4Results source) {
        if (source == null) {
            return null;
        }
        Ga4ResultsResponse response = new Ga4ResultsResponse();
        response.totalUsers = source.getTotalUsers();
        response.newUsers = source.getNewUsers();
        response.sessions = source.getSessions();
        response.engagedSessions = source.getEngagedSessions();
        response.averageSessionDuration = source.getAverageSessionDuration();
        response.engagementRate = source.getEngagementRate();
        response.topPages = source.getTopPages().stream()
                .map(tp -> new TopPage(tp.pagePath(), tp.pageTitle(), tp.views(), tp.users(), tp.avgEngagementTime()))
                .toList();
        response.trafficSources = source.getTrafficSources().stream()
                .map(ts -> new TrafficSource(ts.source(), ts.medium(), ts.sessions()))
                .toList();
        response.topCountries = source.getTopCountries().stream()
                .map(tc -> new TopCountry(tc.country(), tc.users()))
                .toList();
        response.topEvents = source.getTopEvents().stream()
                .map(te -> new TopEvent(te.eventName(), te.eventCount()))
                .toList();
        response.acquisitionChannels = source.getAcquisitionChannels().stream()
                .map(ac -> new AcquisitionChannel(ac.channel(), ac.sessions(), ac.activeUsers()))
                .toList();
        response.deviceTechnology = source.getDeviceTechnology().stream()
                .map(dt -> new DeviceTechnology(dt.deviceCategory(), dt.operatingSystem(), dt.browser(), dt.sessions(), dt.activeUsers()))
                .toList();
        response.demographics = source.getDemographics().stream()
                .map(d -> new Demographics(d.country(), d.city(), d.language(), d.activeUsers()))
                .toList();
        response.coreWebVitals = source.getCoreWebVitals().stream()
                .map(cwv -> new CoreWebVital(cwv.url(), cwv.lcpMs(), cwv.inpMs(), cwv.cls(), cwv.error()))
                .toList();

        if (response.totalUsers == null
                && response.newUsers == null
                && response.sessions == null
                && (response.topPages == null || response.topPages.isEmpty())
                && (response.trafficSources == null || response.trafficSources.isEmpty())
                && (response.topCountries == null || response.topCountries.isEmpty())
                && (response.topEvents == null || response.topEvents.isEmpty())
                && (response.acquisitionChannels == null || response.acquisitionChannels.isEmpty())
                && (response.deviceTechnology == null || response.deviceTechnology.isEmpty())
                && (response.demographics == null || response.demographics.isEmpty())
                && (response.coreWebVitals == null || response.coreWebVitals.isEmpty())) {
            return null;
        }
        return response;
    }

    public Integer getTotalUsers() {
        return totalUsers;
    }

    public Integer getNewUsers() {
        return newUsers;
    }

    public Integer getSessions() {
        return sessions;
    }

    public Integer getEngagedSessions() {
        return engagedSessions;
    }

    public Double getAverageSessionDuration() {
        return averageSessionDuration;
    }

    public Double getEngagementRate() {
        return engagementRate;
    }

    public List<TopPage> getTopPages() {
        return topPages;
    }

    public List<TrafficSource> getTrafficSources() {
        return trafficSources;
    }

    public List<TopCountry> getTopCountries() {
        return topCountries;
    }

    public List<TopEvent> getTopEvents() {
        return topEvents;
    }

    public List<AcquisitionChannel> getAcquisitionChannels() {
        return acquisitionChannels;
    }

    public List<DeviceTechnology> getDeviceTechnology() {
        return deviceTechnology;
    }

    public List<Demographics> getDemographics() {
        return demographics;
    }

    public List<CoreWebVital> getCoreWebVitals() {
        return coreWebVitals;
    }

    public record TopPage(String pagePath, String pageTitle, Integer views, Integer users, Double avgEngagementTime) {}

    public record TrafficSource(String source, String medium, Integer sessions) {}

    public record TopCountry(String country, Integer users) {}

    public record TopEvent(String eventName, Integer eventCount) {}

    public record AcquisitionChannel(String channel, Integer sessions, Integer activeUsers) {}

    public record DeviceTechnology(String deviceCategory, String operatingSystem, String browser, Integer sessions, Integer activeUsers) {}

    public record Demographics(String country, String city, String language, Integer activeUsers) {}

    public record CoreWebVital(String url, Double lcpMs, Double inpMs, Double cls, String error) {}
}
