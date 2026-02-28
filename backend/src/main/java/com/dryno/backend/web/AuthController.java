package com.dryno.backend.web;

import com.dryno.backend.dto.Ga4PropertyResponse;
import com.dryno.backend.dto.Ga4ResultsResponse;
import com.dryno.backend.service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientService;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.springframework.http.HttpStatus.UNAUTHORIZED;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final OAuth2AuthorizedClientService authorizedClientService;

    public AuthController(AuthService authService, OAuth2AuthorizedClientService authorizedClientService) {
        this.authService = authService;
        this.authorizedClientService = authorizedClientService;
    }

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> status(Authentication authentication) {
        Map<String, Object> response = new HashMap<>();
        boolean isAuthenticated = authentication instanceof OAuth2AuthenticationToken;
        response.put("authenticated", isAuthenticated);
        
        boolean hasGoogle = false;
        boolean hasAzure = false;
        String currentProvider = null;
        
        if (isAuthenticated) {
            OAuth2AuthenticationToken token = (OAuth2AuthenticationToken) authentication;
            String principalName = authentication.getName();
            currentProvider = token.getAuthorizedClientRegistrationId();
            
            response.put("principalName", principalName);
            response.put("provider", currentProvider);
            
            // Check if Google authorized client exists (even if current auth is Azure)
            OAuth2AuthorizedClient googleClient = authorizedClientService.loadAuthorizedClient("google", principalName);
            hasGoogle = googleClient != null;
            
            // Check if Azure authorized client exists (even if current auth is Google)
            OAuth2AuthorizedClient azureClient = authorizedClientService.loadAuthorizedClient("azure", principalName);
            hasAzure = azureClient != null;
            
            // Also check current provider
            if ("google".equals(currentProvider)) {
                hasGoogle = true;
            } else if ("azure".equals(currentProvider)) {
                hasAzure = true;
            }
        }
        
        response.put("hasGoogle", hasGoogle);
        response.put("hasAzure", hasAzure);
        
        return ResponseEntity.ok(response);
    }

    @GetMapping("/ga4/properties")
    public ResponseEntity<List<Ga4PropertyResponse>> properties(Authentication authentication) {
        if (!(authentication instanceof OAuth2AuthenticationToken)) {
            throw new ResponseStatusException(UNAUTHORIZED, "Authentication required");
        }
        OAuth2AuthenticationToken token = (OAuth2AuthenticationToken) authentication;
        // Allow if authenticated with Google OR if Google authorized client exists
        boolean hasGoogle = "google".equals(token.getAuthorizedClientRegistrationId()) ||
                authorizedClientService.loadAuthorizedClient("google", authentication.getName()) != null;
        
        if (!hasGoogle) {
            throw new ResponseStatusException(UNAUTHORIZED, "Google OAuth authentication required for GA4. Please login with Google first.");
        }
        return ResponseEntity.ok(authService.fetchGa4Properties(token));
    }

    @GetMapping("/ga4/analytics")
    public ResponseEntity<Ga4ResultsResponse> analytics(@RequestParam String propertyId,
                                                        Authentication authentication) {
        if (!(authentication instanceof OAuth2AuthenticationToken)) {
            throw new ResponseStatusException(UNAUTHORIZED, "Authentication required");
        }
        OAuth2AuthenticationToken token = (OAuth2AuthenticationToken) authentication;
        // Allow if authenticated with Google OR if Google authorized client exists
        boolean hasGoogle = "google".equals(token.getAuthorizedClientRegistrationId()) ||
                authorizedClientService.loadAuthorizedClient("google", authentication.getName()) != null;
        
        if (!hasGoogle) {
            throw new ResponseStatusException(UNAUTHORIZED, "Google OAuth authentication required for GA4. Please login with Google first.");
        }
        return ResponseEntity.ok(authService.fetchAnalytics(token, propertyId));
    }
}
