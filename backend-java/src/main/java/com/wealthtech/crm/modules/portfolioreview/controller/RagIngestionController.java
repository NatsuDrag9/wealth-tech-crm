package com.wealthtech.crm.modules.portfolioreview.controller;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.wealthtech.crm.modules.portfolioreview.dto.IngestionSummary;
import com.wealthtech.crm.modules.portfolioreview.enums.DocumentType;
import com.wealthtech.crm.modules.portfolioreview.repository.FundDocumentEmbeddingRepository;
import com.wealthtech.crm.modules.portfolioreview.service.FundDocumentIngestionService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Controller for managing mutual fund RAG corpus ingestion and viewing embedding store statistics.
 */
@RestController
@RequestMapping("/java-wtc-api/v1/admin/rag")
@RequiredArgsConstructor
@Slf4j
public class RagIngestionController {

    private final FundDocumentIngestionService ingestionService;
    private final FundDocumentEmbeddingRepository embeddingRepository;

    /**
     * Triggers end-to-end parsing, semantic chunking, embedding generation,
     * and storage for all mutual fund documents in assets/rag-sources/.
     */
    @PostMapping("/ingest")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('masterfund:create')")
    public ResponseEntity<IngestionSummary> triggerCorpusIngestion() {
        log.info("Received request to ingest mutual fund RAG corpus");
        IngestionSummary summary = ingestionService.ingestAllSources();
        return ResponseEntity.ok(summary);
    }

    /**
     * Returns statistics on stored document chunks and vector embeddings.
     */
    @GetMapping("/stats")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('masterfund:read')")
    public ResponseEntity<Map<String, Object>> getIngestionStats() {
        long totalChunks = embeddingRepository.count();
        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalChunks", totalChunks);

        Map<String, Long> countByType = new LinkedHashMap<>();
        for (DocumentType type : DocumentType.values()) {
            countByType.put(type.name(), (long) embeddingRepository.findByIsinAndDocumentType("INF843801019", type).size());
        }
        stats.put("sampleFlexiCapChunksByType", countByType);

        return ResponseEntity.ok(stats);
    }
}
