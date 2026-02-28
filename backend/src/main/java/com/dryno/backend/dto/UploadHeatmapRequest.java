package com.dryno.backend.dto;

import jakarta.validation.constraints.NotBlank;

public class UploadHeatmapRequest {

    @NotBlank
    private String heatmapBase64;
    private String contentType;
    private String fileName;

    public String getHeatmapBase64() {
        return heatmapBase64;
    }

    public void setHeatmapBase64(String heatmapBase64) {
        this.heatmapBase64 = heatmapBase64;
    }

    public String getContentType() {
        return contentType;
    }

    public void setContentType(String contentType) {
        this.contentType = contentType;
    }

    public String getFileName() {
        return fileName;
    }

    public void setFileName(String fileName) {
        this.fileName = fileName;
    }
}
