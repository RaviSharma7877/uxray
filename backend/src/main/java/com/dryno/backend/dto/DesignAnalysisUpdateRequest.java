package com.dryno.backend.dto;

import jakarta.validation.constraints.Size;

import java.util.List;

public class DesignAnalysisUpdateRequest {

    @Size(max = 4096)
    private String summary;

    private List<@Size(max = 512) String> keyPoints;

    public String getSummary() {
        return summary;
    }

    public void setSummary(String summary) {
        this.summary = summary;
    }

    public List<String> getKeyPoints() {
        return keyPoints;
    }

    public void setKeyPoints(List<String> keyPoints) {
        this.keyPoints = keyPoints;
    }
}
