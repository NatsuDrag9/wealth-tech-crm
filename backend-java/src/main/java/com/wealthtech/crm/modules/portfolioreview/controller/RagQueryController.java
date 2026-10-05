package com.wealthtech.crm.modules.portfolioreview.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.wealthtech.crm.modules.portfolioreview.dto.RagQueryRequest;
import com.wealthtech.crm.modules.portfolioreview.dto.RagQueryResponse;
import com.wealthtech.crm.modules.portfolioreview.service.RagSynthesisService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * REST controller exposing full-pipeline grounded RAG query synthesis:
 * Candidate filtering -> Hybrid vector retrieval -> Quality gate -> Query refinement loop -> LLM synthesis.
 */
@RestController
@RequestMapping("/java-wtc-api/v1/rag")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "RAG Grounded Synthesis", description = "End-to-end grounded query synthesis with inline source citations")
public class RagQueryController {

    private final RagSynthesisService synthesisService;

    @PostMapping("/query")
    @PreAuthorize("hasAuthority('portfolioreview:read') or hasRole('ADMIN')")
    @Operation(summary = "Ask a financial question and receive a verified, grounded answer backed by mutual fund disclosures")
    public ResponseEntity<RagQueryResponse> queryAndSynthesize(@Valid @RequestBody RagQueryRequest request) {
        log.info("Received RAG query request: query='{}', clientId={}, candidateIsinsCount={}",
                request.query(), request.clientId(),
                request.candidateIsins() != null ? request.candidateIsins().size() : 0);

        RagQueryResponse response = synthesisService.queryAndSynthesize(request);
        return ResponseEntity.ok(response);
    }
}
