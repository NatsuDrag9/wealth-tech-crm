package com.wealthtech.crm.modules.portfolioreview.service;

import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import org.mockito.Mock;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;

import com.wealthtech.crm.infrastructure.ai.GeminiEmbeddingService;
import com.wealthtech.crm.modules.portfolioreview.dto.FundDocumentEvidenceProjection;
import com.wealthtech.crm.modules.portfolioreview.dto.RagRetrievalRequest;
import com.wealthtech.crm.modules.portfolioreview.dto.RagRetrievalResponse;
import com.wealthtech.crm.modules.portfolioreview.repository.EligibleFundRepository;
import com.wealthtech.crm.modules.portfolioreview.repository.FundDocumentEmbeddingRepository;
import com.wealthtech.crm.modules.riskappetite.repository.RaRepository;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;

@ExtendWith(MockitoExtension.class)
class RagRetrievalServiceTest {

    @Mock
    private FundDocumentEmbeddingRepository embeddingRepository;
    @Mock
    private EligibleFundRepository eligibleFundRepository;
    @Mock
    private RaRepository raRepository;
    @Mock
    private GeminiEmbeddingService embeddingService;

    private SimpleMeterRegistry meterRegistry;
    private RagRetrievalService retrievalService;

    @BeforeEach
    void setUp() {
        meterRegistry = new SimpleMeterRegistry();
        retrievalService = new RagRetrievalService(
                embeddingRepository,
                eligibleFundRepository,
                raRepository,
                embeddingService,
                meterRegistry,
                0.65
        );
    }

    @Test
    @DisplayName("Should push down candidate ISINs and evaluate Evidence Quality Gate as passed when score >= 0.65")
    void testQualityGatePassesAboveThreshold() {
        List<String> candidateIsins = List.of("INF179K01BE2");
        RagRetrievalRequest request = new RagRetrievalRequest(
                "What is the TER of HDFC Top 100?",
                null,
                candidateIsins,
                null,
                5,
                0.65
        );

        when(embeddingService.getEmbedding(anyString())).thenReturn(new float[768]);

        FundDocumentEvidenceProjection projection = mock(FundDocumentEvidenceProjection.class);
        when(projection.getId()).thenReturn(1L);
        when(projection.getIsin()).thenReturn("INF179K01BE2");
        when(projection.getFundName()).thenReturn("HDFC Top 100");
        when(projection.getDocumentType()).thenReturn("FACTSHEET");
        when(projection.getScoreCategory()).thenReturn("AGGRESSIVE");
        when(projection.getAssetClass()).thenReturn("EQUITY");
        when(projection.getChunkIndex()).thenReturn(0);
        when(projection.getChunkText()).thenReturn("Total Expense Ratio is 1.15%");
        when(projection.getMetadata()).thenReturn("{}");
        when(projection.getHybridScore()).thenReturn(0.85);

        when(embeddingRepository.findTopKRelevantEvidence(eq(candidateIsins), anyString(), anyString(), eq(5)))
                .thenReturn(List.of(projection));

        RagRetrievalResponse response = retrievalService.retrieveEvidence(request);

        assertThat(response.isSufficient()).isTrue();
        assertThat(response.ragSimilarityScore()).isEqualTo(0.85);
        assertThat(response.evidenceChunks()).hasSize(1);
        assertThat(response.evidenceChunks().get(0).fundName()).isEqualTo("HDFC Top 100");

        verify(embeddingRepository).findTopKRelevantEvidence(eq(candidateIsins), anyString(), anyString(), eq(5));
    }

    @Test
    @DisplayName("Should flag quality gate as failed when retrieved score is below 0.65 threshold")
    void testQualityGateFailsBelowThreshold() {
        List<String> candidateIsins = List.of("INF179K01BE2");
        RagRetrievalRequest request = new RagRetrievalRequest(
                "Unrelated query about crypto",
                null,
                candidateIsins,
                null,
                5,
                0.65
        );

        when(embeddingService.getEmbedding(anyString())).thenReturn(new float[768]);

        FundDocumentEvidenceProjection projection = mock(FundDocumentEvidenceProjection.class);
        when(projection.getId()).thenReturn(2L);
        when(projection.getIsin()).thenReturn("INF179K01BE2");
        when(projection.getFundName()).thenReturn("HDFC Top 100");
        when(projection.getDocumentType()).thenReturn("FACTSHEET");
        when(projection.getChunkIndex()).thenReturn(1);
        when(projection.getChunkText()).thenReturn("Market commentary");
        when(projection.getMetadata()).thenReturn("{}");
        when(projection.getHybridScore()).thenReturn(0.42);

        when(embeddingRepository.findTopKRelevantEvidence(anyList(), anyString(), anyString(), anyInt()))
                .thenReturn(List.of(projection));

        RagRetrievalResponse response = retrievalService.retrieveEvidence(request);

        assertThat(response.isSufficient()).isFalse();
        assertThat(response.ragSimilarityScore()).isEqualTo(0.42);
    }

    @Test
    @DisplayName("Should return empty insufficient response when candidate filter yields zero funds")
    void testEmptyCandidateFilterReturnsZeroRelevance() {
        RagRetrievalRequest request = new RagRetrievalRequest(
                "Any query",
                null,
                Collections.emptyList(),
                null,
                5,
                0.65
        );

        when(eligibleFundRepository.findAll()).thenReturn(Collections.emptyList());

        RagRetrievalResponse response = retrievalService.retrieveEvidence(request);

        assertThat(response.isSufficient()).isFalse();
        assertThat(response.ragSimilarityScore()).isEqualTo(0.0);
        assertThat(response.evidenceChunks()).isEmpty();
    }
}
