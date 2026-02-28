package com.dryno.backend.web;

import com.dryno.backend.ai.AiInsightService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class AiInsightController {

    private static final Logger log = LoggerFactory.getLogger(AiInsightController.class);
    private final AiInsightService aiInsightService;

    public AiInsightController(AiInsightService aiInsightService) {
        this.aiInsightService = aiInsightService;
    }

    @GetMapping("/jobs/{jobId}/insights/stream")
    public SseEmitter streamInsightsForJob(@PathVariable String jobId) {
        return startStream(jobId);
    }

    @GetMapping("/ai/jobs/{jobId}/insights/stream")
    public SseEmitter legacyStreamInsights(@PathVariable String jobId) {
        return startStream(jobId);
    }

    private SseEmitter startStream(String jobId) {
        try {
            UUID parsedJobId = parse(jobId);
            return aiInsightService.streamInsights(parsedJobId);
        } catch (IllegalArgumentException e) {
            log.error("Invalid job ID format: {}", jobId, e);
            SseEmitter emitter = new SseEmitter(0L);
            try {
                emitter.send(SseEmitter.event()
                        .name("error")
                        .data("Invalid job ID format: " + e.getMessage()));
                emitter.complete();
            } catch (IOException ioException) {
                emitter.completeWithError(ioException);
            }
            return emitter;
        } catch (Exception e) {
            log.error("Unexpected error while starting AI insights stream for job {}", jobId, e);
            SseEmitter emitter = new SseEmitter(0L);
            try {
                emitter.send(SseEmitter.event()
                        .name("error")
                        .data("Failed to start AI insights stream: " + e.getMessage()));
                emitter.complete();
            } catch (IOException ioException) {
                emitter.completeWithError(ioException);
            }
            return emitter;
        }
    }

    private UUID parse(String jobId) {
        if (!StringUtils.hasText(jobId)) {
            throw new IllegalArgumentException("Job ID cannot be blank");
        }
        try {
            return UUID.fromString(jobId.trim());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid job ID format: " + jobId, e);
        }
    }
}
