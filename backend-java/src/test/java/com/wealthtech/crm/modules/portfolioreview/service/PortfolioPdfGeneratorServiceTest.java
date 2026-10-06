package com.wealthtech.crm.modules.portfolioreview.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;

import com.wealthtech.crm.infrastructure.s3.S3Service;
import com.wealthtech.crm.modules.portfolioreview.dto.GeneratedPdfResult;
import com.wealthtech.crm.modules.portfolioreview.entity.EligibleFund;
import com.wealthtech.crm.modules.portfolioreview.entity.PortfolioRecommendation;
import com.wealthtech.crm.modules.portfolioreview.entity.RecommendationFundItem;
import com.wealthtech.crm.modules.portfolioreview.enums.RecommendationFlowType;
import com.wealthtech.crm.modules.riskappetite.enums.ScoreCategory;

@ExtendWith(MockitoExtension.class)
class PortfolioPdfGeneratorServiceTest {

    @Mock
    private S3Service s3Service;

    @InjectMocks
    private PortfolioPdfGeneratorService pdfGeneratorService;

    @Test
    @DisplayName("Should compile in-memory proposal PDF and upload to S3 without writing to disk")
    void testGenerateRecommendationPdfSuccess() {
        EligibleFund fund = EligibleFund.builder()
                .id(1L)
                .fundName("Parag Parikh Flexi Cap Fund")
                .fundSubCategory("Flexi Cap")
                .assetClass("Equity")
                .build();

        RecommendationFundItem item = RecommendationFundItem.builder()
                .id(100L)
                .eligibleFund(fund)
                .amount(new BigDecimal("150000.00"))
                .displayOrder(1)
                .build();

        PortfolioRecommendation recommendation = PortfolioRecommendation.builder()
                .id(10L)
                .clientId(5L)
                .flowType(RecommendationFlowType.NEW_PORTFOLIO)
                .investorCategory(ScoreCategory.AGGRESSIVE)
                .createdAt(LocalDateTime.now())
                .funds(List.of(item))
                .build();

        when(s3Service.generatePresignedGetUrl(anyString())).thenReturn("https://s3.amazonaws.com/recommendations/10.pdf");

        GeneratedPdfResult result = pdfGeneratorService.generateRecommendationPdf(recommendation);

        assertThat(result).isNotNull();
        assertThat(result.s3Key()).isEqualTo("recommendations/10/recommendation_10.pdf");
        assertThat(result.presignedUrl()).isEqualTo("https://s3.amazonaws.com/recommendations/10.pdf");

        verify(s3Service).uploadFile(eq("recommendations/10/recommendation_10.pdf"), any(byte[].class), eq("application/pdf"));
        verify(s3Service).generatePresignedGetUrl(eq("recommendations/10/recommendation_10.pdf"));
    }
}
