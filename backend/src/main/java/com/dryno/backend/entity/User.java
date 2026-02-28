package com.dryno.backend.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "users")
public class User {

    @Id
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "email", unique = true, nullable = false, length = 255)
    private String email;

    @Column(name = "name", length = 255)
    private String name;

    @Column(name = "google_id", unique = true, length = 255)
    private String googleId;

    @Column(name = "picture_url", length = 500)
    private String pictureUrl;

    @Column(name = "refresh_token", length = 1000)
    private String refreshToken;

    @Column(name = "access_token", length = 2000)
    private String accessToken;

    @Column(name = "token_expiry")
    private Instant tokenExpiry;

    @Column(name = "clarity_api_key", length = 500)
    private String clarityApiKey;

    @Column(name = "clarity_project_ids", length = 2000)
    private String clarityProjectIds; // JSON array of project IDs

    @Column(name = "azure_id", unique = true, length = 255)
    private String azureId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public User() {
        this.id = UUID.randomUUID();
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }

    // Getters and Setters

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getGoogleId() {
        return googleId;
    }

    public void setGoogleId(String googleId) {
        this.googleId = googleId;
    }

    public String getPictureUrl() {
        return pictureUrl;
    }

    public void setPictureUrl(String pictureUrl) {
        this.pictureUrl = pictureUrl;
    }

    public String getAzureId() {
        return azureId;
    }

    public void setAzureId(String azureId) {
        this.azureId = azureId;
    }

    public String getRefreshToken() {
        return refreshToken;
    }

    public void setRefreshToken(String refreshToken) {
        this.refreshToken = refreshToken;
    }

    public String getAccessToken() {
        return accessToken;
    }

    public void setAccessToken(String accessToken) {
        this.accessToken = accessToken;
    }

    public Instant getTokenExpiry() {
        return tokenExpiry;
    }

    public void setTokenExpiry(Instant tokenExpiry) {
        this.tokenExpiry = tokenExpiry;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    public String getClarityApiKey() {
        return clarityApiKey;
    }

    public void setClarityApiKey(String clarityApiKey) {
        this.clarityApiKey = clarityApiKey;
    }

    public String getClarityProjectIds() {
        return clarityProjectIds;
    }

    public void setClarityProjectIds(String clarityProjectIds) {
        this.clarityProjectIds = clarityProjectIds;
    }
}
