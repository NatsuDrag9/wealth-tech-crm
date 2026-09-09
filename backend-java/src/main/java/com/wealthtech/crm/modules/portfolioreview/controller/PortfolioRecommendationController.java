package com.wealthtech.crm.modules.portfolioreview.controller;

import java.net.MalformedURLException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.wealthtech.crm.modules.portfolioreview.dto.CreateRecommendationRequest;
import com.wealthtech.crm.modules.portfolioreview.dto.FlowTypeResponse;
import com.wealthtech.crm.modules.portfolioreview.dto.PortfolioRecommendationResponse;
import com.wealthtech.crm.modules.portfolioreview.service.PortfolioReviewService;
import com.wealthtech.crm.modules.usermanager.exception.BadRequestException;
import com.wealthtech.crm.modules.usermanager.exception.NotFoundException;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class PortfolioRecommendationController {

    private final PortfolioReviewService portfolioReviewService;

    // Recommendation flow types (REPLACE_FUNDS, NEW_PORTFOLIO)
    @GetMapping("/portfolio-recommendations/flow-types")
    @PreAuthorize("hasAuthority('portfolioreview:read')")
    public ResponseEntity<List<FlowTypeResponse>> getFlowTypes() {
        List<FlowTypeResponse> response = portfolioReviewService.getFlowTypes();
        return ResponseEntity.ok(response);
    }

    // Create investment recommendation proposal
    @PostMapping("/portfolio-recommendations")
    @PreAuthorize("hasAuthority('portfolioreview:create')")
    public ResponseEntity<PortfolioRecommendationResponse> createRecommendation(
            @Valid @RequestBody CreateRecommendationRequest request) {
        PortfolioRecommendationResponse response = portfolioReviewService.createRecommendation(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // Recommendation by id
    @GetMapping("/portfolio-recommendations/{id}")
    @PreAuthorize("hasAuthority('portfolioreview:read')")
    public ResponseEntity<PortfolioRecommendationResponse> getRecommendation(@PathVariable Long id) {
        PortfolioRecommendationResponse response = portfolioReviewService.getRecommendation(id);
        return ResponseEntity.ok(response);
    }

    // Recommendations by client
    @GetMapping("/portfolio-recommendations")
    @PreAuthorize("hasAuthority('portfolioreview:read')")
    public ResponseEntity<List<PortfolioRecommendationResponse>> getRecommendationsByClient(
            @RequestParam Long clientId) {
        List<PortfolioRecommendationResponse> response = portfolioReviewService.getRecommendationsByClient(clientId);
        return ResponseEntity.ok(response);
    }

    // Trigger asynchronous PDF generation (HTTP 202 Accepted)
    @PostMapping("/portfolio-recommendations/{id}/generate-pdf")
    @PreAuthorize("hasAuthority('portfolioreview:update')")
    public ResponseEntity<PortfolioRecommendationResponse> triggerPdfGeneration(@PathVariable Long id) {
        PortfolioRecommendationResponse response = portfolioReviewService.triggerPdfGeneration(id);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
    }

    // Stream generated PDF proposal document
    @GetMapping("/documents/recommendations/{filename:.+}")
    @PreAuthorize("hasAuthority('portfolioreview:read')")
    public ResponseEntity<Resource> downloadRecommendationPdf(@PathVariable String filename) {
        if (filename == null || filename.contains("..") || filename.contains("/") || filename.contains("\\")) {
            throw new BadRequestException("Invalid filename");
        }

        try {
            Path filePath = Paths.get("uploads/recommendations").resolve(filename).normalize();
            Resource resource = new UrlResource(filePath.toUri());

            if (!resource.exists() || !resource.isReadable()) {
                throw new NotFoundException("Document not found: " + filename);
            }

            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_PDF)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + resource.getFilename() + "\"")
                    .body(resource);
        } catch (MalformedURLException e) {
            throw new NotFoundException("Document not found: " + filename);
        }
    }
}
