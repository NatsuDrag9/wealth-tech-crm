package com.wealthtech.crm.modules.portfolioreview.service;

import java.util.*;

import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.wealthtech.crm.modules.portfolioreview.dto.ExtractedPdfPage;
import com.wealthtech.crm.modules.portfolioreview.dto.ProcessedChunk;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Service for segmenting extracted document text into semantic chunks
 * with configurable overlap and natural paragraph/sentence boundary preservation.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DocumentChunkingService {

    private static final int DEFAULT_TARGET_CHUNK_SIZE = 1200; // characters (~250-300 words)
    private static final int DEFAULT_OVERLAP_SIZE = 200;      // characters

    private final ObjectMapper objectMapper;

    /**
     * Chunks a document page-by-page, attaching page metadata and preserving context across boundaries.
     *
     * @param pages list of extracted pages
     * @param sourceFileName name of the source PDF file
     * @param schemeName mutual fund scheme name
     * @param isin 12-character ISIN code
     * @return list of ProcessedChunk objects
     */
    public List<ProcessedChunk> chunkDocumentPages(
            List<ExtractedPdfPage> pages,
            String sourceFileName,
            String schemeName,
            String isin) {
        if (pages == null || pages.isEmpty()) {
            return Collections.emptyList();
        }

        List<ProcessedChunk> chunks = new ArrayList<>();
        int globalChunkIndex = 0;

        for (ExtractedPdfPage page : pages) {
            String pageText = page.text();
            if (pageText == null || pageText.isBlank()) {
                continue;
            }

            List<String> rawChunks = splitIntoChunks(pageText, DEFAULT_TARGET_CHUNK_SIZE, DEFAULT_OVERLAP_SIZE);
            for (String rawChunk : rawChunks) {
                if (rawChunk.length() < 30) {
                    continue; // Skip trivial noise fragments
                }

                Map<String, Object> metaMap = new LinkedHashMap<>();
                metaMap.put("sourceFile", sourceFileName);
                metaMap.put("page", page.pageNumber());
                metaMap.put("isin", isin);
                metaMap.put("schemeName", schemeName);
                metaMap.put("charLength", rawChunk.length());

                String metaJson;
                try {
                    metaJson = objectMapper.writeValueAsString(metaMap);
                } catch (Exception e) {
                    metaJson = "{\"page\":" + page.pageNumber() + ",\"sourceFile\":\"" + sourceFileName + "\"}";
                }

                chunks.add(new ProcessedChunk(globalChunkIndex++, rawChunk, metaJson));
            }
        }

        log.info("Chunked document '{}' into {} chunks across {} pages", sourceFileName, chunks.size(), pages.size());
        return chunks;
    }

    private List<String> splitIntoChunks(String text, int targetSize, int overlap) {
        List<String> chunks = new ArrayList<>();
        if (text.length() <= targetSize) {
            chunks.add(text);
            return chunks;
        }

        int start = 0;
        while (start < text.length()) {
            int end = Math.min(start + targetSize, text.length());

            // If not at the end of the text, try to find a natural boundary
            if (end < text.length()) {
                int naturalEnd = findNaturalBreak(text, start, end);
                if (naturalEnd > start + (targetSize / 2)) {
                    end = naturalEnd;
                }
            }

            String chunk = text.substring(start, end).trim();
            if (!chunk.isEmpty()) {
                chunks.add(chunk);
            }

            if (end >= text.length()) {
                break;
            }

            start = Math.max(start + 1, end - overlap);
        }

        return chunks;
    }

    private int findNaturalBreak(String text, int start, int end) {
        // Prefer paragraph break
        int pBreak = text.lastIndexOf("\n\n", end);
        if (pBreak > start + 200) {
            return pBreak + 2;
        }

        // Next prefer sentence break
        for (int i = end - 1; i > start + 200; i--) {
            char c = text.charAt(i);
            if ((c == '.' || c == '?' || c == '!') && i + 1 < text.length() && Character.isWhitespace(text.charAt(i + 1))) {
                return i + 1;
            }
        }

        // Next prefer single newline
        int nlBreak = text.lastIndexOf('\n', end);
        if (nlBreak > start + 200) {
            return nlBreak + 1;
        }

        // Next prefer whitespace
        int wsBreak = text.lastIndexOf(' ', end);
        if (wsBreak > start + 200) {
            return wsBreak + 1;
        }

        return end;
    }
}
