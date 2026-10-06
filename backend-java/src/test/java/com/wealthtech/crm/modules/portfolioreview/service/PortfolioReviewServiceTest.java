package com.wealthtech.crm.modules.portfolioreview.service;

import java.util.Collections;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import static org.mockito.ArgumentMatchers.any;
import org.mockito.Mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;

import com.wealthtech.crm.infrastructure.s3.S3Service;
import com.wealthtech.crm.modules.portfolioreview.dto.CreateRecommendationRequest;
import com.wealthtech.crm.modules.portfolioreview.dto.GeneratedPdfResult;
import com.wealthtech.crm.modules.portfolioreview.entity.PortfolioRecommendation;
import com.wealthtech.crm.modules.portfolioreview.enums.RecommendationStatus;
import com.wealthtech.crm.modules.portfolioreview.repository.EligibleFundRepository;
import com.wealthtech.crm.modules.portfolioreview.repository.PortfolioEntryRepository;
import com.wealthtech.crm.modules.portfolioreview.repository.PortfolioRecommendationRepository;
import com.wealthtech.crm.modules.portfolioreview.repository.PortfolioReviewRepository;
import com.wealthtech.crm.modules.portfolioreview.repository.RecommendationFundItemRepository;
import com.wealthtech.crm.modules.riskappetite.enums.AssessmentStatus;
import com.wealthtech.crm.modules.riskappetite.repository.RaRepository;

@ExtendWith(MockitoExtension.class)
class PortfolioReviewServiceTest {

    @Mock
    private PortfolioReviewRepository reviewRepo;
    @Mock
    private EligibleFundRepository efRepo;
    @Mock
    private PortfolioEntryRepository entryRepo;
    @Mock
    private PortfolioRecommendationRepository recommendationRepo;
    @Mock
    private RecommendationFundItemRepository fundItemRepository;
    @Mock
    private RaRepository raRepo;
    @Mock
    private PortfolioPdfGeneratorService pdfGeneratorService;
    @Mock
    private S3Service s3Service;

    private PortfolioReviewService portfolioReviewService;

    @BeforeEach
    void setUp() {
        portfolioReviewService = new PortfolioReviewService(
                reviewRepo,
                efRepo,
                entryRepo,
                recommendationRepo,
                fundItemRepository,
                raRepo,
                pdfGeneratorService,
                s3Service
        );
    }

    @Test
    @DisplayName("Should block recommendation creation if client has not completed mandatory risk assessment")
    void testComplianceGateBlocksUnassessedClient() {
        CreateRecommendationRequest request = new CreateRecommendationRequest(
                5L,
                1L,
                "REPLACE_FUNDS",
                Collections.emptyList()
        );

        when(raRepo.findTopByClientIdAndStatusOrderByCompletedAtDesc(5L, AssessmentStatus.COMPLETED))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> portfolioReviewService.createRecommendation(request))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("must complete a risk assessment before receiving recommendations");
    }

    @Test
    @DisplayName("Should transition recommendation status to PDF_GENERATED when PDF rendering succeeds")
    void testGeneratePdfAsyncSuccess() {
        Long recId = 100L;
        PortfolioRecommendation recommendation = PortfolioRecommendation.builder()
                .id(recId)
                .status(RecommendationStatus.SAVED)
                .build();

        when(recommendationRepo.findById(recId)).thenReturn(Optional.of(recommendation));

        GeneratedPdfResult pdfResult = new GeneratedPdfResult(
                "recommendations/100/proposal.pdf",
                "https://s3.amazonaws.com/bucket/proposal.pdf"
        );
        when(pdfGeneratorService.generateRecommendationPdf(recommendation)).thenReturn(pdfResult);

        portfolioReviewService.generatePdfAsync(recId);

        assertThat(recommendation.getStatus()).isEqualTo(RecommendationStatus.PDF_GENERATED);
        assertThat(recommendation.getGeneratedDocumentUrl()).isEqualTo("https://s3.amazonaws.com/bucket/proposal.pdf");
        assertThat(recommendation.getDocumentS3Key()).isEqualTo("recommendations/100/proposal.pdf");
        verify(recommendationRepo).save(recommendation);
    }

    @Test
    @DisplayName("Should transition recommendation status to PDF_FAILED when PDF rendering throws exception")
    void testGeneratePdfAsyncFailure() {
        Long recId = 101L;
        PortfolioRecommendation recommendation = PortfolioRecommendation.builder()
                .id(recId)
                .status(RecommendationStatus.SAVED)
                .build();

        when(recommendationRepo.findById(recId)).thenReturn(Optional.of(recommendation));
        when(pdfGeneratorService.generateRecommendationPdf(any()))
                .thenThrow(new RuntimeException("OpenPDF layout exception"));

        portfolioReviewService.generatePdfAsync(recId);

        assertThat(recommendation.getStatus()).isEqualTo(RecommendationStatus.PDF_FAILED);
        verify(recommendationRepo).save(recommendation);
    }
}
