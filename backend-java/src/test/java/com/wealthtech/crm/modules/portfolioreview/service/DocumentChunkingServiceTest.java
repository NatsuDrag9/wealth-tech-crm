package com.wealthtech.crm.modules.portfolioreview.service;

import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.wealthtech.crm.modules.portfolioreview.dto.ExtractedPdfPage;
import com.wealthtech.crm.modules.portfolioreview.dto.ProcessedChunk;

class DocumentChunkingServiceTest {

    private DocumentChunkingService chunkingService;

    @BeforeEach
    void setUp() {
        chunkingService = new DocumentChunkingService();
    }

    @Test
    @DisplayName("Should chunk extracted pages preserving scheme name, ISIN, and page numbers")
    void testChunkDocumentPagesPreservesMetadata() {
        String page1 = """
            Scheme Information Document: HDFC Top 100 Fund.
            Investment Objective: To provide long-term capital appreciation from a portfolio of equity and equity-related securities.
            Asset Allocation: Equity instruments 80% to 100%, Debt instruments 0% to 20%.
            """;

        String page2 = """
            Riskometer Assessment: Very High Risk.
            Benchmark Index: NIFTY 100 Total Returns Index (TRI).
            Fund Manager Commentary: The portfolio remains positioned in large-cap compounders with resilient cash flows.
            """;

        List<ExtractedPdfPage> pages = List.of(
                new ExtractedPdfPage(1, page1),
                new ExtractedPdfPage(2, page2)
        );

        List<ProcessedChunk> chunks = chunkingService.chunkDocumentPages(
                pages,
                "hdfc_top_100_sid.pdf",
                "HDFC Top 100 Fund",
                "INF179K01BE2"
        );

        assertThat(chunks).isNotEmpty();
        for (ProcessedChunk chunk : chunks) {
            assertThat(chunk.metadataJson()).contains("INF179K01BE2");
            assertThat(chunk.metadataJson()).contains("HDFC Top 100 Fund");
            assertThat(chunk.metadataJson()).contains("hdfc_top_100_sid.pdf");
            assertThat(chunk.chunkText()).isNotBlank();
        }
    }

    @Test
    @DisplayName("Should return empty list when given empty or null page list")
    void testEmptyOrNullPagesReturnEmpty() {
        assertThat(chunkingService.chunkDocumentPages(null, "f.pdf", "Scheme", "ISIN1")).isEmpty();
        assertThat(chunkingService.chunkDocumentPages(Collections.emptyList(), "f.pdf", "Scheme", "ISIN1")).isEmpty();
    }

    @Test
    @DisplayName("Should handle pages with only blank whitespace gracefully")
    void testBlankPagesSkipped() {
        List<ExtractedPdfPage> blankPages = List.of(
                new ExtractedPdfPage(1, "   \n\n  \t  "),
                new ExtractedPdfPage(2, "")
        );

        List<ProcessedChunk> chunks = chunkingService.chunkDocumentPages(
                blankPages,
                "blank.pdf",
                "Scheme",
                "ISIN_EMPTY"
        );

        assertThat(chunks).isEmpty();
    }
}
