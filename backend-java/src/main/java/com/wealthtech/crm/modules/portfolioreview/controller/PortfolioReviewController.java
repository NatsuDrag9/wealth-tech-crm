package com.wealthtech.crm.modules.portfolioreview.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.wealthtech.crm.modules.portfolioreview.dto.EligibleFundResponse;
import com.wealthtech.crm.modules.portfolioreview.dto.PortfolioReviewResponse;
import com.wealthtech.crm.modules.portfolioreview.service.PortfolioReviewService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/java-wtc-api/v1")
@RequiredArgsConstructor
public class PortfolioReviewController {

    private final PortfolioReviewService portfolioReviewService;

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
}
