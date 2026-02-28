package com.dryno.backend.security;

import com.dryno.backend.service.UserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.Map;

@Service
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    private static final Logger log = LoggerFactory.getLogger(CustomOAuth2UserService.class);

    private final UserService userService;

    public CustomOAuth2UserService(UserService userService) {
        this.userService = userService;
    }

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oauthUser = super.loadUser(userRequest);
        String registrationId = userRequest.getClientRegistration().getRegistrationId();
        if ("google".equals(registrationId)) {
            syncGoogleUser(oauthUser);
        } else if ("azure".equals(registrationId)) {
            syncAzureUser(oauthUser);
        }
        return oauthUser;
    }

    private void syncGoogleUser(OAuth2User oauthUser) {
        Map<String, Object> attributes = oauthUser.getAttributes();
        String googleId = getString(attributes, "sub");
        String email = getString(attributes, "email");
        String name = getString(attributes, "name");
        String picture = getString(attributes, "picture");

        if (!StringUtils.hasText(email)) {
            log.warn("Google OAuth user missing email attribute; skipping persistence");
            return;
        }
        userService.findOrCreateUser(googleId, email, name, picture);
    }

    private void syncAzureUser(OAuth2User oauthUser) {
        Map<String, Object> attributes = oauthUser.getAttributes();
        String azureId = getString(attributes, "id");
        String email = getString(attributes, "mail", "userPrincipalName", "preferred_username");
        String displayName = getString(attributes, "displayName");
        if (!StringUtils.hasText(displayName)) {
            String given = getString(attributes, "givenName");
            String surname = getString(attributes, "surname");
            displayName = String.format("%s %s",
                    StringUtils.hasText(given) ? given : "",
                    StringUtils.hasText(surname) ? surname : "").trim();
        }

        if (!StringUtils.hasText(email)) {
            log.warn("Azure OAuth user missing email attribute; skipping persistence");
            return;
        }
        userService.syncAzureUser(azureId, email, displayName, null);
    }

    private String getString(Map<String, Object> attributes, String... keys) {
        for (String key : keys) {
            Object value = attributes.get(key);
            if (value instanceof String str && StringUtils.hasText(str)) {
                return str;
            }
        }
        return null;
    }
}
