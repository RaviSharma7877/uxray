package com.dryno.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.ai")
public class AiProperties {

    /**
     * API key for Google Gemini (Generative Language API).
     */
    private String apiKey;

    /**
     * Model identifier. Default: gemini-2.5-flash (newer, faster model).
     * Other options: gemini-pro, gemini-1.5-pro, gemini-1.5-flash
     */
    private String model = "gemini-2.5-flash";

    /**
     * Optional temperature override so responses can be tuned without redeploying.
     */
    private double temperature = 0.35;

    /**
     * Optional maximum output tokens. If not set, the model's default will be used.
     * Defaults vary by model (e.g., gemini-2.5-flash: 8192, gemini-pro: 2048).
     * Set to null or 0 to use model default.
     */
    private Integer maxOutputTokens;

    public String getApiKey() {
        return apiKey;
    }

    public void setApiKey(String apiKey) {
        this.apiKey = apiKey;
    }

    public String getModel() {
        return model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public double getTemperature() {
        return temperature;
    }

    public void setTemperature(double temperature) {
        this.temperature = temperature;
    }

    public Integer getMaxOutputTokens() {
        return maxOutputTokens;
    }

    public void setMaxOutputTokens(Integer maxOutputTokens) {
        this.maxOutputTokens = maxOutputTokens;
    }
}
