package com.dryno.backend.web;

import com.dryno.backend.domain.Job;
import com.dryno.backend.domain.JobStatus;
import com.dryno.backend.dto.AddScreenshotRequest;
import com.dryno.backend.dto.ClarityInsightsUpdateRequest;
import com.dryno.backend.dto.CreateJobRequest;
import com.dryno.backend.dto.DesignAnalysisUpdateRequest;
import com.dryno.backend.dto.DesignFileUploadResponse;
import com.dryno.backend.dto.Ga4AnalyticsUpdateRequest;
import com.dryno.backend.dto.JobResponse;
import com.dryno.backend.dto.UpdateScoresRequest;
import com.dryno.backend.dto.UploadHeatmapRequest;
import com.dryno.backend.service.ClarityService;
import com.dryno.backend.service.JobService;
import com.dryno.backend.storage.StorageService;
import com.dryno.backend.storage.StoredObject;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.util.StringUtils;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@RestController
@RequestMapping("/api/jobs")
@Validated
public class JobController {

    private final JobService jobService;
    private final ClarityService clarityService;
    private final StorageService storageService;

    public JobController(JobService jobService, ClarityService clarityService, StorageService storageService) {
        this.jobService = jobService;
        this.clarityService = clarityService;
        this.storageService = storageService;
    }

    @PostMapping
    public ResponseEntity<JobResponse> createJob(@Valid @RequestBody CreateJobRequest request,
                                                 Authentication authentication) {
        Job job = jobService.createJob(request, authentication);
        return ResponseEntity.ok(JobResponse.from(job));
    }

    @GetMapping("/me/{jobId}")
    public ResponseEntity<JobResponse> getJob(@PathVariable String jobId) {
        Job job = jobService.getJob(parseJobId(jobId));
        return ResponseEntity.ok(JobResponse.from(job));
    }

    @PatchMapping("/me/{jobId}/status")
    public ResponseEntity<JobResponse> updateStatus(@PathVariable String jobId,
                                                    @RequestParam String status) {
        JobStatus jobStatus = JobStatus.valueOf(status.trim().toUpperCase(Locale.ROOT));
        Job job = jobService.updateStatus(parseJobId(jobId), jobStatus);
        return ResponseEntity.ok(JobResponse.from(job));
    }

    @PostMapping("/me/{jobId}/screenshots")
    public ResponseEntity<JobResponse> addScreenshot(@PathVariable String jobId,
                                                     @Valid @RequestBody AddScreenshotRequest request) {
        jobService.addScreenshot(parseJobId(jobId), request);
        Job job = jobService.getJob(parseJobId(jobId));
        return ResponseEntity.ok(JobResponse.from(job));
    }

    @PostMapping("/me/{jobId}/screenshots/{screenshotId}/heatmap")
    public ResponseEntity<JobResponse> uploadHeatmap(@PathVariable String jobId,
                                                     @PathVariable String screenshotId,
                                                     @Valid @RequestBody UploadHeatmapRequest request) {
        UUID parsedJobId = parseJobId(jobId);
        jobService.uploadHeatmap(parsedJobId, screenshotId, request);
        Job job = jobService.getJob(parsedJobId);
        return ResponseEntity.ok(JobResponse.from(job));
    }

    @PatchMapping("/me/{jobId}/scores")
    public ResponseEntity<JobResponse> updateScores(@PathVariable String jobId,
                                                    @Valid @RequestBody UpdateScoresRequest request) {
        Job job = jobService.updateScores(parseJobId(jobId), request);
        return ResponseEntity.ok(JobResponse.from(job));
    }

    @PatchMapping({"/me/{jobId}/design-analysis", "/{jobId}/design-analysis"})
    public ResponseEntity<JobResponse> updateDesignAnalysis(@PathVariable String jobId,
                                                            @Valid @RequestBody DesignAnalysisUpdateRequest request) {
        Job job = jobService.updateDesignAnalysis(parseJobId(jobId), request);
        return ResponseEntity.ok(JobResponse.from(job));
    }

    @PatchMapping({"/me/{jobId}/ga4", "/{jobId}/ga4"})
    public ResponseEntity<JobResponse> updateGa4(@PathVariable String jobId,
                                                 @Valid @RequestBody Ga4AnalyticsUpdateRequest request) {
        Job job = jobService.updateGa4(parseJobId(jobId), request);
        return ResponseEntity.ok(JobResponse.from(job));
    }

    @PatchMapping({"/me/{jobId}/clarity", "/{jobId}/clarity"})
    public ResponseEntity<JobResponse> updateClarity(@PathVariable String jobId,
                                                     @Valid @RequestBody ClarityInsightsUpdateRequest request) {
        Job job = jobService.updateClarity(parseJobId(jobId), request);
        return ResponseEntity.ok(JobResponse.from(job));
    }

    @PostMapping({"/me/{jobId}/clarity/sync", "/{jobId}/clarity/sync"})
    public ResponseEntity<JobResponse> syncClarity(@PathVariable String jobId) {
        Job job = clarityService.forceRefresh(parseJobId(jobId));
        return ResponseEntity.ok(JobResponse.from(job));
    }

    @PostMapping("/design-files/upload")
    public ResponseEntity<DesignFileUploadResponse> uploadDesignFiles(
            @RequestParam("files") MultipartFile[] files,
            @RequestParam(value = "domain", defaultValue = "design-uploads") String domain) {
        List<DesignFileUploadResponse.UploadedFile> uploadedFiles = new ArrayList<>();
        
        for (MultipartFile file : files) {
            if (file.isEmpty()) {
                continue;
            }
            
            try {
                String fileName = file.getOriginalFilename();
                if (fileName == null || fileName.isEmpty()) {
                    fileName = UUID.randomUUID().toString() + ".bin";
                }
                
                String contentType = file.getContentType();
                if (contentType == null || contentType.isEmpty()) {
                    contentType = "application/octet-stream";
                }
                
                StoredObject stored = storageService.storeDesignFile(
                    file.getInputStream(),
                    file.getSize(),
                    domain,
                    fileName,
                    contentType
                );
                
                uploadedFiles.add(new DesignFileUploadResponse.UploadedFile(
                    fileName,
                    stored.key(),
                    stored.url(),
                    contentType,
                    file.getSize()
                ));
            } catch (Exception ex) {
                // Log error but continue with other files
                throw new RuntimeException("Failed to upload file: " + file.getOriginalFilename(), ex);
            }
        }
        
        return ResponseEntity.ok(new DesignFileUploadResponse(uploadedFiles));
    }

    private UUID parseJobId(String jobId) {
        if (!StringUtils.hasText(jobId)) {
            throw new IllegalArgumentException("JobId cannot be blank.");
        }
        return UUID.fromString(jobId);
    }
}
