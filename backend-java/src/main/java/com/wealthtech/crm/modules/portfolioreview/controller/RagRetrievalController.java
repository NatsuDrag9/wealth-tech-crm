package com.wealthtech.crm.modules.portfolioreview.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.wealthtech.crm.modules.portfolioreview.dto.RagRetrievalRequest;
import com.wealthtech.crm.modules.portfolioreview.dto.RagRetrievalResponse;
import com.wealthtech.crm.modules.portfolioreview.service.RagRetrievalService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Controller exposing candidate-constrained RAG hybrid retrieval and evidence quality gate verification.
 */
@RestController
@RequestMapping("/java-wtc-api/v1/rag")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "RAG Retrieval", description = "Candidate-constrained vector search & evidence quality gate")
public class RagRetrievalController {

    private final RagRetrievalService retrievalService;

    @PostMapping("/retrieve")
    @PreAuthorize("hasAuthority('portfolioreview:read') or hasRole('ADMIN')")
    @Operation(summary = "Execute candidate-constrained RAG retrieval with post-retrieval validation gate")
    public ResponseEntity<RagRetrievalResponse> retrieve(@Valid @RequestBody RagRetrievalRequest request) {
        log.info("Received RAG retrieval request: query='{}', clientId={}, candidateIsinsCount={}",
                request.query(), request.clientId(),
                request.candidateIsins() != null ? request.candidateIsins().size() : 0);

        RagRetrievalResponse response = retrievalService.retrieveEvidence(request);
        return ResponseEntity.ok(response);
    }
}
