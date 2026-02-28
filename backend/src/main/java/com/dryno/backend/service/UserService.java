package com.dryno.backend.service;

import com.dryno.backend.entity.User;
import com.dryno.backend.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User createUser(User user) {
        return userRepository.save(user);
    }

    public Optional<User> getUserById(UUID id) {
        return userRepository.findById(id);
    }

    public Optional<User> getUserByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    public Optional<User> getUserByGoogleId(String googleId) {
        return userRepository.findByGoogleId(googleId);
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public User updateUser(UUID id, User updatedUser) {
        return userRepository.findById(id)
                .map(user -> {
                    if (updatedUser.getEmail() != null) {
                        user.setEmail(updatedUser.getEmail());
                    }
                    if (updatedUser.getName() != null) {
                        user.setName(updatedUser.getName());
                    }
                    if (updatedUser.getPictureUrl() != null) {
                        user.setPictureUrl(updatedUser.getPictureUrl());
                    }
                    if (updatedUser.getAzureId() != null) {
                        user.setAzureId(updatedUser.getAzureId());
                    }
                    if (updatedUser.getRefreshToken() != null) {
                        user.setRefreshToken(updatedUser.getRefreshToken());
                    }
                    if (updatedUser.getAccessToken() != null) {
                        user.setAccessToken(updatedUser.getAccessToken());
                    }
                    if (updatedUser.getTokenExpiry() != null) {
                        user.setTokenExpiry(updatedUser.getTokenExpiry());
                    }
                    user.setUpdatedAt(Instant.now());
                    return userRepository.save(user);
                })
                .orElseThrow(() -> new RuntimeException("User not found with id: " + id));
    }

    public void deleteUser(UUID id) {
        userRepository.deleteById(id);
    }

    public User findOrCreateUser(String googleId, String email, String name, String pictureUrl) {
        if (!StringUtils.hasText(email)) {
            throw new IllegalArgumentException("Email is required for Google OAuth users");
        }

        Optional<User> existing = Optional.ofNullable(googleId)
                .flatMap(userRepository::findByGoogleId);

        if (existing.isEmpty()) {
            existing = userRepository.findByEmail(email);
        }

        if (existing.isPresent()) {
            User user = existing.get();
            if (StringUtils.hasText(googleId)) {
                user.setGoogleId(googleId);
            }
            if (StringUtils.hasText(name)) {
                user.setName(name);
            }
            if (StringUtils.hasText(pictureUrl)) {
                user.setPictureUrl(pictureUrl);
            }
            return userRepository.save(user);
        }

        User newUser = new User();
        newUser.setGoogleId(googleId);
        newUser.setEmail(email);
        newUser.setName(name);
        newUser.setPictureUrl(pictureUrl);
        return userRepository.save(newUser);
    }

    public User syncAzureUser(String azureId, String email, String name, String pictureUrl) {
        if (!StringUtils.hasText(email)) {
            throw new IllegalArgumentException("Email is required for Azure OAuth users");
        }

        Optional<User> existing = Optional.ofNullable(azureId)
                .flatMap(userRepository::findByAzureId);

        if (existing.isEmpty()) {
            existing = userRepository.findByEmail(email);
        }

        if (existing.isPresent()) {
            User user = existing.get();
            if (StringUtils.hasText(azureId)) {
                user.setAzureId(azureId);
            }
            if (StringUtils.hasText(name)) {
                user.setName(name);
            }
            if (StringUtils.hasText(pictureUrl) && !StringUtils.hasText(user.getPictureUrl())) {
                user.setPictureUrl(pictureUrl);
            }
            return userRepository.save(user);
        }

        User newUser = new User();
        newUser.setAzureId(azureId);
        newUser.setEmail(email);
        newUser.setName(name);
        newUser.setPictureUrl(pictureUrl);
        return userRepository.save(newUser);
    }

    public void updateTokens(UUID userId, String accessToken, String refreshToken, Instant tokenExpiry) {
        userRepository.findById(userId).ifPresent(user -> {
            user.setAccessToken(accessToken);
            user.setRefreshToken(refreshToken);
            user.setTokenExpiry(tokenExpiry);
            userRepository.save(user);
        });
    }

    public boolean existsByEmail(String email) {
        return userRepository.existsByEmail(email);
    }
}
