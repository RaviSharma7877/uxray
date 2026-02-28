package com.dryno.backend.ai;

import com.dryno.backend.domain.ClarityInsights;
import com.dryno.backend.domain.DesignAnalysisResult;
import com.dryno.backend.domain.Ga4Results;
import com.dryno.backend.domain.Job;
import com.dryno.backend.domain.Screenshot;
import com.dryno.backend.service.ClarityService;
import com.dryno.backend.service.JobService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

@Service
public class AiInsightService {

    private static final Logger log = LoggerFactory.getLogger(AiInsightService.class);

    private final JobService jobService;
    private final GeminiClient geminiClient;
    private final ClarityService clarityService;
    private final ObjectMapper objectMapper;

    public AiInsightService(JobService jobService,
                            GeminiClient geminiClient,
                            ClarityService clarityService,
                            ObjectMapper objectMapper) {
        this.jobService = jobService;
        this.geminiClient = geminiClient;
        this.clarityService = clarityService;
        this.objectMapper = objectMapper;
    }

    public SseEmitter streamInsights(UUID jobId) {
        SseEmitter emitter = new SseEmitter(0L);
        // Fetch job with screenshots synchronously (within transaction) before async processing
        Job job;
        try {
            job = jobService.getJobWithScreenshots(jobId);
            // Force initialization of lazy collections while still in transaction context
            // This ensures collections are loaded before the entity becomes detached
            job.getScreenshots().size(); // Force initialization
        } catch (Exception ex) {
            log.error("Failed to fetch job {} for AI insights", jobId, ex);
            try {
                emitter.send(SseEmitter.event()
                        .name("error")
                        .data("Failed to load job data: " + ex.getMessage()));
                emitter.complete();
            } catch (IOException ioException) {
                emitter.completeWithError(ioException);
            }
            return emitter;
        }
        
        // Now process asynchronously with the already-loaded entity
        final Job jobForProcessing = job;
        CompletableFuture.runAsync(() -> generateInsights(jobForProcessing, emitter));
        return emitter;
    }

    private void generateInsights(Job job, SseEmitter emitter) {
        try {
            clarityService.hydrate(job);

            safeSend(emitter, "chunk", "Synthesizing Lighthouse, GA4, Clarity, and heatmap signals...");
            String prompt = buildPrompt(job);

            log.debug("Generated prompt length: {} characters", prompt.length());

            String response = geminiClient.generateInsights(prompt);

            if (!StringUtils.hasText(response)) {
                safeSend(emitter, "error", "AI service returned empty response. Please try again.");
                emitter.complete();
                return;
            }

            JsonNode structured = tryParseJson(response);
            if (structured != null) {
                safeSend(emitter, "chunk", "Analysis drafted. Formatting briefing...");
                safeSendJson(emitter, "payload", structured);
            } else {
                log.warn("AI response was not valid JSON. Falling back to plain text streaming.");
                List<String> chunks = chunkResponse(response);
                if (chunks.isEmpty()) {
                    safeSend(emitter, "error", "Failed to process AI response.");
                    emitter.complete();
                    return;
                }
                for (String chunk : chunks) {
                    safeSend(emitter, "chunk", chunk);
                }
            }
            safeSend(emitter, "done", "complete");
            emitter.complete();
        } catch (IllegalStateException ex) {
            // Handle API errors specifically
            log.error("AI API error for job {}: {}", job.getId(), ex.getMessage());
            String errorMessage = ex.getMessage();
            if (errorMessage.contains("API key")) {
                errorMessage = "AI service is not configured. Please contact support.";
            } else if (errorMessage.contains("400")) {
                errorMessage = "Invalid request to AI service. The prompt may be too long or contain invalid content.";
            } else if (errorMessage.contains("401") || errorMessage.contains("403")) {
                errorMessage = "AI service authentication failed. Please check configuration.";
            } else if (errorMessage.contains("429")) {
                errorMessage = "AI service rate limit exceeded. Please try again later.";
            }
            safeSend(emitter, "error", errorMessage);
            try {
                emitter.complete();
            } catch (Exception e) {
                log.debug("Error completing emitter after error", e);
            }
        } catch (Exception ex) {
            log.error("Failed to generate AI insights for job {}", job.getId(), ex);
            String errorMessage = "Unable to generate AI insight: " + 
                (ex.getMessage() != null ? ex.getMessage() : "Unknown error");
            safeSend(emitter, "error", errorMessage);
            try {
                emitter.complete();
            } catch (Exception e) {
                log.debug("Error completing emitter after exception", e);
            }
        }
    }

    private void safeSend(SseEmitter emitter, String eventName, String data) {
        try {
            SseEmitter.SseEventBuilder builder = SseEmitter.event()
                    .data(data == null ? "" : data);
            if (StringUtils.hasText(eventName)) {
                builder = builder.name(eventName);
            }
            emitter.send(builder);
        } catch (IOException ignored) {
            log.debug("Client disconnected while streaming AI insights");
        }
    }

    private void safeSendJson(SseEmitter emitter, String eventName, JsonNode payload) {
        try {
            String data = objectMapper.writeValueAsString(payload);
            SseEmitter.SseEventBuilder builder = SseEmitter.event().data(data);
            if (StringUtils.hasText(eventName)) {
                builder = builder.name(eventName);
            }
            emitter.send(builder);
        } catch (IOException ignored) {
            log.debug("Client disconnected while streaming AI insights");
        }
    }

    private List<String> chunkResponse(String response) {
        if (!StringUtils.hasText(response)) {
            return List.of("No insights were returned.");
        }
        List<String> chunks = new ArrayList<>();
        String[] paragraphs = response.split("\\n\\s*\\n");
        StringBuilder builder = new StringBuilder();
        for (String paragraph : paragraphs) {
            if (builder.length() + paragraph.length() > 400 && builder.length() > 0) {
                chunks.add(builder.toString());
                builder = new StringBuilder();
            }
            if (builder.length() > 0) {
                builder.append("\n\n");
            }
            builder.append(paragraph.trim());
        }
        if (builder.length() > 0) {
            chunks.add(builder.toString());
        }
        return chunks;
    }
    
    private JsonNode tryParseJson(String raw) {
        if (!StringUtils.hasText(raw)) {
            return null;
        }
        try {
            return objectMapper.readTree(raw);
        } catch (JsonProcessingException ex) {
            int start = raw.indexOf('{');
            int end = raw.lastIndexOf('}');
            if (start >= 0 && end > start) {
                String trimmed = raw.substring(start, end + 1);
                try {
                    return objectMapper.readTree(trimmed);
                } catch (JsonProcessingException ignored) {
                    log.debug("Failed to parse AI response as JSON after trimming: {}", ignored.getOriginalMessage());
                }
            } else {
                log.debug("AI response missing JSON object delimiters.");
            }
            return null;
        }
    }

    private String buildPrompt(Job job) throws JsonProcessingException {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("jobId", job.getId().toString());
        payload.put("startUrl", job.getStartUrl());
        payload.put("status", job.getStatus());
        payload.put("type", job.getType());
        payload.put("createdAt", DateTimeFormatter.ISO_INSTANT.format(job.getCreatedAt()));
        payload.put("updatedAt", DateTimeFormatter.ISO_INSTANT.format(job.getUpdatedAt()));
        payload.put("designInputReference", job.getDesignInput());
        payload.put("detectedAbPlatforms", job.getDetectedAbPlatforms());
        payload.put("lighthouseScores", Map.of(
                "performance", job.getMainPerformanceScore(),
                "accessibility", job.getMainAccessibilityScore(),
                "bestPractices", job.getMainBestPracticesScore(),
                "seo", job.getMainSeoScore()
        ));

        List<Map<String, Object>> screenshots = new ArrayList<>();
        for (Screenshot screenshot : job.getScreenshots()) {
            screenshots.add(Map.of(
                    "pageUrl", screenshot.getPageUrl(),
                    "imageUrl", pickUrl(screenshot.getImagePublicUrl(), screenshot.getImageStoragePath()),
                    "heatmapUrl", pickUrl(screenshot.getHeatmapPublicUrl(), screenshot.getHeatmapStoragePath())
            ));
        }
        payload.put("heatmaps", screenshots);
        payload.put("heatmapCount", screenshots.size());

        DesignAnalysisResult design = job.getDesignAnalysisResults();
        if (design != null && (StringUtils.hasText(design.getSummary()) || !design.getKeyPoints().isEmpty())) {
            payload.put("designAnalysis", Map.of(
                    "summary", design.getSummary(),
                    "keyPoints", design.getKeyPoints()
            ));
        }

        Ga4Results ga4 = job.getGa4Results();
        if (ga4 != null && hasGaData(ga4)) {
            Map<String, Object> gaSection = new LinkedHashMap<>();
            gaSection.put("totalUsers", ga4.getTotalUsers());
            gaSection.put("newUsers", ga4.getNewUsers());
            gaSection.put("sessions", ga4.getSessions());
            gaSection.put("engagedSessions", ga4.getEngagedSessions());
            gaSection.put("engagementRate", ga4.getEngagementRate());
            gaSection.put("averageSessionDuration", ga4.getAverageSessionDuration());
            gaSection.put("topPages", ga4.getTopPages());
            gaSection.put("trafficSources", ga4.getTrafficSources());
            gaSection.put("topCountries", ga4.getTopCountries());
            gaSection.put("coreWebVitals", ga4.getCoreWebVitals());
            payload.put("ga4", gaSection);
        }

        ClarityInsights clarity = job.getClarityInsights();
        boolean hasClarityData = clarity != null && !clarity.isEmpty();
        if (hasClarityData && clarity != null) {
            Map<String, Object> claritySection = new LinkedHashMap<>();
            claritySection.put("totals", Map.of(
                    "sessions", clarity.getTotalSessions(),
                    "recordings", clarity.getTotalRecordings(),
                    "activeUsers", clarity.getActiveUsers(),
                    "avgEngagementSeconds", clarity.getAverageEngagementSeconds(),
                    "avgScrollDepth", clarity.getAverageScrollDepth(),
                    "rageClicks", clarity.getRageClicks(),
                    "deadClicks", clarity.getDeadClicks(),
                    "quickBacks", clarity.getQuickBacks()
            ));
            claritySection.put("issues", clarity.getTopIssues());
            claritySection.put("heatmaps", clarity.getHeatmaps());
            claritySection.put("sessions", clarity.getStandoutSessions());
            if (!clarity.getTrafficSources().isEmpty()) {
                claritySection.put("trafficSources", clarity.getTrafficSources());
            }
            if (!clarity.getBrowsers().isEmpty()) {
                claritySection.put("browsers", clarity.getBrowsers());
            }
            if (!clarity.getDevices().isEmpty()) {
                claritySection.put("devices", clarity.getDevices());
            }
            if (!clarity.getOperatingSystems().isEmpty()) {
                claritySection.put("operatingSystems", clarity.getOperatingSystems());
            }
            if (!clarity.getCountries().isEmpty()) {
                claritySection.put("countries", clarity.getCountries());
            }
            if (!clarity.getPageTitles().isEmpty()) {
                claritySection.put("pageTitles", clarity.getPageTitles());
            }
            if (clarity.getPerformanceMetrics() != null) {
                claritySection.put("performanceMetrics", clarity.getPerformanceMetrics());
            }
            if (!clarity.getDiagnosticEvents().isEmpty()) {
                claritySection.put("diagnosticEvents", clarity.getDiagnosticEvents());
            }
            if (clarity.getPageEvents() != null) {
                claritySection.put("pageEvents", clarity.getPageEvents());
            }
            if (!clarity.getCustomEvents().isEmpty()) {
                claritySection.put("customEvents", clarity.getCustomEvents());
            }
            claritySection.put("refreshedAt", job.getClarityRefreshedAt());
            payload.put("clarity", claritySection);
        }

        String json = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(payload);

        String promptIntro = hasClarityData
                ? "You are a senior UX and performance analyst preparing a war-room brief for product, marketing, experimentation, and CRO. Combine Lighthouse scores, GA4 telemetry, Microsoft Clarity user behavior data (including sessions, recordings, rage clicks, dead clicks, traffic sources, devices, browsers, and user interactions), detected AB platforms, the design reference, and every heatmap capture. Never invent data—quote the JSON verbatim or output \"-\" if something is missing."
                : "You are a senior UX and performance analyst preparing a war-room brief for product, marketing, experimentation, and CRO. Combine Lighthouse scores, GA4 telemetry, detected AB platforms, the design reference, and every heatmap capture. Never invent data—quote the JSON verbatim or output \"-\" if something is missing.";

        String dataSignalsSchema = hasClarityData
                ? """
                  "dataSignals": {
                    "ga4":"cite total/new users, engagement rate, and notable channel or page; use '-' if unavailable",
                    "clarity":"cite sessions, recordings, rage clicks, dead clicks, top issues, traffic sources, devices, browsers, or user behavior patterns from clarity data; use '-' if unavailable",
                    "abStack":"list detectedAbPlatforms or '-'",
                    "designRef":"summarize designInputReference or '-'",
                    "coreWebVitals":[{"metric":"LCP","value":"2.8s"}]
                  },"""
                : """
                  "dataSignals": {
                    "ga4":"cite total/new users, engagement rate, and notable channel or page; use '-' if unavailable",
                    "abStack":"list detectedAbPlatforms or '-'",
                    "designRef":"summarize designInputReference or '-'",
                    "coreWebVitals":[{"metric":"LCP","value":"2.8s"}]
                  },""";

        return promptIntro + """

                Respond with a single JSON object (no markdown fences or commentary) that matches this schema:
                {
                  "pulse": {
                    "headline": "primary opportunity or risk tied to a specific metric or URL",
                    "supporting": "secondary signal referencing a different metric or GA4 trend",
                    "impact": "what this means for users or revenue right now"
                  },
                  "scorecard": [
                    {"label":"Performance","score":72,"narrative":"diagnosis plus root cause"},
                    {"label":"Accessibility","score":80,"narrative":"who is affected and why"},
                    {"label":"Best Practices","score":65,"narrative":"security or stability implication"},
                    {"label":"SEO","score":70,"narrative":"visibility or crawlability takeaway"}
                  ],
                  "heatmaps": [
                    {"rank":1,"page":"pageUrl or heatmapUrl","attentionSignal":"what draws focus and why","frictionSource":"layout or content issue","conversionHook":"improvement or experiment tied to the observation"}
                  ],
                  """ + dataSignalsSchema + """
                  "actions": [
                    {"title":"imperative headline","description":"what to change and why","successMetric":"how to measure success"},
                    {"title":"...","description":"...","successMetric":"..."},
                    {"title":"...","description":"...","successMetric":"..."}
                  ]
                }

                Rules:
                - Output JSON only. Do not wrap it in code fences or plain-text explanations.
                - Keep narratives concise so the full JSON stays under 260 words.
                - Reference only data present in the context payload.

                Context:
                ```json
                """ + json + "\n```";
    }

    private boolean hasGaData(Ga4Results ga4) {
        return ga4.getTotalUsers() != null
                || ga4.getNewUsers() != null
                || ga4.getSessions() != null
                || ga4.getEngagedSessions() != null
                || ga4.getEngagementRate() != null
                || ga4.getAverageSessionDuration() != null
                || !ga4.getTopPages().isEmpty()
                || !ga4.getTrafficSources().isEmpty()
                || !ga4.getTopCountries().isEmpty()
                || !ga4.getCoreWebVitals().isEmpty();
    }

    private String pickUrl(String preferred, String fallback) {
        if (StringUtils.hasText(preferred)) {
            return preferred;
        }
        return fallback;
    }
}
