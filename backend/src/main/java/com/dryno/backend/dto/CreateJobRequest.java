package com.dryno.backend.dto;

import com.dryno.backend.domain.JobType;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class CreateJobRequest {

    @NotNull
    private JobType type;

    @Pattern(regexp = "^(https?://).*$", message = "URL must start with http or https")
    private String url;

    @Min(value = 1, message = "Pages must be at least 1")
    @Max(value = 10, message = "Pages cannot exceed 10")
    private Integer pages = 3;

    @Size(max = 120)
    private String propertyId;

    @Size(max = 120)
    private String clarityProjectId;

    @Size(max = 2000)
    private String clarityToken;

    @Size(max = 2048)
    private String designInput;

    public JobType getType() {
        return type;
    }

    public void setType(JobType type) {
        this.type = type;
    }

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }

    public Integer getPages() {
        return pages;
    }

    public void setPages(Integer pages) {
        this.pages = pages;
    }

    public String getPropertyId() {
        return propertyId;
    }

    public void setPropertyId(String propertyId) {
        this.propertyId = propertyId;
    }

    public String getClarityProjectId() {
        return clarityProjectId;
    }

    public void setClarityProjectId(String clarityProjectId) {
        this.clarityProjectId = clarityProjectId;
    }

    public String getClarityToken() {
        return clarityToken;
    }

    public void setClarityToken(String clarityToken) {
        this.clarityToken = clarityToken;
    }

    public String getDesignInput() {
        return designInput;
    }

    public void setDesignInput(String designInput) {
        this.designInput = designInput;
    }
}
