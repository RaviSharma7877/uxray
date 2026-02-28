package com.dryno.backend.service;

import com.dryno.backend.clarity.ClarityClient;
import com.dryno.backend.config.ClarityProperties;
import com.dryno.backend.domain.ClarityInsights;
import com.dryno.backend.domain.Job;
import com.dryno.backend.domain.JobType;
import com.dryno.backend.exception.JobNotFoundException;
import com.dryno.backend.repository.JobRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Service
public class ClarityService {

    private static final Logger log = LoggerFactory.getLogger(ClarityService.class);

    private final ClarityClient clarityClient;
    private final ClarityProperties clarityProperties;
    private final JobRepository jobRepository;

    public ClarityService(ClarityClient clarityClient,
                          ClarityProperties clarityProperties,
                          JobRepository jobRepository) {
        this.clarityClient = clarityClient;
        this.clarityProperties = clarityProperties;
        this.jobRepository = jobRepository;
    }

    public Optional<ClarityInsights> hydrate(Job job) {
        return hydrate(job, null);
    }

    public Optional<ClarityInsights> hydrate(Job job, String userApiKey) {
        if (!shouldAttempt(job, userApiKey)) {
            return Optional.empty();
        }
        Duration interval = Optional.ofNullable(clarityProperties.getRefreshInterval())
                .orElse(Duration.ofMinutes(15));
        Instant last = job.getClarityRefreshedAt();
        if (last != null && Instant.now().isBefore(last.plus(interval)) && !job.getClarityInsights().isEmpty()) {
            return Optional.of(job.getClarityInsights());
        }
        return fetchAndPersist(job, userApiKey);
    }

    public Job forceRefresh(UUID jobId) {
        Job job = jobRepository.findById(jobId).orElseThrow(() -> new JobNotFoundException(jobId));
        fetchAndPersist(job, null);
        return job;
    }

    public Job forceRefresh(UUID jobId, String userApiKey) {
        Job job = jobRepository.findById(jobId).orElseThrow(() -> new JobNotFoundException(jobId));
        fetchAndPersist(job, userApiKey);
        return job;
    }

    private Optional<ClarityInsights> fetchAndPersist(Job job) {
        return fetchAndPersist(job, null);
    }

    private Optional<ClarityInsights> fetchAndPersist(Job job, String userApiKey) {
        try {
            // Use project ID from job if available, otherwise fall back to global config
            String projectId = StringUtils.hasText(job.getClarityProjectId()) 
                ? job.getClarityProjectId() 
                : clarityProperties.getProjectId();
            
            // Prefer user's API key if provided, otherwise fall back to global config
            String apiKey = StringUtils.hasText(userApiKey) 
                ? userApiKey 
                : clarityProperties.getApiKey();
            
            if (!StringUtils.hasText(apiKey) || !StringUtils.hasText(projectId)) {
                log.debug("No Clarity API key or project ID available for job {}", job.getId());
                return Optional.empty();
            }
            
            Optional<ClarityInsights> snapshot = clarityClient.fetchInsights(job.getStartUrl(), apiKey, projectId);
            snapshot.ifPresent(insights -> {
                job.setClarityInsights(insights);
                job.setClarityRefreshedAt(Instant.now());
                jobRepository.save(job);
            });
            return snapshot;
        } catch (Exception ex) {
            log.warn("Unable to refresh Clarity insights for job {}: {}", job.getId(), ex.getMessage());
            return Optional.empty();
        }
    }

    private boolean shouldAttempt(Job job) {
        return shouldAttempt(job, null);
    }

    private boolean shouldAttempt(Job job, String userApiKey) {
        boolean hasProjectId = StringUtils.hasText(job.getClarityProjectId()) || StringUtils.hasText(clarityProperties.getProjectId());
        boolean hasApiKey = StringUtils.hasText(userApiKey) || StringUtils.hasText(clarityProperties.getApiKey());
        return hasProjectId && hasApiKey
                && job.getType() == JobType.URL_ANALYSIS
                && StringUtils.hasText(job.getStartUrl());
    }
}

