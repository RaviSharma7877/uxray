package com.dryno.backend.ai;

import com.dryno.backend.config.AiProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class GeminiClient {

    private static final Logger log = LoggerFactory.getLogger(GeminiClient.class);

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(20))
            .build();

    private final AiProperties properties;
    private final ObjectMapper objectMapper;

    public GeminiClient(AiProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
    }

    public String generateInsights(String prompt) {
        if (!StringUtils.hasText(properties.getApiKey())) {
            throw new IllegalStateException("Gemini API key is not configured. Set app.ai.api-key or GEMINI_API_KEY.");
        }
        
        // Validate API key format (should not be placeholder)
        if ("your-gemini-api-key-here".equals(properties.getApiKey())) {
            throw new IllegalStateException("Gemini API key is not configured. Please set a valid API key.");
        }
        
        try {
            // Build generation config - only include maxOutputTokens if explicitly set
            Map<String, Object> generationConfig = new HashMap<>();
            generationConfig.put("temperature", properties.getTemperature());
            if (properties.getMaxOutputTokens() != null && properties.getMaxOutputTokens() > 0) {
                generationConfig.put("maxOutputTokens", properties.getMaxOutputTokens());
            }
            
            Map<String, Object> payload = Map.of(
                    "contents", List.of(Map.of(
                            "role", "user",
                            "parts", List.of(Map.of("text", prompt))
                    )),
                    "generationConfig", generationConfig
            );

            String body = objectMapper.writeValueAsString(payload);
            // Use v1beta API for newer models (gemini-2.5-*), v1 for older models (gemini-pro, gemini-1.5-*)
            // gemini-2.5-flash requires v1beta endpoint
            String apiVersion = properties.getModel().startsWith("gemini-2.5") ? "v1beta" : "v1";
            URI uri = URI.create(String.format(
                    "https://generativelanguage.googleapis.com/%s/models/%s:generateContent?key=%s",
                    apiVersion,
                    properties.getModel(),
                    properties.getApiKey()
            ));

            log.debug("Calling Gemini API with version: {}, model: {}, prompt length: {}", apiVersion, properties.getModel(), prompt.length());

            HttpRequest request = HttpRequest.newBuilder(uri)
                    .timeout(Duration.ofSeconds(60))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 400) {
                String errorBody = response.body();
                log.error("Gemini API returned error {}: {}", response.statusCode(), errorBody);
                
                // Try to extract meaningful error message from response
                String errorMessage = extractErrorMessage(errorBody);
                throw new IllegalStateException(
                    String.format("Gemini API call failed with status %d: %s", response.statusCode(), errorMessage)
                );
            }
            return extractText(response.body());
        } catch (IOException ex) {
            log.error("IO error calling Gemini API", ex);
            throw new IllegalStateException("Failed to call Gemini API: " + ex.getMessage(), ex);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            log.error("Gemini API call interrupted", ex);
            throw new IllegalStateException("Gemini API call aborted", ex);
        }
    }

    private String extractErrorMessage(String errorBody) {
        if (!StringUtils.hasText(errorBody)) {
            return "No error details provided";
        }
        try {
            JsonNode root = objectMapper.readTree(errorBody);
            JsonNode error = root.path("error");
            if (!error.isMissingNode()) {
                JsonNode message = error.path("message");
                if (!message.isMissingNode()) {
                    return message.asText();
                }
                JsonNode status = error.path("status");
                if (!status.isMissingNode()) {
                    return status.asText();
                }
            }
            // If no structured error, return first 200 chars of response
            return errorBody.length() > 200 ? errorBody.substring(0, 200) + "..." : errorBody;
        } catch (Exception ex) {
            log.debug("Failed to parse error response", ex);
            return errorBody.length() > 200 ? errorBody.substring(0, 200) + "..." : errorBody;
        }
    }

    private String extractText(String responseBody) throws IOException {
        JsonNode root = objectMapper.readTree(responseBody);
        StringBuilder builder = new StringBuilder();
        JsonNode candidates = root.path("candidates");
        if (candidates.isMissingNode() || !candidates.isArray()) {
            log.warn("Gemini API response missing candidates: {}", responseBody);
            return "";
        }
        for (JsonNode candidate : candidates) {
            // Check for blocking reasons
            JsonNode finishReason = candidate.path("finishReason");
            if (!finishReason.isMissingNode()) {
                String reason = finishReason.asText();
                if ("SAFETY".equals(reason) || "RECITATION".equals(reason)) {
                    log.warn("Gemini API blocked content due to: {}", reason);
                    return "Content was filtered by safety settings. Please try with different content.";
                }
                if ("MAX_TOKENS".equals(reason)) {
                    log.warn("Gemini API response truncated due to MAX_TOKENS limit. Consider increasing maxOutputTokens.");
                    // Still try to extract what we got, but log a warning
                }
            }
            
            JsonNode parts = candidate.path("content").path("parts");
            if (parts.isArray() && parts.size() > 0) {
                for (JsonNode part : parts) {
                    JsonNode textNode = part.path("text");
                    if (!textNode.isMissingNode()) {
                        builder.append(textNode.asText()).append("\n");
                    }
                }
            }
        }
        String result = builder.toString().trim();
        if (result.isEmpty()) {
            // Check if we have usage metadata to understand what happened
            JsonNode usageMetadata = root.path("usageMetadata");
            if (!usageMetadata.isMissingNode()) {
                JsonNode thoughtsTokenCount = usageMetadata.path("thoughtsTokenCount");
                if (!thoughtsTokenCount.isMissingNode() && thoughtsTokenCount.asInt() > 0) {
                    log.warn("Gemini API returned empty response. Model used {} tokens for internal reasoning. Consider increasing maxOutputTokens.", 
                            thoughtsTokenCount.asInt());
                    return "Response was truncated due to token limit. The model used significant tokens for internal reasoning. Please increase maxOutputTokens or simplify the prompt.";
                }
            }
            log.warn("Gemini API returned empty response: {}", responseBody);
            return "No response generated. The API may have filtered the content or hit token limits.";
        }
        return result;
    }
}
