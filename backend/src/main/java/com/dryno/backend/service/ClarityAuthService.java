package com.dryno.backend.service;

import com.dryno.backend.dto.ClarityProjectResponse;
import com.fasterxml.jackson.databind.JsonNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientService;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.OAuth2AccessToken;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;

import static org.springframework.http.HttpStatus.UNAUTHORIZED;

@Service
public class ClarityAuthService {

    private static final Logger log = LoggerFactory.getLogger(ClarityAuthService.class);
    private static final String CLARITY_API_BASE = "https://api.clarity.ms/v1";

    private final OAuth2AuthorizedClientService authorizedClientService;
    private final RestTemplate restTemplate;

    public ClarityAuthService(OAuth2AuthorizedClientService authorizedClientService,
                              RestTemplateBuilder restTemplateBuilder) {
        this.authorizedClientService = authorizedClientService;
        this.restTemplate = restTemplateBuilder.build();
    }

    public List<ClarityProjectResponse> fetchClarityProjects(OAuth2AuthenticationToken authentication) {
        OAuth2AuthorizedClient client = loadAuthorizedClient(authentication, "azure");
        OAuth2AccessToken accessToken = requireAccessToken(client);

        try {
            // Try to fetch projects using Azure AD token
            // Note: Clarity API might require API token, but we'll try OAuth token first
            String url = CLARITY_API_BASE + "/projects";
            
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(accessToken.getTokenValue());
            headers.set("Accept", "application/json");
            HttpEntity<Void> entity = new HttpEntity<>(headers);
            
            ResponseEntity<JsonNode> response = restTemplate.exchange(url, HttpMethod.GET, entity, JsonNode.class);
            JsonNode responseBody = response.getBody();
            
            List<ClarityProjectResponse> projects = new ArrayList<>();
            if (responseBody != null) {
                JsonNode projectsArray = responseBody.isArray() ? responseBody : responseBody.path("projects");
                if (projectsArray.isArray()) {
                    for (JsonNode project : projectsArray) {
                        String projectId = getText(project, "projectId", "id");
                        String name = getText(project, "name", "displayName");
                        String domain = getText(project, "domain", "url");
                        String status = getText(project, "status", "state");
                        String createdDate = getText(project, "createdDate", "created", "createdAt");
                        
                        if (StringUtils.hasText(projectId)) {
                            projects.add(new ClarityProjectResponse(projectId, name, domain, status, createdDate));
                        }
                    }
                }
            }
            
            // If OAuth token doesn't work, fall back to using ClarityClient with stored API key
            if (projects.isEmpty()) {
                log.info("OAuth token didn't return projects, trying alternative method");
                // This will be handled by the controller to use stored API key
            }
            
            return projects;
        } catch (RestClientResponseException ex) {
            log.warn("Failed to fetch Clarity projects with OAuth token: {} - {}", 
                    ex.getStatusCode(), ex.getResponseBodyAsString());
            // Return empty list - controller can fall back to API key method
            return new ArrayList<>();
        } catch (Exception ex) {
            log.error("Unexpected error fetching Clarity projects", ex);
            return new ArrayList<>();
        }
    }

    private OAuth2AuthorizedClient loadAuthorizedClient(OAuth2AuthenticationToken authentication, String registrationId) {
        if (authentication == null) {
            throw new ResponseStatusException(UNAUTHORIZED, "User is not authenticated with Microsoft");
        }
        OAuth2AuthorizedClient client = authorizedClientService.loadAuthorizedClient(
                registrationId,
                authentication.getName()
        );
        if (client == null) {
            throw new ResponseStatusException(UNAUTHORIZED, "Microsoft authorization has expired. Please reconnect.");
        }
        return client;
    }

    private OAuth2AccessToken requireAccessToken(OAuth2AuthorizedClient client) {
        OAuth2AccessToken token = client.getAccessToken();
        if (token == null || token.getTokenValue() == null) {
            throw new ResponseStatusException(UNAUTHORIZED, "No valid Microsoft access token found");
        }
        return token;
    }

    private String getText(JsonNode node, String... fieldNames) {
        for (String field : fieldNames) {
            JsonNode value = node.path(field);
            if (!value.isMissingNode() && value.isTextual()) {
                return value.asText();
            }
        }
        return null;
    }
}

