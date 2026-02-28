package com.dryno.backend.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "screenshots")
public class Screenshot {
    
    @Id
    @Column(name = "id", updatable = false, nullable = false)
    private String id;

    @Column(name = "page_url", length = 2000)
    private String pageUrl;

    @Column(name = "image_storage_path", length = 500)
    private String imageStoragePath;

    @Column(name = "image_public_url", length = 1000)
    private String imagePublicUrl;

    @Column(name = "heatmap_storage_path", length = 500)
    private String heatmapStoragePath;

    @Column(name = "heatmap_public_url", length = 1000)
    private String heatmapPublicUrl;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_id")
    private Job job;

    // JPA requires a no-arg constructor
    protected Screenshot() {
    }

    public Screenshot(String pageUrl, String imageStoragePath) {
        this(UUID.randomUUID().toString(), pageUrl, imageStoragePath, Instant.now());
    }

    public Screenshot(String id, String pageUrl, String imageStoragePath, Instant createdAt) {
        this.id = id;
        this.pageUrl = pageUrl;
        this.imageStoragePath = imageStoragePath;
        this.createdAt = createdAt == null ? Instant.now() : createdAt;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getPageUrl() {
        return pageUrl;
    }

    public void setPageUrl(String pageUrl) {
        this.pageUrl = pageUrl;
    }

    public String getImageStoragePath() {
        return imageStoragePath;
    }

    public void setImageStoragePath(String imageStoragePath) {
        this.imageStoragePath = imageStoragePath;
    }

    public String getImagePublicUrl() {
        return imagePublicUrl;
    }

    public void setImagePublicUrl(String imagePublicUrl) {
        this.imagePublicUrl = imagePublicUrl;
    }

    public String getHeatmapStoragePath() {
        return heatmapStoragePath;
    }

    public void setHeatmapStoragePath(String heatmapStoragePath) {
        this.heatmapStoragePath = heatmapStoragePath;
    }

    public String getHeatmapPublicUrl() {
        return heatmapPublicUrl;
    }

    public void setHeatmapPublicUrl(String heatmapPublicUrl) {
        this.heatmapPublicUrl = heatmapPublicUrl;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Job getJob() {
        return job;
    }

    public void setJob(Job job) {
        this.job = job;
    }
}
