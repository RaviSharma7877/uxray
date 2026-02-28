package com.dryno.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class ClarityProjectResponse {
    
    @JsonProperty("projectId")
    private String projectId;
    
    @JsonProperty("name")
    private String name;
    
    @JsonProperty("domain")
    private String domain;
    
    @JsonProperty("status")
    private String status;
    
    @JsonProperty("createdDate")
    private String createdDate;

    public ClarityProjectResponse() {
    }

    public ClarityProjectResponse(String projectId, String name, String domain, String status, String createdDate) {
        this.projectId = projectId;
        this.name = name;
        this.domain = domain;
        this.status = status;
        this.createdDate = createdDate;
    }

    public String getProjectId() {
        return projectId;
    }

    public void setProjectId(String projectId) {
        this.projectId = projectId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDomain() {
        return domain;
    }

    public void setDomain(String domain) {
        this.domain = domain;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getCreatedDate() {
        return createdDate;
    }

    public void setCreatedDate(String createdDate) {
        this.createdDate = createdDate;
    }
}

