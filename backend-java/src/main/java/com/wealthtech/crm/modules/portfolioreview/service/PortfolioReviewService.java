package com.wealthtech.crm.modules.portfolioreview.service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.wealthtech.crm.modules.portfolioreview.dto.CreateRecommendationRequest;
import com.wealthtech.crm.modules.portfolioreview.dto.EligibleFundResponse;
import com.wealthtech.crm.modules.portfolioreview.dto.FlowTypeResponse;
import com.wealthtech.crm.modules.portfolioreview.dto.GeneratedPdfResult;
import com.wealthtech.crm.modules.portfolioreview.dto.PortfolioEntryResponse;
import com.wealthtech.crm.modules.portfolioreview.dto.PortfolioRecommendationResponse;
import com.wealthtech.crm.modules.portfolioreview.dto.PortfolioReviewResponse;
import com.wealthtech.crm.modules.portfolioreview.dto.RfItemRequest;
import com.wealthtech.crm.modules.portfolioreview.dto.RfItemResponse;
import com.wealthtech.crm.modules.portfolioreview.entity.EligibleFund;
import com.wealthtech.crm.modules.portfolioreview.entity.PortfolioEntry;
import com.wealthtech.crm.modules.portfolioreview.entity.PortfolioRecommendation;
import com.wealthtech.crm.modules.portfolioreview.entity.PortfolioReview;
import com.wealthtech.crm.modules.portfolioreview.entity.RecommendationFundItem;
import com.wealthtech.crm.modules.portfolioreview.enums.EntryAction;
import com.wealthtech.crm.modules.portfolioreview.enums.RecommendationFlowType;
import com.wealthtech.crm.modules.portfolioreview.enums.RecommendationStatus;
import com.wealthtech.crm.modules.portfolioreview.enums.ReviewStatus;
import com.wealthtech.crm.modules.portfolioreview.repository.EligibleFundRepository;
import com.wealthtech.crm.modules.portfolioreview.repository.PortfolioEntryRepository;
import com.wealthtech.crm.modules.portfolioreview.repository.PortfolioRecommendationRepository;
import com.wealthtech.crm.modules.portfolioreview.repository.PortfolioReviewRepository;
import com.wealthtech.crm.modules.portfolioreview.repository.RecommendationFundItemRepository;
import com.wealthtech.crm.modules.riskappetite.entity.RiskAssessment;
import com.wealthtech.crm.modules.riskappetite.enums.AssessmentStatus;
import com.wealthtech.crm.modules.riskappetite.enums.ScoreCategory;
import com.wealthtech.crm.modules.riskappetite.repository.RaRepository;
import com.wealthtech.crm.infrastructure.s3.S3Service;
import com.wealthtech.crm.modules.usermanager.exception.NotFoundException;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

// GET EligibleFunds
// GET FlowTypes

// GET getPortfolioReview(Long reviewId)
// GET getLatestPortfolioReview(Long clientId)
// POST createSampleReview(Long clientId) - dummy endpoint

// POST createRecommendationRequest(CreateRecommendationRequest request)
// GET getRecommendationId(Long id)
// GET getRecommendationsByClient(Long clientId)
// POST generatePdf(Long id)

@Slf4j
@Service 
@RequiredArgsConstructor
public class PortfolioReviewService {
    private final PortfolioReviewRepository reviewRepo;
    private final EligibleFundRepository efRepo;
    private final PortfolioEntryRepository entryRepo;
    private final PortfolioRecommendationRepository recommendationRepo;
    private final RecommendationFundItemRepository fundItemRepository;
    private final RaRepository raRepo;
    private final PortfolioPdfGeneratorService pdfGeneratorService;
    private final S3Service s3Service;

    // ==========================================
    // 1. MASTER FUND UNIVERSE & UTILITIES
    // ==========================================

    public List<FlowTypeResponse> getFlowTypes() {
        return Arrays.stream(RecommendationFlowType.values())
                .map(type -> new FlowTypeResponse(type.name(), type.getDisplayName()))
                .toList();
    }

    public List<EligibleFundResponse> getEligibleFunds(String categoryCode) {
        List<EligibleFund> funds;
        if (categoryCode != null && !categoryCode.isBlank()) {
            ScoreCategory category = ScoreCategory.fromCode(categoryCode);
            funds = efRepo.findByScoreCategoryAndIsActiveTrue(category);
        } else {
            funds = efRepo.findAll().stream()
                    .filter(EligibleFund::getIsActive)
                    .toList();
        }
        return funds.stream().map(this::mapToFundResponse).toList();
    }

    // ==========================================
    // 2. PORTFOLIO REVIEWS & HOLDINGS (eCAS)
    // ==========================================

    public PortfolioReviewResponse getReview(Long reviewId) {
        PortfolioReview review = reviewRepo.findById(reviewId)
                .orElseThrow(() -> new NotFoundException("Portfolio review not found with id: " + reviewId));
        return mapToReviewResponse(review);
    }

    public PortfolioReviewResponse getLatestReview(Long clientId) {
        PortfolioReview review = reviewRepo.findTopByClientIdOrderByCreatedAtDesc(clientId)
                .orElseThrow(() -> new NotFoundException("No portfolio review found for client: " + clientId));
        return mapToReviewResponse(review);
    }

    public List<PortfolioReviewResponse> getReviewHistory(Long clientId) {
        return reviewRepo.findByClientIdOrderByCreatedAtDesc(clientId).stream()
                .map(this::mapToReviewResponse)
                .toList();
    }

    /**
     * Creates a realistic eCAS portfolio review session for testing.
     * Contains 4 holdings: 2 marked HOLD, 2 marked SELL.
     */
    @Transactional
    public PortfolioReviewResponse createSampleReview(Long clientId) {
        PortfolioReview review = PortfolioReview.builder()
                .clientId(clientId)
                .status(ReviewStatus.COMPLETED)
                .totalInvested(new BigDecimal("630000.00"))
                .totalCurrentValue(new BigDecimal("783400.00"))
                .totalGain(new BigDecimal("153400.00"))
                .gainPercentage(24.35)
                .cagr(12.5)
                .note("Sample eCAS upload parsed successfully")
                .build();

        PortfolioReview savedReview = reviewRepo.save(review);

        List<PortfolioEntry> entries = List.of(
                PortfolioEntry.builder()
                        .portfolioReview(savedReview)
                        .fundName("HDFC Top 100 Fund")
                        .isin("INF179K01BE2")
                        .units(new BigDecimal("1000.00"))
                        .purchaseNav(new BigDecimal("500.00"))
                        .currentNav(new BigDecimal("650.00"))
                        .investedAmount(new BigDecimal("500000.00"))
                        .currentValue(new BigDecimal("650000.00"))
                        .gain(new BigDecimal("150000.00"))
                        .absReturnPct(30.0)
                        .cagrPct(14.5)
                        .holdingDays(730)
                        .action(EntryAction.HOLD)
                        .build(),
                PortfolioEntry.builder()
                        .portfolioReview(savedReview)
                        .fundName("Axis Bluechip Fund")
                        .isin("INF846K01164")
                        .units(new BigDecimal("800.00"))
                        .purchaseNav(new BigDecimal("40.00"))
                        .currentNav(new BigDecimal("48.00"))
                        .investedAmount(new BigDecimal("32000.00"))
                        .currentValue(new BigDecimal("38400.00"))
                        .gain(new BigDecimal("6400.00"))
                        .absReturnPct(20.0)
                        .cagrPct(12.0)
                        .holdingDays(600)
                        .action(EntryAction.HOLD)
                        .build(),
                PortfolioEntry.builder()
                        .portfolioReview(savedReview)
                        .fundName("Underperforming Infra Fund")
                        .isin("INF200K01INF")
                        .units(new BigDecimal("500.00"))
                        .purchaseNav(new BigDecimal("100.00"))
                        .currentNav(new BigDecimal("90.00"))
                        .investedAmount(new BigDecimal("50000.00"))
                        .currentValue(new BigDecimal("45000.00"))
                        .gain(new BigDecimal("-5000.00"))
                        .absReturnPct(-10.0)
                        .cagrPct(-4.5)
                        .holdingDays(800)
                        .action(EntryAction.SELL)
                        .build(),
                PortfolioEntry.builder()
                        .portfolioReview(savedReview)
                        .fundName("High Expense Small Cap Fund")
                        .isin("INF109K01SMC")
                        .units(new BigDecimal("400.00"))
                        .purchaseNav(new BigDecimal("120.00"))
                        .currentNav(new BigDecimal("125.00"))
                        .investedAmount(new BigDecimal("48000.00"))
                        .currentValue(new BigDecimal("50000.00"))
                        .gain(new BigDecimal("2000.00"))
                        .absReturnPct(4.16)
                        .cagrPct(1.8)
                        .holdingDays(850)
                        .action(EntryAction.SELL)
                        .build()
        );

        entryRepo.saveAll(entries);
        savedReview.getEntries().addAll(entries);

        return mapToReviewResponse(savedReview);
    }

    // ==========================================
    // 3. RECOMMENDATIONS & COMPLIANCE GATE
    // ==========================================

    @Transactional
    public PortfolioRecommendationResponse createRecommendation(CreateRecommendationRequest request) {
        // MANDATORY COMPLIANCE GATE: Client must have completed a risk assessment
        RiskAssessment latestAssessment = raRepo
                .findTopByClientIdAndStatusOrderByCompletedAtDesc(request.clientId(), AssessmentStatus.COMPLETED)
                .orElseThrow(() -> new IllegalStateException(
                        "Client " + request.clientId() + " must complete a risk assessment before receiving recommendations"));

        RecommendationFlowType flowType;
        try {
            flowType = RecommendationFlowType.valueOf(request.flowType().trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid flow_type: " + request.flowType());
        }

        PortfolioReview review = null;
        if (flowType == RecommendationFlowType.REPLACE_FUNDS) {
            if (request.portfolioReviewId() == null) {
                throw new IllegalArgumentException("portfolio_review_id is required for REPLACE_FUNDS flow");
            }
            review = reviewRepo.findById(request.portfolioReviewId())
                    .orElseThrow(() -> new NotFoundException("Portfolio review not found: " + request.portfolioReviewId()));

            if (!review.getClientId().equals(request.clientId())) {
                throw new IllegalArgumentException("Review does not belong to client: " + request.clientId());
            }

            // Validate that every replaced entry exists in this review and has action == SELL
            for (RfItemRequest item : request.funds()) {
                if (item.replacesEntryId() != null) {
                    PortfolioEntry entry = entryRepo.findById(item.replacesEntryId())
                            .orElseThrow(() -> new NotFoundException("Replaced entry not found: " + item.replacesEntryId()));
                    if (!entry.getPortfolioReview().getId().equals(review.getId())) {
                        throw new IllegalArgumentException("Holding " + item.replacesEntryId() + " does not belong to review " + review.getId());
                    }
                    if (entry.getAction() != EntryAction.SELL) {
                        throw new IllegalArgumentException("Holding " + item.replacesEntryId() + " is marked " + entry.getAction() + " - only SELL holdings can be replaced");
                    }
                }
            }
        } else if (flowType == RecommendationFlowType.NEW_PORTFOLIO) {
            for (RfItemRequest item : request.funds()) {
                if (item.replacesEntryId() != null) {
                    throw new IllegalArgumentException("replaces_entry_id cannot be provided for NEW_PORTFOLIO flow");
                }
            }
        }

        // Build and save parent Recommendation
        PortfolioRecommendation recommendation = PortfolioRecommendation.builder()
                .clientId(request.clientId())
                .portfolioReview(review)
                .flowType(flowType)
                .status(RecommendationStatus.SAVED)
                .investorCategory(latestAssessment.getScoreCategory())
                .build();

        PortfolioRecommendation savedRecommendation = recommendationRepo.save(recommendation);

        // Build and save child fund line-items
        List<RecommendationFundItem> items = new ArrayList<>();
        int order = 1;
        for (RfItemRequest itemReq : request.funds()) {
            EligibleFund fund = efRepo.findById(itemReq.eligibleFundId())
                    .orElseThrow(() -> new NotFoundException("Eligible fund not found: " + itemReq.eligibleFundId()));

            PortfolioEntry replacesEntry = null;
            if (itemReq.replacesEntryId() != null) {
                replacesEntry = entryRepo.findById(itemReq.replacesEntryId()).orElse(null);
            }

            RecommendationFundItem fundItem = RecommendationFundItem.builder()
                    .recommendation(savedRecommendation)
                    .eligibleFund(fund)
                    .amount(itemReq.amount())
                    .replacesEntry(replacesEntry)
                    .displayOrder(itemReq.displayOrder() != null ? itemReq.displayOrder() : order++)
                    .build();

            items.add(fundItem);
        }

        fundItemRepository.saveAll(items);
        savedRecommendation.getFunds().addAll(items);

        return mapToRecommendationResponse(savedRecommendation);
    }

    public PortfolioRecommendationResponse getRecommendation(Long id) {
        PortfolioRecommendation recommendation = recommendationRepo.findById(id)
                .orElseThrow(() -> new NotFoundException("Portfolio recommendation not found with id: " + id));
        return mapToRecommendationResponse(recommendation);
    }

    public List<PortfolioRecommendationResponse> getRecommendationsByClient(Long clientId) {
        return recommendationRepo.findByClientIdOrderByCreatedAtDesc(clientId).stream()
                .map(this::mapToRecommendationResponse)
                .toList();
    }

    /**
     * Non-blocking asynchronous PDF generation running on Spring's @Async thread pool.
     */
    @Async
    public void generatePdfAsync(Long recommendationId) {
        try {
            PortfolioRecommendation rec = recommendationRepo.findById(recommendationId)
                    .orElseThrow(() -> new NotFoundException("Recommendation not found: " + recommendationId));

            if (rec.getStatus() == RecommendationStatus.PDF_GENERATED && rec.getGeneratedDocumentUrl() != null) {
                return;
            }

            GeneratedPdfResult result = pdfGeneratorService.generateRecommendationPdf(rec);

            rec.setStatus(RecommendationStatus.PDF_GENERATED);
            rec.setGeneratedDocumentUrl(result.presignedUrl());
            rec.setDocumentS3Key(result.s3Key());
            recommendationRepo.save(rec);

        } catch (Exception ex) {
            recommendationRepo.findById(recommendationId).ifPresent(rec -> {
                rec.setStatus(RecommendationStatus.PDF_FAILED);
                recommendationRepo.save(rec);
            });
        }
    }

    /**
     * Triggers async generation and returns the current recommendation state immediately (HTTP 202).
     */
    public PortfolioRecommendationResponse triggerPdfGeneration(Long recommendationId) {
        PortfolioRecommendation recommendation = recommendationRepo.findById(recommendationId)
                .orElseThrow(() -> new NotFoundException("Portfolio recommendation not found: " + recommendationId));

        if (recommendation.getStatus() == RecommendationStatus.PDF_GENERATED && recommendation.getGeneratedDocumentUrl() != null) {
            return mapToRecommendationResponse(recommendation);
        }

        generatePdfAsync(recommendationId);

        return mapToRecommendationResponse(recommendation);
    }

    // Mappers
    private EligibleFundResponse mapToFundResponse(EligibleFund ef) {
        return new EligibleFundResponse(
            ef.getId(), 
            ef.getFundName(), 
            ef.getIsin(), 
            ef.getFundSubCategory(), 
            ef.getAssetClass(), 
            ef.getInstrumentType(), 
            ef.getScoreCategory() != null ? ef.getScoreCategory().getCode() : null
        );
    }

    private PortfolioEntryResponse mapToEntryResponse(PortfolioEntry pe) {
        return new PortfolioEntryResponse(
            pe.getId(),
            pe.getFundName(),
            pe.getIsin(),
            pe.getUnits(),
            pe.getPurchaseNav(),
            pe.getCurrentNav(),
            pe.getInvestedAmount(),
            pe.getCurrentValue(),
            pe.getAbsReturnPct(),
            pe.getGain(),
            pe.getCagrPct(),
            pe.getHoldingDays(),
            pe.getAction() != null ? pe.getAction().name() : null
        );
    }

    private PortfolioReviewResponse mapToReviewResponse(PortfolioReview pr) {
        List<PortfolioEntryResponse> entries = pr.getEntries().stream()
                .map(this::mapToEntryResponse)
                .toList();

        return new PortfolioReviewResponse(
            pr.getId(),
            pr.getClientId(),
            pr.getStatus() != null ? pr.getStatus().name() : null,
            pr.getTotalInvested(),
            pr.getTotalCurrentValue(),
            pr.getTotalGain(),
            pr.getGainPercentage(),
            pr.getCagr(),
            pr.getNote(),
            entries,
            pr.getCreatedAt()
        );
    }

    private PortfolioRecommendationResponse mapToRecommendationResponse(PortfolioRecommendation pr) {
        String docUrl = pr.getGeneratedDocumentUrl();
        if (pr.getDocumentS3Key() != null && !pr.getDocumentS3Key().isBlank()) {
            try {
                docUrl = s3Service.generatePresignedGetUrl(pr.getDocumentS3Key());
            } catch (Exception e) {
                log.warn("Failed to generate presigned URL for documentS3Key {}: {}", pr.getDocumentS3Key(), e.getMessage());
            }
        }

        List<RfItemResponse> funds = pr.getFunds().stream()
                .map(item -> new RfItemResponse(
                    item.getId(),
                    mapToFundResponse(item.getEligibleFund()),
                    item.getAmount(),
                    item.getReplacesEntry() != null ? item.getReplacesEntry().getId() : null,
                    item.getDisplayOrder() 
                ))
                .toList();

        return new PortfolioRecommendationResponse(
            pr.getId(),
            pr.getClientId(),
            pr.getPortfolioReview() != null ? pr.getPortfolioReview().getId() : null,
            pr.getFlowType() != null ? pr.getFlowType().name() : null,
            pr.getStatus() != null ? pr.getStatus().name() : null,
            pr.getInvestorCategory() != null ? pr.getInvestorCategory().getCode() : null,
            docUrl,
            pr.getDocumentS3Key(),
            funds,
            pr.getCreatedAt()
        );
    }
}
