package com.dryno.backend.dto;

import com.dryno.backend.domain.DesignAnalysisResult;

import java.util.List;

public class DesignAnalysisResultResponse {
    private String summary;
    private List<String> keyPoints;

    public static DesignAnalysisResultResponse from(DesignAnalysisResult source) {
        if (source == null) {
            return null;
        }
        DesignAnalysisResultResponse response = new DesignAnalysisResultResponse();
        response.summary = source.getSummary();
        response.keyPoints = source.getKeyPoints();
        if (response.summary == null && (response.keyPoints == null || response.keyPoints.isEmpty())) {
            return null;
        }
        return response;
    }

    public String getSummary() {
        return summary;
    }

    public List<String> getKeyPoints() {
        return keyPoints;
    }
}
