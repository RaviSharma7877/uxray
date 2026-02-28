package com.dryno.backend.clarity;

import com.dryno.backend.config.ClarityProperties;
import com.dryno.backend.domain.ClarityInsights;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Component
public class ClarityClient {

    private static final Logger log = LoggerFactory.getLogger(ClarityClient.class);

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .build();

    private final ClarityProperties properties;
    private final ObjectMapper objectMapper;

    public ClarityClient(ClarityProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
    }

    public boolean isEnabled() {
        return properties.isEnabled();
    }

    public Optional<ClarityInsights> fetchInsights(String siteUrl) {
        return fetchInsights(siteUrl, properties.getApiKey(), properties.getProjectId());
    }

    public Optional<ClarityInsights> fetchInsights(String siteUrl, String apiKey, String projectId) {
        if (!StringUtils.hasText(apiKey) || !StringUtils.hasText(projectId)) {
            return Optional.empty();
        }
        try {
            URI uri = buildInsightsUri(siteUrl, projectId);
            HttpRequest request = HttpRequest.newBuilder(uri)
                    .GET()
                    .timeout(Duration.ofSeconds(30))
                    .header("Accept", "application/json")
                    .header("Content-Type", "application/json")
                    .header("Ocp-Apim-Subscription-Key", apiKey)
                    .header("x-api-key", apiKey)
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 400) {
                log.warn("Clarity API returned {} body={}", response.statusCode(), response.body());
                throw new IllegalStateException("Clarity API call failed with status " + response.statusCode());
            }
            return Optional.of(parseInsights(response.body()));
        } catch (IOException | InterruptedException ex) {
            if (ex instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            log.warn("Failed to fetch Clarity insights", ex);
            throw new IllegalStateException("Unable to reach Microsoft Clarity: " + ex.getMessage(), ex);
        }
    }

    public List<com.dryno.backend.dto.ClarityProjectResponse> fetchProjects(String apiKey) {
        if (!StringUtils.hasText(apiKey)) {
            return new ArrayList<>();
        }
        try {
            String base = properties.getBaseUrl();
            if (!StringUtils.hasText(base)) {
                base = "https://api.clarity.ms/v1";
            }
            String trimmedBase = base.endsWith("/") ? base.substring(0, base.length() - 1) : base;
            URI uri = URI.create(trimmedBase + "/projects");

            HttpRequest request = HttpRequest.newBuilder(uri)
                    .GET()
                    .timeout(Duration.ofSeconds(30))
                    .header("Accept", "application/json")
                    .header("Content-Type", "application/json")
                    .header("Ocp-Apim-Subscription-Key", apiKey)
                    .header("x-api-key", apiKey)
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 400) {
                log.warn("Clarity API projects returned {} body={}", response.statusCode(), response.body());
                return new ArrayList<>();
            }
            return parseProjects(response.body());
        } catch (IOException | InterruptedException ex) {
            if (ex instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            log.warn("Failed to fetch Clarity projects", ex);
            return new ArrayList<>();
        }
    }

    private List<com.dryno.backend.dto.ClarityProjectResponse> parseProjects(String body) throws IOException {
        List<com.dryno.backend.dto.ClarityProjectResponse> projects = new ArrayList<>();
        JsonNode root = objectMapper.readTree(body);
        
        JsonNode projectsArray = root.isArray() ? root : root.path("projects");
        if (projectsArray.isArray()) {
            for (JsonNode project : projectsArray) {
                String projectId = text(project, "projectId", "id");
                String name = text(project, "name", "displayName");
                String domain = text(project, "domain", "url");
                String status = text(project, "status", "state");
                String createdDate = text(project, "createdDate", "created", "createdAt");
                
                if (StringUtils.hasText(projectId)) {
                    projects.add(new com.dryno.backend.dto.ClarityProjectResponse(
                            projectId, name, domain, status, createdDate));
                }
            }
        }
        return projects;
    }

    private URI buildInsightsUri(String siteUrl, String projectId) {
        String base = properties.getBaseUrl();
        if (!StringUtils.hasText(base)) {
            base = "https://api.clarity.ms/v1";
        }
        String trimmedBase = base.endsWith("/") ? base.substring(0, base.length() - 1) : base;
        StringBuilder builder = new StringBuilder(trimmedBase)
                .append("/projects/")
                .append(projectId)
                .append("/insights?")
                .append("days=")
                .append(Math.max(1, properties.getLookbackDays()));
        if (StringUtils.hasText(siteUrl)) {
            builder.append("&siteUrl=").append(URLEncoder.encode(siteUrl, StandardCharsets.UTF_8));
        }
        builder.append("&take=").append(Math.max(1, properties.getTopEntries()));
        return URI.create(builder.toString());
    }

    private ClarityInsights parseInsights(String body) throws IOException {
        JsonNode root = objectMapper.readTree(body);
        ClarityInsights insights = new ClarityInsights();

        JsonNode summary = firstNonEmpty(root.path("summary"), root.path("totals"), root.path("aggregates"));
        if (!summary.isMissingNode()) {
            insights.setTotalSessions(readInt(summary, "sessions", "totalSessions", "sessionCount"));
            insights.setTotalRecordings(readInt(summary, "recordings", "totalRecordings"));
            insights.setActiveUsers(readInt(summary, "activeUsers", "users"));
            insights.setAverageEngagementSeconds(readDouble(summary, "averageEngagementTime", "avgEngagement", "avgEngagementSeconds"));
            insights.setAverageScrollDepth(readDouble(summary, "avgScroll", "averageScrollDepth"));
        }

        JsonNode behaviors = firstNonEmpty(root.path("behaviors"), root.path("behavior"));
        if (!behaviors.isMissingNode()) {
            insights.setRageClicks(readInt(behaviors, "rageClicks"));
            insights.setDeadClicks(readInt(behaviors, "deadClicks"));
            insights.setQuickBacks(readInt(behaviors, "quickBacks", "quickBack"));
        } else {
            insights.setRageClicks(readInt(root, "rageClicks"));
            insights.setDeadClicks(readInt(root, "deadClicks"));
            insights.setQuickBacks(readInt(root, "quickBacks"));
        }

        JsonNode issues = firstNonEmpty(root.path("topIssues"), root.path("issues"));
        insights.replaceTopIssues(readIssues(issues));

        JsonNode heatmaps = firstNonEmpty(root.path("heatmaps"), root.path("topPages"));
        insights.replaceHeatmaps(readHeatmaps(heatmaps));

        JsonNode sessions = firstNonEmpty(root.path("sessions"), root.path("standoutSessions"));
        insights.replaceStandoutSessions(readSessions(sessions));

        if (insights.isEmpty()) {
            log.debug("Clarity response had no actionable fields: {}", body);
        }
        return insights;
    }

    private List<ClarityInsights.ClarityInsight> readIssues(JsonNode node) {
        List<ClarityInsights.ClarityInsight> issues = new ArrayList<>();
        if (node != null && node.isArray()) {
            for (JsonNode issue : node) {
                String title = text(issue, "title", "name");
                if (!StringUtils.hasText(title)) {
                    continue;
                }
                issues.add(new ClarityInsights.ClarityInsight(
                        title,
                        text(issue, "metric", "type"),
                        text(issue, "severity", "level"),
                        text(issue, "url", "link"),
                        readDouble(issue, "value", "score"),
                        text(issue, "description", "insight")
                ));
            }
        }
        return issues;
    }

    private List<ClarityInsights.ClarityHeatmap> readHeatmaps(JsonNode node) {
        List<ClarityInsights.ClarityHeatmap> heatmaps = new ArrayList<>();
        if (node != null && node.isArray()) {
            for (JsonNode heatmap : node) {
                String url = text(heatmap, "url", "pageUrl", "page");
                if (!StringUtils.hasText(url)) {
                    continue;
                }
                heatmaps.add(new ClarityInsights.ClarityHeatmap(
                        url,
                        readInt(heatmap, "views", "sessions"),
                        readDouble(heatmap, "clickRate", "clicks"),
                        readDouble(heatmap, "scrollDepth", "scroll"),
                        readDouble(heatmap, "engagementTime", "engagement", "avgEngagement")
                ));
            }
        }
        return heatmaps;
    }

    private List<ClarityInsights.ClaritySession> readSessions(JsonNode node) {
        List<ClarityInsights.ClaritySession> sessions = new ArrayList<>();
        if (node != null && node.isArray()) {
            for (JsonNode session : node) {
                String id = text(session, "sessionId", "id");
                if (!StringUtils.hasText(id)) {
                    continue;
                }
                sessions.add(new ClarityInsights.ClaritySession(
                        id,
                        text(session, "entryPage", "entryUrl"),
                        text(session, "exitPage", "exitUrl"),
                        readDouble(session, "durationSeconds", "duration"),
                        readInt(session, "interactions", "clicks"),
                        text(session, "device", "deviceType"),
                        text(session, "notes", "insight")
                ));
            }
        }
        return sessions;
    }

    private JsonNode firstNonEmpty(JsonNode... nodes) {
        for (JsonNode node : nodes) {
            if (node != null && !node.isMissingNode() && !node.isNull() &&
                    (node.isValueNode() || node.size() > 0)) {
                return node;
            }
        }
        return com.fasterxml.jackson.databind.node.NullNode.getInstance();
    }

    private Integer readInt(JsonNode node, String... fieldNames) {
        for (String field : fieldNames) {
            JsonNode value = node.path(field);
            if (!value.isMissingNode() && value.isNumber()) {
                return value.asInt();
            }
        }
        return null;
    }

    private Double readDouble(JsonNode node, String... fieldNames) {
        for (String field : fieldNames) {
            JsonNode value = node.path(field);
            if (!value.isMissingNode() && value.isNumber()) {
                return value.asDouble();
            }
        }
        return null;
    }

    private String text(JsonNode node, String... fieldNames) {
        for (String field : fieldNames) {
            JsonNode value = node.path(field);
            if (!value.isMissingNode() && value.isTextual()) {
                return value.asText();
            }
        }
        return null;
    }
}
