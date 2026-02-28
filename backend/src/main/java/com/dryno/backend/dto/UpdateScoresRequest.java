package com.dryno.backend.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

public class UpdateScoresRequest {

    @Min(0) @Max(100)
    private Double mainPerformanceScore;
    @Min(0) @Max(100)
    private Double mainAccessibilityScore;
    @Min(0) @Max(100)
    private Double mainBestPracticesScore;
    @Min(0) @Max(100)
    private Double mainSeoScore;

    public Double getMainPerformanceScore() {
        return mainPerformanceScore;
    }

    public void setMainPerformanceScore(Double mainPerformanceScore) {
        this.mainPerformanceScore = mainPerformanceScore;
    }

    public Double getMainAccessibilityScore() {
        return mainAccessibilityScore;
    }

    public void setMainAccessibilityScore(Double mainAccessibilityScore) {
        this.mainAccessibilityScore = mainAccessibilityScore;
    }

    public Double getMainBestPracticesScore() {
        return mainBestPracticesScore;
    }

    public void setMainBestPracticesScore(Double mainBestPracticesScore) {
        this.mainBestPracticesScore = mainBestPracticesScore;
    }

    public Double getMainSeoScore() {
        return mainSeoScore;
    }

    public void setMainSeoScore(Double mainSeoScore) {
        this.mainSeoScore = mainSeoScore;
    }
}
