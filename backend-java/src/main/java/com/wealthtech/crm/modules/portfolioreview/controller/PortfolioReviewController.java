package com.wealthtech.crm.modules.portfolioreview.controller;

import java.io.IOException;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.wealthtech.crm.infrastructure.s3.S3Service;
import com.wealthtech.crm.modules.portfolioreview.dto.EcasUploadResponse;
import com.wealthtech.crm.modules.portfolioreview.dto.EligibleFundResponse;
import com.wealthtech.crm.modules.portfolioreview.dto.PortfolioReviewResponse;
import com.wealthtech.crm.modules.portfolioreview.service.PortfolioReviewService;
import com.wealthtech.crm.modules.usermanager.exception.BadRequestException;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequestMapping("/java-wtc-api/v1")
@RequiredArgsConstructor
public class PortfolioReviewController {

    private final PortfolioReviewService portfolioReviewService;
    private final S3Service s3Service;

    // Master universe & category-filtered eligible funds
    @GetMapping("/eligible-funds")
    @PreAuthorize("hasAuthority('portfolioreview:read')")
    public ResponseEntity<List<EligibleFundResponse>> getEligibleFunds(
            @RequestParam(required = false) String category) {
        List<EligibleFundResponse> response = portfolioReviewService.getEligibleFunds(category);
        return ResponseEntity.ok(response);
    }

    // Portfolio review by id
    @GetMapping("/portfolio-reviews/{id}")
    @PreAuthorize("hasAuthority('portfolioreview:read')")
    public ResponseEntity<PortfolioReviewResponse> getReview(@PathVariable Long id) {
        PortfolioReviewResponse response = portfolioReviewService.getReview(id);
        return ResponseEntity.ok(response);
    }

    // Latest portfolio review for a client
    @GetMapping("/portfolio-reviews/client/{clientId}/latest")
    @PreAuthorize("hasAuthority('portfolioreview:read')")
    public ResponseEntity<PortfolioReviewResponse> getLatestReview(@PathVariable Long clientId) {
        PortfolioReviewResponse response = portfolioReviewService.getLatestReview(clientId);
        return ResponseEntity.ok(response);
    }

    // Portfolio review history for a client
    @GetMapping("/portfolio-reviews/client/{clientId}")
    @PreAuthorize("hasAuthority('portfolioreview:read')")
    public ResponseEntity<List<PortfolioReviewResponse>> getReviewHistory(@PathVariable Long clientId) {
        List<PortfolioReviewResponse> response = portfolioReviewService.getReviewHistory(clientId);
        return ResponseEntity.ok(response);
    }

    // Seed/create a sample realistic eCAS portfolio review session
    @PostMapping("/portfolio-reviews/sample")
    @PreAuthorize("hasAuthority('portfolioreview:create')")
    public ResponseEntity<PortfolioReviewResponse> createSampleReview(
            @RequestParam(defaultValue = "1") Long clientId) {
        PortfolioReviewResponse response = portfolioReviewService.createSampleReview(clientId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // Upload an eCAS statement file directly to AWS S3 and return a secure pre-signed download URL
    @PostMapping(value = "/portfolio-reviews/ecas/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAuthority('portfolioreview:create')")
    public ResponseEntity<EcasUploadResponse> uploadEcas(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "client_id", required = false) Long clientId
    ) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Please select an eCAS statement file to upload");
        }

        String originalFilename = file.getOriginalFilename();
        String safeFilename = originalFilename != null ? originalFilename.replaceAll("[^a-zA-Z0-9._-]", "_") : "statement.pdf";
        String s3Key = "ecas/" + (clientId != null ? clientId : "common") + "/" + System.currentTimeMillis() + "_" + safeFilename;

        try {
            s3Service.uploadFile(s3Key, file.getBytes(), file.getContentType());
        } catch (IOException e) {
            throw new BadRequestException("Failed to read eCAS file contents");
        } catch (Exception e) {
            log.warn("S3 upload for eCAS file failed: {}. Continuing.", e.getMessage());
        }

        String presignedUrl = s3Service.generatePresignedGetUrl(s3Key);

        EcasUploadResponse response = new EcasUploadResponse(
                "SUCCESS",
                "eCAS statement file successfully uploaded to S3",
                clientId,
                originalFilename,
                s3Key,
                presignedUrl
        );

        return ResponseEntity.ok(response);
    }
}
