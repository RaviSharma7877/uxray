package com.dryno.backend.domain;

import jakarta.persistence.Embeddable;
import jakarta.persistence.Column;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Embeddable
public class DesignAnalysisResult {
    
    @Column(name = "design_summary", columnDefinition = "TEXT")
    private String summary;
    
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "design_key_points", columnDefinition = "JSON")
    private List<String> keyPoints = new ArrayList<>();

    public String getSummary() {
        return summary;
    }

    public void setSummary(String summary) {
        this.summary = summary;
    }

    public List<String> getKeyPoints() {
        return keyPoints == null ? Collections.emptyList() : Collections.unmodifiableList(keyPoints);
    }

    public void replaceKeyPoints(List<String> points) {
        if (this.keyPoints == null) {
            this.keyPoints = new ArrayList<>();
        }
        this.keyPoints.clear();
        if (points != null) {
            this.keyPoints.addAll(points);
        }
    }
}
