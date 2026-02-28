package com.dryno.backend.service;

import com.dryno.backend.config.AppProperties;
import com.dryno.backend.domain.ClarityInsights;
import com.dryno.backend.domain.DesignAnalysisResult;
import com.dryno.backend.domain.Ga4Results;
import com.dryno.backend.domain.Job;
import com.dryno.backend.domain.JobStatus;
import com.dryno.backend.domain.JobType;
import com.dryno.backend.domain.Screenshot;
import com.dryno.backend.dto.AddScreenshotRequest;
import com.dryno.backend.dto.ClarityInsightsUpdateRequest;
import com.dryno.backend.dto.CreateJobRequest;
import com.dryno.backend.dto.DesignAnalysisUpdateRequest;
import com.dryno.backend.dto.Ga4AnalyticsUpdateRequest;
import com.dryno.backend.dto.UpdateScoresRequest;
import com.dryno.backend.dto.UploadHeatmapRequest;
import com.dryno.backend.entity.User;
import com.dryno.backend.exception.JobNotFoundException;
import com.dryno.backend.exception.ScreenshotNotFoundException;
import com.dryno.backend.repository.JobRepository;
import com.dryno.backend.storage.StorageService;
import com.dryno.backend.storage.StoredObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.io.ByteArrayInputStream;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;

@Service
public class JobService {

    private static final Logger log = LoggerFactory.getLogger(JobService.class);

    private final JobRepository jobRepository;
    private final RabbitTemplate rabbitTemplate;
    private final AppProperties appProperties;
    private final StorageService storageService;
    private final AuthService authService;
    private final ClarityService clarityService;
    private final UserService userService;

    public JobService(JobRepository jobRepository,
            RabbitTemplate rabbitTemplate,
            AppProperties appProperties,
            StorageService storageService,
            AuthService authService,
            ClarityService clarityService,
            UserService userService) {
        this.jobRepository = jobRepository;
        this.rabbitTemplate = rabbitTemplate;
        this.appProperties = appProperties;
        this.storageService = storageService;
        this.authService = authService;
        this.clarityService = clarityService;
        this.userService = userService;
    }

    public Job createJob(CreateJobRequest request, Authentication authentication) {
        validateCreateRequest(request);

        Job job = new Job(request.getType());
        if (job.getType() == JobType.URL_ANALYSIS) {
            job.setStartUrl(request.getUrl());
            job.setMaxPages(request.getPages());
            job.setDesignInput(request.getUrl());
            if (StringUtils.hasText(request.getPropertyId())) {
                job.setPropertyId(request.getPropertyId());
            }
            if (StringUtils.hasText(request.getClarityProjectId())) {
                job.setClarityProjectId(request.getClarityProjectId());
            }
        } else if (job.getType() == JobType.DESIGN_ANALYSIS) {
            job.setDesignInput(request.getDesignInput());
        }

        jobRepository.save(job);

        // Dispatch Clarity job to queue if project ID and token are provided
        if (job.getType() == JobType.URL_ANALYSIS && StringUtils.hasText(job.getClarityProjectId())) {
            log.info("Job {} has Clarity project ID: {}", job.getId(), job.getClarityProjectId());
            // Use token from request
            String clarityToken = request.getClarityToken();
            if (StringUtils.hasText(clarityToken)) {
                log.info("Found Clarity token in request for job {}, dispatching Clarity job", job.getId());
                dispatchClarity(job, clarityToken);
            } else {
                log.warn("Missing Clarity token in request, skipping Clarity job dispatch for {}", job.getId());
            }
        } else {
            if (job.getType() == JobType.URL_ANALYSIS) {
                log.debug("Job {} does not have Clarity project ID", job.getId());
            }
        }

        dispatchJob(job, authentication);
        return job;
    }

    public Job getJob(UUID jobId) {
        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new JobNotFoundException(jobId));
        clarityService.hydrate(job);
        return job;
    }

    public Job getJobWithScreenshots(UUID jobId) {
        Job job = jobRepository.findByIdWithScreenshots(jobId)
                .orElseThrow(() -> new JobNotFoundException(jobId));
        clarityService.hydrate(job);
        return job;
    }

    public Job updateStatus(UUID jobId, JobStatus status) {
        Job job = getJob(jobId);
        job.setStatus(status);
        jobRepository.save(job);
        return job;
    }

    public Screenshot addScreenshot(UUID jobId, AddScreenshotRequest request) {
        log.info("Adding screenshot for job={}, pageUrl={}, hasImageBinary={}, hasHeatmapBinary={}",
                jobId, request.getPageUrl(), request.hasImageBinary(), request.hasHeatmapBinary());

        Job job = getJob(jobId);

        String domain = resolveDomain(request.getPageUrl(), job.getStartUrl());

        String imageFileName = resolveFilename(
                request.getImageFileName(),
                request.getImageStoragePath(),
                UUID.randomUUID().toString(),
                "png");

        String imageStoragePath = request.getImageStoragePath();
        String imagePublicUrl = null;

        if (request.hasImageBinary()) {
            log.debug("Image binary data present, attempting S3 upload for file: {}", imageFileName);
            try {
                StoredObject stored = storeImage(request, domain, imageFileName);
                if (stored != null) {
                    imageStoragePath = stored.key();
                    imagePublicUrl = stored.url();
                    log.info("Screenshot uploaded successfully: key={}, url={}", imageStoragePath, imagePublicUrl);
                }
            } catch (Exception ex) {
                if (ex instanceof IllegalArgumentException iae) {
                    throw iae;
                }
                log.warn("Failed to upload screenshot {} to S3, falling back to provided path", imageFileName, ex);
            }
        } else {
            log.warn("No image binary data provided for screenshot. imageStoragePath={}",
                    request.getImageStoragePath());
        }

        if (!StringUtils.hasText(imageStoragePath)) {
            throw new IllegalArgumentException("Either imageBase64 or imageStoragePath must be provided.");
        } else if (imageStoragePath.startsWith("http")) {
            imagePublicUrl = imageStoragePath;
        }

        Screenshot screenshot = new Screenshot(request.getPageUrl(), imageStoragePath);
        screenshot.setImagePublicUrl(imagePublicUrl);

        String heatmapFileName = resolveFilename(
                request.getHeatmapFileName(),
                request.getHeatmapStoragePath(),
                baseName(imageFileName) + "-heatmap",
                "png");

        if (request.hasHeatmapBinary()) {
            try {
                StoredObject heatmap = storeHeatmap(request, domain, heatmapFileName);
                if (heatmap != null) {
                    screenshot.setHeatmapStoragePath(heatmap.key());
                    screenshot.setHeatmapPublicUrl(heatmap.url());
                }
            } catch (Exception ex) {
                if (ex instanceof IllegalArgumentException iae) {
                    throw iae;
                }
                log.warn("Failed to upload heatmap {} for screenshot {}, continuing without heatmap", heatmapFileName,
                        screenshot.getId(), ex);
            }
        } else if (StringUtils.hasText(request.getHeatmapStoragePath())) {
            screenshot.setHeatmapStoragePath(request.getHeatmapStoragePath());
            if (request.getHeatmapStoragePath().startsWith("http")) {
                screenshot.setHeatmapPublicUrl(request.getHeatmapStoragePath());
            } else {
                screenshot.setHeatmapPublicUrl(storageService.publicUrl(request.getHeatmapStoragePath()));
            }
        }

        job.addScreenshot(screenshot);
        jobRepository.save(job);
        return screenshot;
    }

    public Screenshot uploadHeatmap(UUID jobId, String screenshotId, UploadHeatmapRequest request) {
        Job job = getJob(jobId);
        Screenshot screenshot = job.getScreenshots().stream()
                .filter(ss -> screenshotId.equals(ss.getId()))
                .findFirst()
                .orElseThrow(() -> new ScreenshotNotFoundException(screenshotId));

        String domain = resolveDomain(screenshot.getPageUrl(), job.getStartUrl());

        String defaultBase = baseName(fileNameFromPath(screenshot.getImageStoragePath(), screenshot.getId()));
        String desiredFileName = StringUtils.hasText(request.getFileName())
                ? request.getFileName().trim()
                : defaultBase + "-heatmap";
        String heatmapFileName = ensureExtension(desiredFileName, "png");

        byte[] payload = decodeBase64(request.getHeatmapBase64());
        String contentType = resolveContentType(request.getContentType(), request.getHeatmapBase64(), "image/png");
        StoredObject stored = storageService.storeHeatmap(new ByteArrayInputStream(payload), payload.length, domain,
                heatmapFileName, contentType);

        screenshot.setHeatmapStoragePath(stored.key());
        screenshot.setHeatmapPublicUrl(stored.url());

        jobRepository.save(job);
        return screenshot;
    }

    public Job updateScores(UUID jobId, UpdateScoresRequest request) {
        Job job = getJob(jobId);
        if (request.getMainPerformanceScore() != null) {
            job.setMainPerformanceScore(request.getMainPerformanceScore());
        }
        if (request.getMainAccessibilityScore() != null) {
            job.setMainAccessibilityScore(request.getMainAccessibilityScore());
        }
        if (request.getMainBestPracticesScore() != null) {
            job.setMainBestPracticesScore(request.getMainBestPracticesScore());
        }
        if (request.getMainSeoScore() != null) {
            job.setMainSeoScore(request.getMainSeoScore());
        }
        jobRepository.save(job);
        return job;
    }

    public Job updateDesignAnalysis(UUID jobId, DesignAnalysisUpdateRequest request) {
        Job job = getJob(jobId);
        DesignAnalysisResult result = job.getDesignAnalysisResults();
        if (request.getSummary() != null) {
            result.setSummary(request.getSummary());
        }
        if (request.getKeyPoints() != null) {
            result.replaceKeyPoints(request.getKeyPoints());
        }
        jobRepository.save(job);
        return job;
    }

    public Job updateGa4(UUID jobId, Ga4AnalyticsUpdateRequest request) {
        Job job = getJob(jobId);
        Ga4Results target = job.getGa4Results();
        if (request.getTotalUsers() != null)
            target.setTotalUsers(request.getTotalUsers());
        if (request.getNewUsers() != null)
            target.setNewUsers(request.getNewUsers());
        if (request.getSessions() != null)
            target.setSessions(request.getSessions());
        if (request.getEngagedSessions() != null)
            target.setEngagedSessions(request.getEngagedSessions());
        if (request.getAverageSessionDuration() != null)
            target.setAverageSessionDuration(request.getAverageSessionDuration());
        if (request.getEngagementRate() != null)
            target.setEngagementRate(request.getEngagementRate());
        if (request.getTopPages() != null) {
            target.replaceTopPages(request.getTopPages().stream()
                    .map(tp -> new Ga4Results.Ga4Page(tp.pagePath(), tp.pageTitle(), tp.views(), tp.users(),
                            tp.avgEngagementTime()))
                    .toList());
        }
        if (request.getTrafficSources() != null) {
            target.replaceTrafficSources(request.getTrafficSources().stream()
                    .map(ts -> new Ga4Results.Ga4TrafficSource(ts.source(), ts.medium(), ts.sessions()))
                    .toList());
        }
        if (request.getTopCountries() != null) {
            target.replaceTopCountries(request.getTopCountries().stream()
                    .map(tc -> new Ga4Results.Ga4Country(tc.country(), tc.users()))
                    .toList());
        }
        if (request.getTopEvents() != null) {
            target.replaceTopEvents(request.getTopEvents().stream()
                    .map(te -> new Ga4Results.Ga4Event(te.eventName(), te.eventCount()))
                    .toList());
        }
        if (request.getAcquisitionChannels() != null) {
            target.replaceAcquisitionChannels(request.getAcquisitionChannels().stream()
                    .map(ac -> new Ga4Results.Ga4AcquisitionChannel(ac.channel(), ac.sessions(), ac.activeUsers()))
                    .toList());
        }
        if (request.getDeviceTechnology() != null) {
            target.replaceDeviceTechnology(request.getDeviceTechnology().stream()
                    .map(dt -> new Ga4Results.Ga4DeviceTechnology(dt.deviceCategory(), dt.operatingSystem(),
                            dt.browser(), dt.sessions(), dt.activeUsers()))
                    .toList());
        }
        if (request.getDemographics() != null) {
            target.replaceDemographics(request.getDemographics().stream()
                    .map(d -> new Ga4Results.Ga4Demographics(d.country(), d.city(), d.language(), d.activeUsers()))
                    .toList());
        }
        if (request.getCoreWebVitals() != null) {
            target.replaceCoreWebVitals(request.getCoreWebVitals().stream()
                    .map(cwv -> new Ga4Results.Ga4CoreWebVital(cwv.url(), cwv.lcpMs(), cwv.inpMs(), cwv.cls(),
                            cwv.error()))
                    .toList());
        }

        jobRepository.save(job);
        return job;
    }

    public Job updateClarity(UUID jobId, ClarityInsightsUpdateRequest request) {
        Job job = getJob(jobId);
        ClarityInsights target = job.getClarityInsights();

        log.debug(
                "Updating Clarity insights for job {}: sessions={}, recordings={}, users={}, issues={}, heatmaps={}, sessions={}",
                jobId,
                request.getTotalSessions(),
                request.getTotalRecordings(),
                request.getActiveUsers(),
                request.getTopIssues() != null ? request.getTopIssues().size() : 0,
                request.getHeatmaps() != null ? request.getHeatmaps().size() : 0,
                request.getStandoutSessions() != null ? request.getStandoutSessions().size() : 0);

        if (request.getTotalSessions() != null)
            target.setTotalSessions(request.getTotalSessions());
        if (request.getTotalRecordings() != null)
            target.setTotalRecordings(request.getTotalRecordings());
        if (request.getActiveUsers() != null)
            target.setActiveUsers(request.getActiveUsers());
        if (request.getAverageEngagementSeconds() != null)
            target.setAverageEngagementSeconds(request.getAverageEngagementSeconds());
        if (request.getAverageScrollDepth() != null)
            target.setAverageScrollDepth(request.getAverageScrollDepth());
        if (request.getRageClicks() != null)
            target.setRageClicks(request.getRageClicks());
        if (request.getDeadClicks() != null)
            target.setDeadClicks(request.getDeadClicks());
        if (request.getQuickBacks() != null)
            target.setQuickBacks(request.getQuickBacks());
        if (request.getTopIssues() != null) {
            target.replaceTopIssues(request.getTopIssues().stream()
                    .map(issue -> new ClarityInsights.ClarityInsight(
                            issue.title(),
                            issue.metric(),
                            issue.severity(),
                            issue.url(),
                            issue.value(),
                            issue.description()))
                    .toList());
        }
        if (request.getHeatmaps() != null) {
            target.replaceHeatmaps(request.getHeatmaps().stream()
                    .map(heatmap -> new ClarityInsights.ClarityHeatmap(
                            heatmap.pageUrl(),
                            heatmap.views(),
                            heatmap.clickRate(),
                            heatmap.scrollDepth(),
                            heatmap.engagementTime()))
                    .toList());
        }
        if (request.getStandoutSessions() != null) {
            target.replaceStandoutSessions(request.getStandoutSessions().stream()
                    .map(session -> new ClarityInsights.ClaritySession(
                            session.sessionId(),
                            session.entryPage(),
                            session.exitPage(),
                            session.durationSeconds(),
                            session.interactions(),
                            session.device(),
                            session.notes()))
                    .toList());
        }
        if (request.getTrafficSources() != null) {
            target.replaceTrafficSources(request.getTrafficSources().stream()
                    .map(source -> new ClarityInsights.TrafficSource(
                            source.source(),
                            source.medium(),
                            source.sessionsCount(),
                            source.percentage()))
                    .toList());
        }
        if (request.getBrowsers() != null) {
            target.replaceBrowsers(request.getBrowsers().stream()
                    .map(browser -> new ClarityInsights.BrowserInfo(
                            browser.name(),
                            browser.sessionsCount(),
                            browser.percentage()))
                    .toList());
        }
        if (request.getDevices() != null) {
            target.replaceDevices(request.getDevices().stream()
                    .map(device -> new ClarityInsights.DeviceInfo(
                            device.type(),
                            device.sessionsCount(),
                            device.percentage()))
                    .toList());
        }
        if (request.getOperatingSystems() != null) {
            target.replaceOperatingSystems(request.getOperatingSystems().stream()
                    .map(os -> new ClarityInsights.OperatingSystemInfo(
                            os.name(),
                            os.sessionsCount(),
                            os.percentage()))
                    .toList());
        }
        if (request.getCountries() != null) {
            target.replaceCountries(request.getCountries().stream()
                    .map(country -> new ClarityInsights.CountryInfo(
                            country.name(),
                            country.sessionsCount(),
                            country.percentage()))
                    .toList());
        }
        if (request.getPageTitles() != null) {
            target.replacePageTitles(request.getPageTitles().stream()
                    .map(page -> new ClarityInsights.PageTitleInfo(
                            page.title(),
                            page.sessionsCount(),
                            page.percentage()))
                    .toList());
        }
        if (request.getPerformanceMetrics() != null) {
            var perf = request.getPerformanceMetrics();
            target.setPerformanceMetrics(new ClarityInsights.PerformanceMetrics(
                    perf.botSessions(),
                    perf.pagesPerSession(),
                    perf.totalTime(),
                    perf.activeTime()));
        }
        if (request.getDiagnosticEvents() != null) {
            target.replaceDiagnosticEvents(request.getDiagnosticEvents().stream()
                    .map(event -> new ClarityInsights.DiagnosticEvent(
                            event.eventType(),
                            event.count(),
                            event.sessionsAffected(),
                            event.percentage(),
                            event.details()))
                    .toList());
        }
        if (request.getPageEvents() != null) {
            var pageEvents = request.getPageEvents();
            target.setPageEvents(new ClarityInsights.PageEvents(
                    pageEvents.documentSizes(),
                    pageEvents.pageVisibility(),
                    pageEvents.pageUnload()));
        }
        if (request.getCustomEvents() != null) {
            target.replaceCustomEvents(request.getCustomEvents().stream()
                    .map(event -> new ClarityInsights.CustomEvent(
                            event.eventName(),
                            event.count(),
                            event.variables()))
                    .toList());
        }
        jobRepository.save(job);
        log.info("Successfully updated Clarity insights for job {}", jobId);
        return job;
    }

    private StoredObject storeImage(AddScreenshotRequest request, String domain, String fileName) {
        byte[] payload = decodeBase64(request.getImageBase64());
        String contentType = resolveContentType(request.getImageContentType(), request.getImageBase64(), "image/png");
        return storageService.storeScreenshot(new ByteArrayInputStream(payload), payload.length, domain, fileName,
                contentType);
    }

    private StoredObject storeHeatmap(AddScreenshotRequest request, String domain, String fileName) {
        byte[] payload = decodeBase64(request.getHeatmapBase64());
        String contentType = resolveContentType(request.getHeatmapContentType(), request.getHeatmapBase64(),
                "image/png");
        return storageService.storeHeatmap(new ByteArrayInputStream(payload), payload.length, domain, fileName,
                contentType);
    }

    private byte[] decodeBase64(String base64Payload) {
        if (!StringUtils.hasText(base64Payload)) {
            throw new IllegalArgumentException("Base64 payload is required.");
        }
        String value = base64Payload.trim();
        int commaIndex = value.indexOf(',');
        if (value.startsWith("data:") && commaIndex >= 0) {
            value = value.substring(commaIndex + 1);
        }
        try {
            byte[] data = Base64.getDecoder().decode(value);
            if (data.length == 0) {
                throw new IllegalArgumentException("Decoded payload is empty.");
            }
            return data;
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Invalid base64 payload provided.", ex);
        }
    }

    private String resolveContentType(String explicit, String base64Payload, String fallback) {
        if (StringUtils.hasText(explicit)) {
            return explicit.trim();
        }
        if (StringUtils.hasText(base64Payload) && base64Payload.startsWith("data:")) {
            int colon = base64Payload.indexOf(':');
            int semicolon = base64Payload.indexOf(';');
            if (colon >= 0 && semicolon > colon) {
                return base64Payload.substring(colon + 1, semicolon);
            }
        }
        return fallback;
    }

    private String resolveFilename(String explicitName, String storagePath, String defaultBase,
            String defaultExtension) {
        if (StringUtils.hasText(explicitName)) {
            return ensureExtension(explicitName.trim(), defaultExtension);
        }
        if (StringUtils.hasText(storagePath)) {
            String candidate = storagePath.trim();
            int query = candidate.indexOf('?');
            if (query >= 0) {
                candidate = candidate.substring(0, query);
            }
            int lastSlash = candidate.lastIndexOf('/');
            if (lastSlash >= 0) {
                candidate = candidate.substring(lastSlash + 1);
            }
            if (StringUtils.hasText(candidate)) {
                return ensureExtension(candidate, defaultExtension);
            }
        }
        return ensureExtension(defaultBase, defaultExtension);
    }

    private String fileNameFromPath(String storagePath, String defaultValue) {
        if (!StringUtils.hasText(storagePath)) {
            return defaultValue;
        }
        String candidate = storagePath.trim();
        int query = candidate.indexOf('?');
        if (query >= 0) {
            candidate = candidate.substring(0, query);
        }
        int lastSlash = candidate.lastIndexOf('/');
        if (lastSlash >= 0) {
            candidate = candidate.substring(lastSlash + 1);
        }
        return StringUtils.hasText(candidate) ? candidate : defaultValue;
    }

    private String ensureExtension(String fileName, String defaultExtension) {
        if (!StringUtils.hasText(fileName)) {
            return ensureExtension(UUID.randomUUID().toString(), defaultExtension);
        }
        String trimmed = fileName.trim();
        if (trimmed.contains(".")) {
            return trimmed;
        }
        return trimmed + "." + defaultExtension;
    }

    private String baseName(String fileName) {
        if (!StringUtils.hasText(fileName)) {
            return UUID.randomUUID().toString();
        }
        String trimmed = fileName.trim();
        int dot = trimmed.lastIndexOf('.');
        return dot > 0 ? trimmed.substring(0, dot) : trimmed;
    }

    private String resolveDomain(String pageUrl, String fallbackUrl) {
        String candidate = StringUtils.hasText(pageUrl) ? pageUrl : fallbackUrl;
        if (!StringUtils.hasText(candidate)) {
            return null;
        }
        try {
            URI uri = new URI(candidate.trim());
            if (StringUtils.hasText(uri.getHost())) {
                return uri.getHost();
            }
        } catch (URISyntaxException ignored) {
        }
        return candidate;
    }

    private void dispatchJob(Job job, Authentication authentication) {
        if (job.getType() == JobType.URL_ANALYSIS) {
            sendToQueue(appProperties.getQueues().getScreenshot(), Map.of(
                    "jobId", job.getId().toString(),
                    "startUrl", job.getStartUrl(),
                    "maxPages", job.getMaxPages()));
            sendToQueue(appProperties.getQueues().getLighthouse(), Map.of(
                    "jobId", job.getId().toString(),
                    "urlToAudit", job.getStartUrl()));
            if (StringUtils.hasText(job.getPropertyId())) {
                String refreshToken = authService.getRefreshToken(authentication);
                if (StringUtils.hasText(refreshToken)) {
                    sendToQueue(appProperties.getQueues().getGa4(), Map.of(
                            "jobId", job.getId().toString(),
                            "propertyId", job.getPropertyId().replace("properties/", ""),
                            "refreshToken", refreshToken));
                } else {
                    log.warn("GA4 refresh token missing; skipping GA analytics job for {}", job.getId());
                }
            }
            dispatchDesignAnalysis(job);
        } else if (job.getType() == JobType.DESIGN_ANALYSIS) {
            dispatchDesignAnalysis(job);
        }
    }

    private void dispatchDesignAnalysis(Job job) {
        if (!StringUtils.hasText(job.getDesignInput())) {
            return;
        }
        sendToQueue(appProperties.getQueues().getDesignAnalysis(), Map.of(
                "jobId", job.getId().toString(),
                "designInput", job.getDesignInput()));
    }

    private void dispatchClarity(Job job, String apiKey) {
        if (!StringUtils.hasText(job.getClarityProjectId()) || !StringUtils.hasText(apiKey)) {
            log.warn("Cannot dispatch Clarity job: projectId={}, hasApiKey={}",
                    job.getClarityProjectId(), StringUtils.hasText(apiKey));
            return;
        }
        Map<String, Object> payload = Map.of(
                "jobId", job.getId().toString(),
                "apiKey", apiKey,
                "projectId", job.getClarityProjectId(),
                "siteUrl", job.getStartUrl() != null ? job.getStartUrl() : "",
                "lookbackDays", 7);
        log.info("Dispatching Clarity job for jobId={}, projectId={}, siteUrl={}",
                job.getId(), job.getClarityProjectId(), job.getStartUrl());
        sendToQueue(appProperties.getQueues().getClarity(), payload);
    }

    private void sendToQueue(String queueName, Map<String, ?> payload) {
        try {
            rabbitTemplate.convertAndSend(queueName, payload);
            log.info("Dispatched message to {}: {}", queueName, payload);
        } catch (Exception e) {
            log.warn("Failed to dispatch message to {}: {}", queueName, e.getMessage());
        }
    }

    private void validateCreateRequest(CreateJobRequest request) {
        if (request.getType() == JobType.URL_ANALYSIS) {
            if (!StringUtils.hasText(request.getUrl())) {
                throw new IllegalArgumentException("URL is required for URL analysis jobs.");
            }
        } else if (request.getType() == JobType.DESIGN_ANALYSIS) {
            if (!StringUtils.hasText(request.getDesignInput())) {
                throw new IllegalArgumentException("Design input is required for design analysis jobs.");
            }
        }
    }

    private String getCurrentUserApiKey(Authentication authentication) {
        if (authentication == null) {
            log.debug("Authentication is null, cannot retrieve API key");
            return null;
        }

        if (!(authentication instanceof OAuth2AuthenticationToken token)) {
            log.debug("Authentication is not OAuth2AuthenticationToken, type: {}",
                    authentication.getClass().getSimpleName());
            return null;
        }

        String email = extractEmail(token);
        if (!StringUtils.hasText(email)) {
            log.debug("Could not extract email from authentication token");
            return null;
        }

        log.debug("Looking up user by email: {}", email);
        String apiKey = userService.getUserByEmail(email)
                .map(User::getClarityApiKey)
                .orElse(null);

        if (apiKey != null) {
            log.debug("Found API key for user: {}", email);
        } else {
            log.debug("No API key found for user: {}", email);
        }

        return apiKey;
    }

    private String extractEmail(OAuth2AuthenticationToken token) {
        return firstNonEmpty(
                getAttribute(token, "email"),
                getAttribute(token, "mail"),
                getAttribute(token, "userPrincipalName"),
                getAttribute(token, "preferred_username"));
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
