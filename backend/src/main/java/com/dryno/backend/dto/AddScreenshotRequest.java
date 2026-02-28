package com.dryno.backend.dto;

import jakarta.validation.constraints.NotBlank;
import org.springframework.util.StringUtils;

public class AddScreenshotRequest {

    @NotBlank
    private String pageUrl;

    private String imageStoragePath;
    private String imageBase64;
    private String imageContentType;
    private String imageFileName;

    private String heatmapStoragePath;
    private String heatmapBase64;
    private String heatmapContentType;
    private String heatmapFileName;

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

    public String getImageBase64() {
        return imageBase64;
    }

    public void setImageBase64(String imageBase64) {
        this.imageBase64 = imageBase64;
    }

    public String getImageContentType() {
        return imageContentType;
    }

    public void setImageContentType(String imageContentType) {
        this.imageContentType = imageContentType;
    }

    public String getImageFileName() {
        return imageFileName;
    }

    public void setImageFileName(String imageFileName) {
        this.imageFileName = imageFileName;
    }

    public String getHeatmapStoragePath() {
        return heatmapStoragePath;
    }

    public void setHeatmapStoragePath(String heatmapStoragePath) {
        this.heatmapStoragePath = heatmapStoragePath;
    }

    public String getHeatmapBase64() {
        return heatmapBase64;
    }

    public void setHeatmapBase64(String heatmapBase64) {
        this.heatmapBase64 = heatmapBase64;
    }

    public String getHeatmapContentType() {
        return heatmapContentType;
    }

    public void setHeatmapContentType(String heatmapContentType) {
        this.heatmapContentType = heatmapContentType;
    }

    public String getHeatmapFileName() {
        return heatmapFileName;
    }

    public void setHeatmapFileName(String heatmapFileName) {
        this.heatmapFileName = heatmapFileName;
    }

    public boolean hasImageBinary() {
        return StringUtils.hasText(imageBase64);
    }

    public boolean hasHeatmapBinary() {
        return StringUtils.hasText(heatmapBase64);
    }
}
