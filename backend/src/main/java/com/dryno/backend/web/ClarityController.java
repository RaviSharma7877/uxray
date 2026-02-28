package com.dryno.backend.web;

import com.dryno.backend.clarity.ClarityClient;
import com.dryno.backend.dto.ClarityApiKeyRequest;
import com.dryno.backend.dto.ClarityProjectResponse;
import com.dryno.backend.entity.User;
import com.dryno.backend.service.ClarityAuthService;
import com.dryno.backend.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.web.bind.annotation.*;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/clarity")
public class ClarityController {

    private final ClarityClient clarityClient;
    private final ClarityAuthService clarityAuthService;
    private final UserService userService;

    public ClarityController(ClarityClient clarityClient, 
                            ClarityAuthService clarityAuthService,
                            UserService userService) {
        this.clarityClient = clarityClient;
        this.clarityAuthService = clarityAuthService;
        this.userService = userService;
    }

    @GetMapping("/projects")
    public ResponseEntity<List<ClarityProjectResponse>> getProjects(Authentication authentication) {
        // Try OAuth first if user is authenticated with Microsoft
        if (authentication instanceof OAuth2AuthenticationToken authToken && 
            "azure".equals(authToken.getAuthorizedClientRegistrationId())) {
            try {
                List<ClarityProjectResponse> projects = clarityAuthService.fetchClarityProjects(authToken);
                if (!projects.isEmpty()) {
                    return ResponseEntity.ok(projects);
                }
            } catch (Exception ex) {
                // Fall through to API key method
            }
        }
        
        // Fall back to API key method
        User user = getCurrentUser(authentication);
        if (user.getClarityApiKey() == null || user.getClarityApiKey().isEmpty()) {
            return ResponseEntity.ok(List.of());
        }
        List<ClarityProjectResponse> projects = clarityClient.fetchProjects(user.getClarityApiKey());
        return ResponseEntity.ok(projects);
    }

    @PostMapping("/api-key")
    public ResponseEntity<Map<String, Object>> setApiKey(@Valid @RequestBody ClarityApiKeyRequest request,
                                                          Authentication authentication) {
        User user = getCurrentUser(authentication);
        user.setClarityApiKey(request.getApiKey());
        userService.updateUser(user.getId(), user);
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Clarity API key saved successfully");
        return ResponseEntity.ok(response);
    }

    @GetMapping("/api-key/status")
    public ResponseEntity<Map<String, Object>> getApiKeyStatus(Authentication authentication) {
        User user = getCurrentUser(authentication);
        Map<String, Object> response = new HashMap<>();
        boolean hasApiKey = user.getClarityApiKey() != null && !user.getClarityApiKey().isEmpty();
        boolean hasOAuth = authentication instanceof OAuth2AuthenticationToken && 
                          "azure".equals(((OAuth2AuthenticationToken) authentication).getAuthorizedClientRegistrationId());
        response.put("hasApiKey", hasApiKey);
        response.put("hasOAuth", hasOAuth);
        if (hasApiKey) {
            response.put("projectCount", user.getClarityProjectIds() != null ? 
                user.getClarityProjectIds().split(",").length : 0);
        }
        return ResponseEntity.ok(response);
    }

    private User getCurrentUser(Authentication authentication) {
        if (!(authentication instanceof OAuth2AuthenticationToken token)) {
            throw new RuntimeException("User not authenticated");
        }

        String email = extractEmail(token);
        if (!StringUtils.hasText(email)) {
            throw new RuntimeException("Authenticated user is missing an email address");
        }

        return userService.getUserByEmail(email)
                .orElseGet(() -> userService.createUser(buildUserFromToken(token, email)));
    }

    private User buildUserFromToken(OAuth2AuthenticationToken token, String email) {
        User user = new User();
        user.setEmail(email);
        user.setName(extractName(token));
        String provider = token.getAuthorizedClientRegistrationId();
        if ("google".equals(provider)) {
            user.setGoogleId(getAttribute(token, "sub"));
            user.setPictureUrl(getAttribute(token, "picture"));
        } else if ("azure".equals(provider)) {
            user.setAzureId(getAttribute(token, "id"));
        }
        return user;
    }

    private String extractEmail(OAuth2AuthenticationToken token) {
        return firstNonEmpty(
                getAttribute(token, "email"),
                getAttribute(token, "mail"),
                getAttribute(token, "userPrincipalName"),
                getAttribute(token, "preferred_username")
        );
    }

    private String extractName(OAuth2AuthenticationToken token) {
        String displayName = firstNonEmpty(
                getAttribute(token, "name"),
                getAttribute(token, "displayName")
        );
        if (StringUtils.hasText(displayName)) {
            return displayName;
        }
        String given = firstNonEmpty(
                getAttribute(token, "given_name"),
                getAttribute(token, "givenName")
        );
        String family = firstNonEmpty(
                getAttribute(token, "family_name"),
                getAttribute(token, "surname")
        );
        if (StringUtils.hasText(given) || StringUtils.hasText(family)) {
            StringBuilder builder = new StringBuilder();
            if (StringUtils.hasText(given)) {
                builder.append(given.trim());
            }
            if (StringUtils.hasText(family)) {
                if (builder.length() > 0) {
                    builder.append(' ');
                }
                builder.append(family.trim());
            }
            return builder.toString();
        }
        return null;
    }

    private String firstNonEmpty(String... candidates) {
        if (candidates == null) {
            return null;
        }
        for (String candidate : candidates) {
            if (StringUtils.hasText(candidate)) {
                return candidate;
            }
        }
        return null;
    }

    private String getAttribute(OAuth2AuthenticationToken token, String key) {
        Object value = token.getPrincipal().getAttributes().get(key);
        if (value instanceof String str) {
            return StringUtils.hasText(str) ? str : null;
        }
        return null;
    }
}
