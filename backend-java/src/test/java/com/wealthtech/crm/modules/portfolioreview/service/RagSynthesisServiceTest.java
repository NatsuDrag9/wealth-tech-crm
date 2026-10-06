package com.wealthtech.crm.modules.portfolioreview.service;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyString;
import org.mockito.Mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;

import com.wealthtech.crm.infrastructure.ai.GeminiGenerationService;
import com.wealthtech.crm.infrastructure.ai.security.PiiProtectionGateway;
import com.wealthtech.crm.infrastructure.ai.security.PiiTokenizationResult;
import com.wealthtech.crm.modules.customer.entity.Client;
import com.wealthtech.crm.modules.customer.repository.ClientRepository;
import com.wealthtech.crm.modules.portfolioreview.dto.RagQueryRequest;
import com.wealthtech.crm.modules.portfolioreview.dto.RagQueryResponse;
import com.wealthtech.crm.modules.portfolioreview.dto.RagRetrievalResponse;
import com.wealthtech.crm.modules.portfolioreview.dto.RetrievedEvidenceChunk;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;

@ExtendWith(MockitoExtension.class)
class RagSynthesisServiceTest {

    @Mock
    private RagRetrievalService retrievalService;
    @Mock
    private RagQueryRefinerService queryRefinerService;
    @Mock
    private GeminiGenerationService generationService;
    @Mock
    private PiiProtectionGateway piiProtectionGateway;
    @Mock
    private ClientRepository clientRepository;
    @Mock
    private com.wealthtech.crm.modules.portfolioreview.repository.RagConversationTurnRepository turnRepository;

    private SimpleMeterRegistry meterRegistry;
    private RagSynthesisService synthesisService;

    @BeforeEach
    void setUp() {
        meterRegistry = new SimpleMeterRegistry();
        synthesisService = new RagSynthesisService(
                retrievalService,
                queryRefinerService,
                generationService,
                piiProtectionGateway,
                clientRepository,
                turnRepository,
                meterRegistry,
                5,
                0.65,
                0.1,
                3
        );
    }

    @Test
    @DisplayName("Should return defensive fallback answer when evidence quality gate fails and refinement cannot resolve evidence")
    void testDefensiveDegradationOnQualityGateFailure() {
        RagQueryRequest request = new RagQueryRequest(
                "Tell me about unapproved scheme",
                "conv-test-1",
                null,
                List.of("INF179K01BE2"),
                5,
                0.65,
                0.1
        );

        when(piiProtectionGateway.tokenize(any(), any(), any()))
                .thenReturn(new PiiTokenizationResult(request.query(), Collections.emptyMap()));

        // Initial retrieval fails quality gate
        RagRetrievalResponse failedRetrieval = new RagRetrievalResponse(
                request.query(),
                false,
                0.35,
                0.35,
                Collections.emptyList(),
                Collections.emptyList(),
                50,
                "Insufficient evidence"
        );
        when(retrievalService.retrieveEvidence(any())).thenReturn(failedRetrieval);

        // Refinement does not improve it
        when(queryRefinerService.refineQuery(anyString()))
                .thenReturn(new RagQueryRefinerService.RefinedQueryResult(request.query(), request.query(), false, "NONE"));

        RagQueryResponse response = synthesisService.queryAndSynthesize(request);

        assertThat(response.isGrounded()).isFalse();
        assertThat(response.synthesizedAnswer()).contains("no verified document chunks met the required quality relevance threshold");
        verify(generationService, never()).generateGroundedResponse(anyString(), anyString(), anyDouble());
    }

    @Test
    @DisplayName("Should synthesize grounded answer with citations and rehydrate PII tokens on backward pass")
    void testGroundedSynthesisWithCitationsAndPiiRehydration() {
        RagQueryRequest request = new RagQueryRequest(
                "What is the TER of HDFC fund for Rahul Sharma?",
                "conv-test-2",
                1L,
                List.of("INF179K01BE2"),
                5,
                0.65,
                0.1
        );

        Client client = Client.builder().id(1L).firstName("Rahul").lastName("Sharma").build();
        when(clientRepository.findByIdWithRelations(1L)).thenReturn(Optional.of(client));

        Map<String, String> vault = Map.of("{{CLIENT_NAME_1}}", "Rahul Sharma");
        PiiTokenizationResult tokenResult = new PiiTokenizationResult(
                "What is the TER of HDFC fund for {{CLIENT_NAME_1}}?",
                vault
        );
        when(piiProtectionGateway.tokenize(any(), any(), any())).thenReturn(tokenResult);

        RetrievedEvidenceChunk chunk = new RetrievedEvidenceChunk(
                1L,
                "INF179K01BE2",
                "HDFC Top 100",
                "FACTSHEET",
                "AGGRESSIVE",
                "EQUITY",
                0,
                "Expense ratio is 1.15% per annum for Direct Plan.",
                0.85,
                "{}",
                java.time.LocalDateTime.now()
        );

        RagRetrievalResponse successfulRetrieval = new RagRetrievalResponse(
                request.query(),
                true,
                0.85,
                0.85,
                List.of("INF179K01BE2"),
                List.of(chunk),
                45,
                "Sufficient evidence"
        );
        when(retrievalService.retrieveEvidence(any())).thenReturn(successfulRetrieval);

        when(generationService.generateGroundedResponse(anyString(), anyString(), anyDouble()))
                .thenReturn("For {{CLIENT_NAME_1}}, the Total Expense Ratio is 1.15% [Source 1].");

        RagQueryResponse response = synthesisService.queryAndSynthesize(request);

        assertThat(response.isGrounded()).isTrue();
        assertThat(response.synthesizedAnswer()).isEqualTo("For Rahul Sharma, the Total Expense Ratio is 1.15% [Source 1].");
        assertThat(response.citations()).hasSize(1);
        assertThat(response.citations().get(0)).contains("[Source 1] HDFC Top 100");
    }
}
