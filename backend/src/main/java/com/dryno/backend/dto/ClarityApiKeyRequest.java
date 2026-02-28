package com.dryno.backend.dto;

import jakarta.validation.constraints.NotBlank;

public class ClarityApiKeyRequest {
    
    @NotBlank(message = "Clarity API key is required")
    private String apiKey;

    public ClarityApiKeyRequest() {
    }

    public ClarityApiKeyRequest(String apiKey) {
        this.apiKey = apiKey;
    }

    public String getApiKey() {
        return apiKey;
    }

    public void setApiKey(String apiKey) {
        this.apiKey = apiKey;
    }
}

