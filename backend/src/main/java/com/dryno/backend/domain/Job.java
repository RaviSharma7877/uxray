package com.dryno.backend.domain;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "jobs")
public class Job {

    @Id
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 50)
    private JobType type;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 50)
    private JobStatus status;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "start_url", length = 2000)
    private String startUrl;

    @Column(name = "max_pages")
    private Integer maxPages;

    @Column(name = "property_id", length = 255)
    private String propertyId;

    @Column(name = "clarity_project_id", length = 255)
    private String clarityProjectId;

    @Column(name = "clarity_endpoint_url", length = 2048)
    private String clarityEndpointUrl;

    @Column(name = "design_input", columnDefinition = "TEXT")
    private String designInput;

    @Column(name = "main_performance_score")
    private Double mainPerformanceScore;

    @Column(name = "main_accessibility_score")
    private Double mainAccessibilityScore;

    @Column(name = "main_best_practices_score")
    private Double mainBestPracticesScore;

    @Column(name = "main_seo_score")
    private Double mainSeoScore;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "detected_ab_platforms", columnDefinition = "JSON")
    private List<String> detectedAbPlatforms = new ArrayList<>();

    @OneToMany(mappedBy = "job", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<Screenshot> screenshots = new ArrayList<>();

    @Embedded
    private DesignAnalysisResult designAnalysisResults = new DesignAnalysisResult();

    @Embedded
    private Ga4Results ga4Results = new Ga4Results();

    @Embedded
    private ClarityInsights clarityInsights = new ClarityInsights();

    @Column(name = "clarity_refreshed_at")
    private Instant clarityRefreshedAt;

    // JPA requires a no-arg constructor
    protected Job() {
    }

    public Job(JobType type) {
        this(UUID.randomUUID(), type, JobStatus.PENDING);
    }

    public Job(UUID id, JobType type, JobStatus status) {
        this.id = id;
        this.type = type;
        this.status = status;
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public JobType getType() {
        return type;
    }

    public JobStatus getStatus() {
        return status;
    }

    public synchronized void setStatus(JobStatus status) {
        this.status = status;
        this.updatedAt = Instant.now();
    }

    public void setType(JobType type) {
        this.type = type;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public String getStartUrl() {
        return startUrl;
    }

    public synchronized void setStartUrl(String startUrl) {
        this.startUrl = startUrl;
        this.updatedAt = Instant.now();
    }

    public Integer getMaxPages() {
        return maxPages;
    }

    public synchronized void setMaxPages(Integer maxPages) {
        this.maxPages = maxPages;
        this.updatedAt = Instant.now();
    }

    public String getPropertyId() {
        return propertyId;
    }

    public synchronized void setPropertyId(String propertyId) {
        this.propertyId = propertyId;
        this.updatedAt = Instant.now();
    }

    public String getClarityProjectId() {
        return clarityProjectId;
    }

    public synchronized void setClarityProjectId(String clarityProjectId) {
        this.clarityProjectId = clarityProjectId;
        this.updatedAt = Instant.now();
    }

    public String getClarityEndpointUrl() {
        return clarityEndpointUrl;
    }

    public synchronized void setClarityEndpointUrl(String clarityEndpointUrl) {
        this.clarityEndpointUrl = clarityEndpointUrl;
        this.updatedAt = Instant.now();
    }

    public String getDesignInput() {
        return designInput;
    }

    public synchronized void setDesignInput(String designInput) {
        this.designInput = designInput;
        this.updatedAt = Instant.now();
    }

    public Double getMainPerformanceScore() {
        return mainPerformanceScore;
    }

    public synchronized void setMainPerformanceScore(Double mainPerformanceScore) {
        this.mainPerformanceScore = mainPerformanceScore;
        this.updatedAt = Instant.now();
    }

    public Double getMainAccessibilityScore() {
        return mainAccessibilityScore;
    }

    public synchronized void setMainAccessibilityScore(Double mainAccessibilityScore) {
        this.mainAccessibilityScore = mainAccessibilityScore;
        this.updatedAt = Instant.now();
    }

    public Double getMainBestPracticesScore() {
        return mainBestPracticesScore;
    }

    public synchronized void setMainBestPracticesScore(Double mainBestPracticesScore) {
        this.mainBestPracticesScore = mainBestPracticesScore;
        this.updatedAt = Instant.now();
    }

    public Double getMainSeoScore() {
        return mainSeoScore;
    }

    public synchronized void setMainSeoScore(Double mainSeoScore) {
        this.mainSeoScore = mainSeoScore;
        this.updatedAt = Instant.now();
    }

    public List<String> getDetectedAbPlatforms() {
        return detectedAbPlatforms == null ? Collections.emptyList() : List.copyOf(detectedAbPlatforms);
    }

    public void replaceDetectedAbPlatforms(List<String> platforms) {
        if (this.detectedAbPlatforms == null) {
            this.detectedAbPlatforms = new ArrayList<>();
        }
        this.detectedAbPlatforms.clear();
        if (platforms != null) {
            this.detectedAbPlatforms.addAll(platforms);
        }
        this.updatedAt = Instant.now();
    }

    public List<Screenshot> getScreenshots() {
        return screenshots == null ? Collections.emptyList() : List.copyOf(screenshots);
    }

    public void addScreenshot(Screenshot screenshot) {
        if (screenshot == null) return;
        if (this.screenshots == null) {
            this.screenshots = new ArrayList<>();
        }
        screenshot.setJob(this);
        this.screenshots.add(screenshot);
        this.updatedAt = Instant.now();
    }

    public DesignAnalysisResult getDesignAnalysisResults() {
        return designAnalysisResults;
    }

    public Ga4Results getGa4Results() {
        return ga4Results;
    }

    public ClarityInsights getClarityInsights() {
        if (clarityInsights == null) {
            clarityInsights = new ClarityInsights();
        }
        return clarityInsights;
    }

    public void setClarityInsights(ClarityInsights clarityInsights) {
        this.clarityInsights = clarityInsights;
        this.updatedAt = Instant.now();
    }

    public Instant getClarityRefreshedAt() {
        return clarityRefreshedAt;
    }

    public void setClarityRefreshedAt(Instant clarityRefreshedAt) {
        this.clarityRefreshedAt = clarityRefreshedAt;
        this.updatedAt = Instant.now();
    }
}
