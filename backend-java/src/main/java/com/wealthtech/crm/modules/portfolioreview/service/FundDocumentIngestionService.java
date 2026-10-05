package com.wealthtech.crm.modules.portfolioreview.service;

import java.io.File;
import java.util.*;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.wealthtech.crm.infrastructure.ai.GeminiEmbeddingService;
import com.wealthtech.crm.modules.portfolioreview.dto.ExtractedPdfPage;
import com.wealthtech.crm.modules.portfolioreview.dto.IngestionSummary;
import com.wealthtech.crm.modules.portfolioreview.dto.ProcessedChunk;
import com.wealthtech.crm.modules.portfolioreview.entity.FundDocumentEmbedding;
import com.wealthtech.crm.modules.portfolioreview.enums.DocumentType;
import com.wealthtech.crm.modules.portfolioreview.repository.FundDocumentEmbeddingRepository;
import com.wealthtech.crm.modules.riskappetite.enums.ScoreCategory;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Orchestrator service for ingesting mutual fund PDF source documents:
 * 1. Discovers files across factsheets, sids, riskometer, and expenses directories.
 * 2. Parses pages via PdfDocumentParserService.
 * 3. Chunks text via DocumentChunkingService.
 * 4. Generates dense vector embeddings via GeminiEmbeddingService.
 * 5. Persists chunks and vectors into FundDocumentEmbeddingRepository.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class FundDocumentIngestionService {

    private final PdfDocumentParserService parserService;
    private final DocumentChunkingService chunkingService;
    private final GeminiEmbeddingService embeddingService;
    private final FundDocumentEmbeddingRepository embeddingRepository;

    @Value("${rag.sources-path:../assets/rag-sources}")
    private String defaultSourcesPath;

    /**
     * Resolves the active rag-sources directory from local or container environments.
     */
    public File resolveSourcesDirectory() {
        File dir = new File(defaultSourcesPath);
        if (dir.exists() && dir.isDirectory()) {
            return dir;
        }

        File fallback = new File("assets/rag-sources");
        if (fallback.exists() && fallback.isDirectory()) {
            return fallback;
        }

        File parentFallback = new File("../assets/rag-sources");
        if (parentFallback.exists() && parentFallback.isDirectory()) {
            return parentFallback;
        }

        return dir;
    }

    /**
     * Ingests all PDF documents in the configured rag-sources folder.
     *
     * @return IngestionSummary detailing processed files and chunk counts
     */
    @Transactional
    public IngestionSummary ingestAllSources() {
        long startTime = System.currentTimeMillis();
        File rootDir = resolveSourcesDirectory();

        if (!rootDir.exists() || !rootDir.isDirectory()) {
            log.error("RAG sources directory not found at '{}'", rootDir.getAbsolutePath());
            return new IngestionSummary(0, 0, Collections.emptyMap(), 0, "FAILED_DIR_NOT_FOUND");
        }

        log.info("Starting RAG document ingestion from directory: {}", rootDir.getAbsolutePath());

        int totalFiles = 0;
        int totalChunks = 0;
        Map<String, Integer> chunksByType = new LinkedHashMap<>();
        chunksByType.put(DocumentType.FACTSHEET.name(), 0);
        chunksByType.put(DocumentType.SID.name(), 0);
        chunksByType.put(DocumentType.RISKOMETER.name(), 0);
        chunksByType.put(DocumentType.EXPENSE_DISCLOSURE.name(), 0);

        Map<String, DocumentType> subfolderTypes = Map.of(
                "factsheets", DocumentType.FACTSHEET,
                "sids", DocumentType.SID,
                "riskometer", DocumentType.RISKOMETER,
                "expenses", DocumentType.EXPENSE_DISCLOSURE
        );

        for (Map.Entry<String, DocumentType> entry : subfolderTypes.entrySet()) {
            File subDir = new File(rootDir, entry.getKey());
            if (!subDir.exists() || !subDir.isDirectory()) {
                log.warn("Subdirectory not found: {}", subDir.getAbsolutePath());
                continue;
            }

            File[] pdfFiles = subDir.listFiles((dir, name) -> name.toLowerCase().endsWith(".pdf"));
            if (pdfFiles == null || pdfFiles.length == 0) {
                continue;
            }

            DocumentType docType = entry.getValue();
            for (File pdf : pdfFiles) {
                int chunksForFile = ingestSinglePdf(pdf, docType);
                totalFiles++;
                totalChunks += chunksForFile;
                chunksByType.put(docType.name(), chunksByType.get(docType.name()) + chunksForFile);
            }
        }

        long duration = System.currentTimeMillis() - startTime;
        log.info("Completed RAG ingestion: {} files, {} chunks in {} ms", totalFiles, totalChunks, duration);

        return new IngestionSummary(totalFiles, totalChunks, chunksByType, duration, "SUCCESS");
    }

    /**
     * Ingests a single PDF file, parses its text, generates embeddings, and saves records.
     * Enforces strict idempotency by purging any existing chunks for (isin, docType) before saving.
     */
    @Transactional
    public int ingestSinglePdf(File pdfFile, DocumentType docType) {
        String fileName = pdfFile.getName();
        FundMetadata meta = inferMetadata(fileName, docType);

        List<ExtractedPdfPage> pages = parserService.extractPages(pdfFile);
        if (pages.isEmpty()) {
            log.warn("No extractable text found in '{}'", fileName);
            return 0;
        }

        List<ProcessedChunk> chunks = chunkingService.chunkDocumentPages(
                pages, fileName, meta.fundName, meta.isin);

        if (chunks.isEmpty()) {
            return 0;
        }

        List<FundDocumentEmbedding> entitiesToSave = new ArrayList<>(chunks.size());
        for (ProcessedChunk chunk : chunks) {
            float[] embedding = embeddingService.getEmbedding(chunk.chunkText());

            FundDocumentEmbedding entity = FundDocumentEmbedding.builder()
                    .isin(meta.isin)
                    .fundName(meta.fundName)
                    .documentType(docType)
                    .category(meta.category)
                    .assetClass(meta.assetClass)
                    .chunkIndex(chunk.chunkIndex())
                    .chunkText(chunk.chunkText())
                    .metadata(chunk.metadataJson())
                    .embedding(embedding)
                    .build();

            entitiesToSave.add(entity);
        }

        // Idempotent chunk replacement: purge prior chunks for this ISIN and document type
        embeddingRepository.deleteByIsinAndDocumentType(meta.isin, docType);

        embeddingRepository.saveAll(entitiesToSave);
        log.info("Ingested '{}': {} chunks saved into fund_document_embeddings", fileName, entitiesToSave.size());
        return entitiesToSave.size();
    }

    /**
     * Infers scheme metadata (ISIN, fund name, risk category, asset class)
     * from standard filenames across Indian mutual fund disclosures.
     */
    private FundMetadata inferMetadata(String filename, DocumentType docType) {
        String name = filename.toLowerCase();

        if (name.contains("arbitrage")) {
            return new FundMetadata("INF843801043", "Parag Parikh Arbitrage Fund", ScoreCategory.VERY_CONSERVATIVE, "Hybrid");
        } else if (name.contains("liquid") || name.contains("pplf")) {
            return new FundMetadata("INF843801050", "Parag Parikh Liquid Fund", ScoreCategory.VERY_CONSERVATIVE, "Debt");
        } else if (name.contains("hybrid") || name.contains("ppchf")) {
            return new FundMetadata("INF843801027", "Parag Parikh Conservative Hybrid Fund", ScoreCategory.CONSERVATIVE, "Hybrid");
        } else if (name.contains("dynamic")) {
            return new FundMetadata("INF843801035", "Parag Parikh Dynamic Asset Allocation Fund", ScoreCategory.MODERATE, "Hybrid");
        } else if (name.contains("elss") || name.contains("tax") || name.contains("pptsf")) {
            return new FundMetadata("INF843801068", "Parag Parikh ELSS Tax Saver Fund", ScoreCategory.AGGRESSIVE, "Equity");
        } else if (name.contains("riskometer") || name.contains("product-label")) {
            return new FundMetadata("INF843801019", "Parag Parikh Schemes Riskometer Disclosure", ScoreCategory.MODERATE, "Multi-Asset");
        } else {
            // Flagship Parag Parikh Flexi Cap Fund (most frequent)
            return new FundMetadata("INF843801019", "Parag Parikh Flexi Cap Fund", ScoreCategory.AGGRESSIVE, "Equity");
        }
    }

    private record FundMetadata(String isin, String fundName, ScoreCategory category, String assetClass) {}
}
