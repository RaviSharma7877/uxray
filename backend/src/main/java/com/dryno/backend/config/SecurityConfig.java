package com.dryno.backend.config;

import com.dryno.backend.security.CustomOAuth2UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationFailureHandler;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.security.web.authentication.logout.SimpleUrlLogoutSuccessHandler;

import java.io.IOException;

@Configuration
public class SecurityConfig {

    private final AppProperties appProperties;
    private final CustomOAuth2UserService customOAuth2UserService;

    public SecurityConfig(AppProperties appProperties,
                          CustomOAuth2UserService customOAuth2UserService) {
        this.appProperties = appProperties;
        this.customOAuth2UserService = customOAuth2UserService;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        SimpleUrlAuthenticationSuccessHandler successHandler =
                new SimpleUrlAuthenticationSuccessHandler(appProperties.getOauth().getSuccessRedirect());
        successHandler.setAlwaysUseDefaultTargetUrl(true);

        // Custom failure handler that redirects to frontend with error info
        AuthenticationFailureHandler failureHandler = new SimpleUrlAuthenticationFailureHandler() {
            @Override
            public void onAuthenticationFailure(HttpServletRequest request, 
                                             HttpServletResponse response, 
                                             AuthenticationException exception) throws IOException {
                String errorMessage = exception.getMessage();
                String redirectUrl = appProperties.getOauth().getSuccessRedirect() + 
                    "?error=authentication_failed&message=" + 
                    java.net.URLEncoder.encode(errorMessage != null ? errorMessage : "Authentication failed", "UTF-8");
                getRedirectStrategy().sendRedirect(request, response, redirectUrl);
            }
        };

        SimpleUrlLogoutSuccessHandler logoutSuccessHandler = new SimpleUrlLogoutSuccessHandler();
        logoutSuccessHandler.setDefaultTargetUrl(appProperties.getOauth().getSuccessRedirect());

        http
                .csrf(csrf -> csrf.disable())
                .cors(Customizer.withDefaults())
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/oauth2/**", "/login/**", "/api/auth/status", "/error", "/favicon.ico").permitAll()
                        .requestMatchers("/api/auth/ga4/**", "/api/clarity/**").authenticated()
                        .anyRequest().permitAll()
                )
                .oauth2Login(oauth -> oauth
                        .successHandler(successHandler)
                        .failureHandler(failureHandler)
                        .userInfoEndpoint(userInfo -> userInfo.userService(customOAuth2UserService))
                )
                .logout(logout -> logout.logoutSuccessHandler(logoutSuccessHandler));
        return http.build();
    }
}
