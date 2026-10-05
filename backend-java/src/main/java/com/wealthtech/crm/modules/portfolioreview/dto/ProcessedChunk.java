package com.wealthtech.crm.modules.portfolioreview.dto;

/**
 * DTO representing a single processed document chunk ready for embedding and storage.
 *
 * @param chunkIndex sequential index of the chunk within the document
 * @param chunkText clean text content of the chunk
 * @param metadataJson JSON-encoded metadata (page number, source filename, chunk length)
 */
public record ProcessedChunk(int chunkIndex, String chunkText, String metadataJson) {
}
