package com.dryno.backend.web;

import com.dryno.backend.config.AppProperties;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.io.IOException;

@Controller
public class LoginController {

    private static final Logger log = LoggerFactory.getLogger(LoginController.class);
    private final AppProperties appProperties;

    public LoginController(AppProperties appProperties) {
        this.appProperties = appProperties;
    }

    @GetMapping("/login")
    public void handleLogin(HttpServletRequest request, 
                           HttpServletResponse response,
                           @RequestParam(required = false) String error) throws IOException {
        if (error != null) {
            log.warn("OAuth login error: {}", error);
            String errorMessage = request.getParameter("error_description");
            if (errorMessage == null) {
                errorMessage = "Authentication failed. Please check your Azure AD configuration.";
            }
            String redirectUrl = appProperties.getOauth().getSuccessRedirect() + 
                "?error=authentication_failed&message=" + 
                java.net.URLEncoder.encode(errorMessage, "UTF-8");
            response.sendRedirect(redirectUrl);
        } else {
            // If no error, redirect to frontend
            response.sendRedirect(appProperties.getOauth().getSuccessRedirect());
        }
    }
}

