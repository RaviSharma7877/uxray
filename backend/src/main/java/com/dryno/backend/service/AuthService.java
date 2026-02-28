package com.dryno.backend.service;

import com.dryno.backend.domain.Ga4Results;
import com.dryno.backend.dto.Ga4PropertyResponse;
import com.dryno.backend.dto.Ga4ResultsResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientService;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.OAuth2AccessToken;
import org.springframework.security.oauth2.core.OAuth2RefreshToken;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.UNAUTHORIZED;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);
    private static final String ADMIN_ACCOUNT_SUMMARIES_URL = "https://analyticsadmin.googleapis.com/v1beta/accountSummaries";
    private static final String DATA_API_BASE_URL = "https://analyticsdata.googleapis.com/v1beta/";

    private final OAuth2AuthorizedClientService authorizedClientService;
    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate;

    public AuthService(OAuth2AuthorizedClientService authorizedClientService,
                       ObjectMapper objectMapper,
                       RestTemplateBuilder restTemplateBuilder) {
        this.authorizedClientService = authorizedClientService;
        this.objectMapper = objectMapper;
        this.restTemplate = restTemplateBuilder.build();
    }

    public List<Ga4PropertyResponse> fetchGa4Properties(OAuth2AuthenticationToken authentication) {
        // Always load Google client, even if current auth is Azure
        OAuth2AuthorizedClient client = loadAuthorizedClient("google", authentication.getName());
        OAuth2AccessToken accessToken = requireAccessToken(client);

        try {
            JsonNode responseBody = exchangeGetJson(ADMIN_ACCOUNT_SUMMARIES_URL, accessToken.getTokenValue());
            List<Ga4PropertyResponse> properties = new ArrayList<>();
            if (responseBody != null && responseBody.has("accountSummaries")) {
                for (JsonNode accountSummary : responseBody.get("accountSummaries")) {
                    JsonNode propertySummaries = accountSummary.path("propertySummaries");
                    if (propertySummaries.isArray()) {
                        for (JsonNode property : propertySummaries) {
                            String propertyName = property.path("property").asText(null);
                            String displayName = property.path("displayName").asText(propertyName);
                            if (StringUtils.hasText(propertyName)) {
                                properties.add(new Ga4PropertyResponse(propertyName, displayName));
                            }
                        }
                    }
                }
            }
            return properties;
        } catch (RestClientResponseException ex) {
            log.warn("Failed to fetch GA4 properties: {}", ex.getResponseBodyAsString());
            throw new ResponseStatusException(BAD_REQUEST, "Unable to fetch GA4 properties");
        } catch (Exception ex) {
            log.error("Unexpected error fetching GA4 properties", ex);
            throw new ResponseStatusException(BAD_REQUEST, "Unable to fetch GA4 properties");
        }
    }

    public Ga4ResultsResponse fetchAnalytics(OAuth2AuthenticationToken authentication, String propertyId) {
        // Always load Google client, even if current auth is Azure
        OAuth2AuthorizedClient client = loadAuthorizedClient("google", authentication.getName());
        OAuth2AccessToken accessToken = requireAccessToken(client);

        String normalizedProperty = normalizePropertyId(propertyId);
        Ga4Results results = new Ga4Results();

        try {
            populateTotals(accessToken, normalizedProperty, results);
            populateTopPages(accessToken, normalizedProperty, results);
            populateTrafficSources(accessToken, normalizedProperty, results);
            populateTopCountries(accessToken, normalizedProperty, results);
            populateTopEvents(accessToken, normalizedProperty, results);
            populateAcquisitionChannels(accessToken, normalizedProperty, results);
            populateDeviceTechnology(accessToken, normalizedProperty, results);
            populateDemographics(accessToken, normalizedProperty, results);
            // Note: Core Web Vitals requires PageSpeed API key, skipped here for direct fetch
            // Core Web Vitals are populated by the GA4 service worker instead
        } catch (RestClientResponseException ex) {
            log.warn("Failed to fetch GA4 analytics for {}: {}", normalizedProperty, ex.getResponseBodyAsString());
            throw new ResponseStatusException(BAD_REQUEST, "Unable to fetch GA4 analytics data");
        } catch (Exception ex) {
            log.error("Unexpected error fetching GA4 analytics for {}", normalizedProperty, ex);
            throw new ResponseStatusException(BAD_REQUEST, "Unable to fetch GA4 analytics data");
        }

        return Ga4ResultsResponse.from(results);
    }

    public String getRefreshToken(Authentication authentication) {
        if (!(authentication instanceof OAuth2AuthenticationToken authToken)) {
            return null;
        }
        OAuth2AuthorizedClient client = authorizedClientService.loadAuthorizedClient(
                authToken.getAuthorizedClientRegistrationId(),
                authToken.getName()
        );
        if (client == null) {
            return null;
        }
        OAuth2RefreshToken refreshToken = client.getRefreshToken();
        return refreshToken != null ? refreshToken.getTokenValue() : null;
    }

    private void populateTotals(OAuth2AccessToken accessToken, String property, Ga4Results results) {
        ObjectNode request = baseRequest();
        ArrayNode metrics = request.putArray("metrics");
        metrics.addObject().put("name", "totalUsers");
        metrics.addObject().put("name", "newUsers");
        metrics.addObject().put("name", "sessions");
        metrics.addObject().put("name", "engagedSessions");
        metrics.addObject().put("name", "averageSessionDuration");
        metrics.addObject().put("name", "engagementRate");

        JsonNode response = runReport(accessToken, property, request);
        JsonNode rows = response.path("rows");
        if (rows.isArray() && rows.size() > 0) {
            JsonNode metricsNode = rows.get(0).path("metricValues");
            results.setTotalUsers(parseInteger(metricsNode, 0));
            results.setNewUsers(parseInteger(metricsNode, 1));
            results.setSessions(parseInteger(metricsNode, 2));
            results.setEngagedSessions(parseInteger(metricsNode, 3));
            results.setAverageSessionDuration(parseDouble(metricsNode, 4));
            results.setEngagementRate(parseDouble(metricsNode, 5));
        }
    }

    private void populateTopPages(OAuth2AccessToken accessToken, String property, Ga4Results results) {
        ObjectNode request = baseRequest();
        ArrayNode metrics = request.putArray("metrics");
        metrics.addObject().put("name", "screenPageViews");
        metrics.addObject().put("name", "totalUsers");
        metrics.addObject().put("name", "averageSessionDuration");

        ArrayNode dimensions = request.putArray("dimensions");
        dimensions.addObject().put("name", "pagePath");
        dimensions.addObject().put("name", "pageTitle");

        ArrayNode orderBys = request.putArray("orderBys");
        ObjectNode order = orderBys.addObject();
        ObjectNode metric = order.putObject("metric");
        metric.put("metricName", "screenPageViews");
        order.put("desc", true);
        request.put("limit", 5);

        JsonNode response = runReport(accessToken, property, request);
        JsonNode rows = response.path("rows");
        if (rows.isArray()) {
            List<Ga4Results.Ga4Page> pages = new ArrayList<>();
            for (JsonNode row : rows) {
                JsonNode dimensionsNode = row.path("dimensionValues");
                String pagePath = getDimensionValue(dimensionsNode, 0);
                String pageTitle = getDimensionValue(dimensionsNode, 1);

                JsonNode metricsNode = row.path("metricValues");
                Integer views = parseInteger(metricsNode, 0);
                Integer users = parseInteger(metricsNode, 1);
                Double avgSessionDuration = parseDouble(metricsNode, 2);
                pages.add(new Ga4Results.Ga4Page(pagePath, pageTitle, views, users, avgSessionDuration));
            }
            results.replaceTopPages(pages);
        }
    }

    private void populateTrafficSources(OAuth2AccessToken accessToken, String property, Ga4Results results) {
        ObjectNode request = baseRequest();
        ArrayNode metrics = request.putArray("metrics");
        metrics.addObject().put("name", "sessions");

        ArrayNode dimensions = request.putArray("dimensions");
        dimensions.addObject().put("name", "sessionSource");
        dimensions.addObject().put("name", "sessionMedium");

        ArrayNode orderBys = request.putArray("orderBys");
        ObjectNode order = orderBys.addObject();
        ObjectNode metric = order.putObject("metric");
        metric.put("metricName", "sessions");
        order.put("desc", true);
        request.put("limit", 5);

        JsonNode response = runReport(accessToken, property, request);
        JsonNode rows = response.path("rows");
        if (rows.isArray()) {
            List<Ga4Results.Ga4TrafficSource> trafficSources = new ArrayList<>();
            for (JsonNode row : rows) {
                JsonNode dimensionsNode = row.path("dimensionValues");
                String source = getDimensionValue(dimensionsNode, 0);
                String medium = getDimensionValue(dimensionsNode, 1);
                Integer sessions = parseInteger(row.path("metricValues"), 0);
                trafficSources.add(new Ga4Results.Ga4TrafficSource(source, medium, sessions));
            }
            results.replaceTrafficSources(trafficSources);
        }
    }

    private void populateTopCountries(OAuth2AccessToken accessToken, String property, Ga4Results results) {
        ObjectNode request = baseRequest();
        ArrayNode metrics = request.putArray("metrics");
        metrics.addObject().put("name", "totalUsers");

        ArrayNode dimensions = request.putArray("dimensions");
        dimensions.addObject().put("name", "country");

        ArrayNode orderBys = request.putArray("orderBys");
        ObjectNode order = orderBys.addObject();
        ObjectNode metric = order.putObject("metric");
        metric.put("metricName", "totalUsers");
        order.put("desc", true);
        request.put("limit", 5);

        JsonNode response = runReport(accessToken, property, request);
        JsonNode rows = response.path("rows");
        if (rows.isArray()) {
            List<Ga4Results.Ga4Country> countries = new ArrayList<>();
            for (JsonNode row : rows) {
                String country = getDimensionValue(row.path("dimensionValues"), 0);
                Integer users = parseInteger(row.path("metricValues"), 0);
                countries.add(new Ga4Results.Ga4Country(country, users));
            }
            results.replaceTopCountries(countries);
        }
    }

    private void populateTopEvents(OAuth2AccessToken accessToken, String property, Ga4Results results) {
        ObjectNode request = baseRequest();
        ArrayNode metrics = request.putArray("metrics");
        metrics.addObject().put("name", "eventCount");

        ArrayNode dimensions = request.putArray("dimensions");
        dimensions.addObject().put("name", "eventName");

        ArrayNode orderBys = request.putArray("orderBys");
        ObjectNode order = orderBys.addObject();
        ObjectNode metric = order.putObject("metric");
        metric.put("metricName", "eventCount");
        order.put("desc", true);
        request.put("limit", 10);

        JsonNode response = runReport(accessToken, property, request);
        JsonNode rows = response.path("rows");
        if (rows.isArray()) {
            List<Ga4Results.Ga4Event> events = new ArrayList<>();
            for (JsonNode row : rows) {
                String eventName = getDimensionValue(row.path("dimensionValues"), 0);
                Integer eventCount = parseInteger(row.path("metricValues"), 0);
                events.add(new Ga4Results.Ga4Event(eventName, eventCount));
            }
            results.replaceTopEvents(events);
        }
    }

    private void populateAcquisitionChannels(OAuth2AccessToken accessToken, String property, Ga4Results results) {
        ObjectNode request = baseRequest();
        ArrayNode metrics = request.putArray("metrics");
        metrics.addObject().put("name", "sessions");
        metrics.addObject().put("name", "activeUsers");

        ArrayNode dimensions = request.putArray("dimensions");
        dimensions.addObject().put("name", "sessionDefaultChannelGroup");

        ArrayNode orderBys = request.putArray("orderBys");
        ObjectNode order = orderBys.addObject();
        ObjectNode metric = order.putObject("metric");
        metric.put("metricName", "sessions");
        order.put("desc", true);
        request.put("limit", 10);

        JsonNode response = runReport(accessToken, property, request);
        JsonNode rows = response.path("rows");
        if (rows.isArray()) {
            List<Ga4Results.Ga4AcquisitionChannel> channels = new ArrayList<>();
            for (JsonNode row : rows) {
                String channel = getDimensionValue(row.path("dimensionValues"), 0);
                Integer sessions = parseInteger(row.path("metricValues"), 0);
                Integer activeUsers = parseInteger(row.path("metricValues"), 1);
                channels.add(new Ga4Results.Ga4AcquisitionChannel(channel, sessions, activeUsers));
            }
            results.replaceAcquisitionChannels(channels);
        }
    }

    private void populateDeviceTechnology(OAuth2AccessToken accessToken, String property, Ga4Results results) {
        ObjectNode request = baseRequest();
        ArrayNode metrics = request.putArray("metrics");
        metrics.addObject().put("name", "sessions");
        metrics.addObject().put("name", "activeUsers");

        ArrayNode dimensions = request.putArray("dimensions");
        dimensions.addObject().put("name", "deviceCategory");
        dimensions.addObject().put("name", "operatingSystem");
        dimensions.addObject().put("name", "browser");

        ArrayNode orderBys = request.putArray("orderBys");
        ObjectNode order = orderBys.addObject();
        ObjectNode metric = order.putObject("metric");
        metric.put("metricName", "sessions");
        order.put("desc", true);
        request.put("limit", 25);

        JsonNode response = runReport(accessToken, property, request);
        JsonNode rows = response.path("rows");
        if (rows.isArray()) {
            List<Ga4Results.Ga4DeviceTechnology> devices = new ArrayList<>();
            for (JsonNode row : rows) {
                JsonNode dimensionsNode = row.path("dimensionValues");
                String deviceCategory = getDimensionValue(dimensionsNode, 0);
                String operatingSystem = getDimensionValue(dimensionsNode, 1);
                String browser = getDimensionValue(dimensionsNode, 2);
                Integer sessions = parseInteger(row.path("metricValues"), 0);
                Integer activeUsers = parseInteger(row.path("metricValues"), 1);
                devices.add(new Ga4Results.Ga4DeviceTechnology(deviceCategory, operatingSystem, browser, sessions, activeUsers));
            }
            results.replaceDeviceTechnology(devices);
        }
    }

    private void populateDemographics(OAuth2AccessToken accessToken, String property, Ga4Results results) {
        ObjectNode request = baseRequest();
        ArrayNode metrics = request.putArray("metrics");
        metrics.addObject().put("name", "activeUsers");

        ArrayNode dimensions = request.putArray("dimensions");
        dimensions.addObject().put("name", "country");
        dimensions.addObject().put("name", "city");
        dimensions.addObject().put("name", "language");

        ArrayNode orderBys = request.putArray("orderBys");
        ObjectNode order = orderBys.addObject();
        ObjectNode metric = order.putObject("metric");
        metric.put("metricName", "activeUsers");
        order.put("desc", true);
        request.put("limit", 25);

        JsonNode response = runReport(accessToken, property, request);
        JsonNode rows = response.path("rows");
        if (rows.isArray()) {
            List<Ga4Results.Ga4Demographics> demographics = new ArrayList<>();
            for (JsonNode row : rows) {
                JsonNode dimensionsNode = row.path("dimensionValues");
                String country = getDimensionValue(dimensionsNode, 0);
                String city = getDimensionValue(dimensionsNode, 1);
                String language = getDimensionValue(dimensionsNode, 2);
                Integer activeUsers = parseInteger(row.path("metricValues"), 0);
                demographics.add(new Ga4Results.Ga4Demographics(country, city, language, activeUsers));
            }
            results.replaceDemographics(demographics);
        }
    }

    private ObjectNode baseRequest() {
        ObjectNode request = objectMapper.createObjectNode();
        ArrayNode dateRanges = request.putArray("dateRanges");
        ObjectNode dateRange = dateRanges.addObject();
        dateRange.put("startDate", "28daysAgo");
        dateRange.put("endDate", "today");
        return request;
    }

    private JsonNode runReport(OAuth2AccessToken accessToken, String property, JsonNode request) {
        String url = DATA_API_BASE_URL + property + ":runReport";
        return exchangePostJson(url, accessToken.getTokenValue(), request);
    }

    private JsonNode exchangeGetJson(String url, String accessToken) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        HttpEntity<Void> entity = new HttpEntity<>(headers);
        ResponseEntity<JsonNode> response = restTemplate.exchange(url, HttpMethod.GET, entity, JsonNode.class);
        return response.getBody();
    }

    private JsonNode exchangePostJson(String url, String accessToken, JsonNode body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<JsonNode> entity = new HttpEntity<>(body, headers);
        ResponseEntity<JsonNode> response = restTemplate.exchange(url, HttpMethod.POST, entity, JsonNode.class);
        return response.getBody();
    }

    private OAuth2AuthorizedClient loadAuthorizedClient(String registrationId, String principalName) {
        OAuth2AuthorizedClient client = authorizedClientService.loadAuthorizedClient(
                registrationId,
                principalName
        );
        if (client == null) {
            throw new ResponseStatusException(UNAUTHORIZED, 
                String.format("%s authorization not found. Please login with %s first.", 
                    registrationId.equals("google") ? "Google" : "Microsoft", 
                    registrationId.equals("google") ? "Google" : "Microsoft"));
        }
        return client;
    }

    private OAuth2AccessToken requireAccessToken(OAuth2AuthorizedClient client) {
        OAuth2AccessToken token = client.getAccessToken();
        if (token == null || token.getTokenValue() == null) {
            throw new ResponseStatusException(UNAUTHORIZED, "No valid Google access token found");
        }

        if (token.getExpiresAt() != null && token.getExpiresAt().isBefore(Instant.now().minusSeconds(30))) {
            throw new ResponseStatusException(UNAUTHORIZED, "Google access token expired");
        }
        return token;
    }

    private String normalizePropertyId(String propertyId) {
        if (!StringUtils.hasText(propertyId)) {
            throw new ResponseStatusException(BAD_REQUEST, "propertyId is required");
        }
        return propertyId.startsWith("properties/") ? propertyId : "properties/" + propertyId;
    }

    private Integer parseInteger(JsonNode metricsNode, int index) {
        String value = metricsNode != null && metricsNode.has(index)
                ? metricsNode.get(index).path("value").asText(null)
                : null;
        if (!StringUtils.hasText(value)) {
            return null;
        }
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private Double parseDouble(JsonNode metricsNode, int index) {
        String value = metricsNode != null && metricsNode.has(index)
                ? metricsNode.get(index).path("value").asText(null)
                : null;
        if (!StringUtils.hasText(value)) {
            return null;
        }
        try {
            return Double.parseDouble(value);
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private String getDimensionValue(JsonNode dimensionsNode, int index) {
        if (dimensionsNode == null || !dimensionsNode.has(index)) {
            return "";
        }
        return Objects.toString(dimensionsNode.get(index).path("value").asText(""), "");
    }
}
