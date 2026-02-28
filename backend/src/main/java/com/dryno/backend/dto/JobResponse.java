package com.dryno.backend.dto;

import com.dryno.backend.domain.Job;
import com.dryno.backend.domain.JobStatus;
import com.dryno.backend.domain.JobType;
import com.dryno.backend.domain.Screenshot;

import java.time.Instant;
import java.util.List;

public class JobResponse {
    private String id;
    private JobStatus status;
    private JobType type;
    private String startUrl;
    private Integer pages;
    private String designInput;
    private String propertyId;
    private String clarityProjectId;
    private Double mainPerformanceScore;
    private Double mainAccessibilityScore;
    private Double mainBestPracticesScore;
    private Double mainSeoScore;
    private List<String> detectedAbPlatforms;
    private List<ScreenshotResponse> screenshots;
    private DesignAnalysisResultResponse designAnalysisResults;
    private Ga4ResultsResponse ga4Results;
    private ClarityInsightsResponse clarityInsights;
    private Instant createdAt;
    private Instant updatedAt;
    private Instant clarityRefreshedAt;

    public static JobResponse from(Job job) {
        JobResponse response = new JobResponse();
        response.id = job.getId().toString();
        response.status = job.getStatus();
        response.type = job.getType();
        response.startUrl = job.getStartUrl();
        response.pages = job.getMaxPages();
        response.designInput = job.getDesignInput();
        response.propertyId = job.getPropertyId();
        response.clarityProjectId = job.getClarityProjectId();
        response.mainPerformanceScore = job.getMainPerformanceScore();
        response.mainAccessibilityScore = job.getMainAccessibilityScore();
        response.mainBestPracticesScore = job.getMainBestPracticesScore();
        response.mainSeoScore = job.getMainSeoScore();
        response.detectedAbPlatforms = job.getDetectedAbPlatforms();
        response.screenshots = job.getScreenshots().stream()
                .map(ScreenshotResponse::from)
                .toList();
        response.designAnalysisResults = DesignAnalysisResultResponse.from(job.getDesignAnalysisResults());
        response.ga4Results = Ga4ResultsResponse.from(job.getGa4Results());
        response.clarityInsights = ClarityInsightsResponse.from(job.getClarityInsights());
        response.createdAt = job.getCreatedAt();
        response.updatedAt = job.getUpdatedAt();
        response.clarityRefreshedAt = job.getClarityRefreshedAt();
        return response;
    }

    public String getId() {
        return id;
    }

    public JobStatus getStatus() {
        return status;
    }

    public JobType getType() {
        return type;
    }

    public String getStartUrl() {
        return startUrl;
    }

    public Integer getPages() {
        return pages;
    }

    public String getDesignInput() {
        return designInput;
    }

    public String getPropertyId() {
        return propertyId;
    }

    public String getClarityProjectId() {
        return clarityProjectId;
    }

    public Double getMainPerformanceScore() {
        return mainPerformanceScore;
    }

    public Double getMainAccessibilityScore() {
        return mainAccessibilityScore;
    }

    public Double getMainBestPracticesScore() {
        return mainBestPracticesScore;
    }

    public Double getMainSeoScore() {
        return mainSeoScore;
    }

    public List<String> getDetectedAbPlatforms() {
        return detectedAbPlatforms;
    }

    public List<ScreenshotResponse> getScreenshots() {
        return screenshots;
    }

    public DesignAnalysisResultResponse getDesignAnalysisResults() {
        return designAnalysisResults;
    }

    public Ga4ResultsResponse getGa4Results() {
        return ga4Results;
    }

    public ClarityInsightsResponse getClarityInsights() {
        return clarityInsights;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public Instant getClarityRefreshedAt() {
        return clarityRefreshedAt;
    }

    public record ScreenshotResponse(String id,
                                     String pageUrl,
                                     String imageStoragePath,
                                     String imagePublicUrl,
                                     String heatmapStoragePath,
                                     String heatmapPublicUrl) {
        public static ScreenshotResponse from(Screenshot screenshot) {
            return new ScreenshotResponse(
                    screenshot.getId(),
                    screenshot.getPageUrl(),
                    screenshot.getImageStoragePath(),
                    screenshot.getImagePublicUrl(),
                    screenshot.getHeatmapStoragePath(),
                    screenshot.getHeatmapPublicUrl()
            );
        }
    }
}
