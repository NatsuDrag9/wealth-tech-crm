package com.wealthtech.crm.modules.portfolioreview.dto;

import java.util.Map;

/**
 * Summary report returned after ingesting a mutual fund document corpus.
 */
public record IngestionSummary(
        int totalFilesProcessed,
        int totalChunksIngested,
        Map<String, Integer> chunksByDocumentType,
        long durationMs,
        String status
) {
}
