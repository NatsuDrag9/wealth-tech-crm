package com.wealthtech.crm.modules.portfolioreview.service;

import java.io.File;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import org.mockito.Mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;

import com.wealthtech.crm.infrastructure.ai.GeminiEmbeddingService;
import com.wealthtech.crm.modules.portfolioreview.dto.ExtractedPdfPage;
import com.wealthtech.crm.modules.portfolioreview.dto.ProcessedChunk;
import com.wealthtech.crm.modules.portfolioreview.entity.FundDocumentEmbedding;
import com.wealthtech.crm.modules.portfolioreview.enums.DocumentType;
import com.wealthtech.crm.modules.portfolioreview.repository.FundDocumentEmbeddingRepository;

@ExtendWith(MockitoExtension.class)
class FundDocumentIngestionServiceTest {

    @Mock
    private PdfDocumentParserService parserService;
    @Mock
    private DocumentChunkingService chunkingService;
    @Mock
    private GeminiEmbeddingService embeddingService;
    @Mock
    private FundDocumentEmbeddingRepository embeddingRepository;

    private FundDocumentIngestionService ingestionService;

    @BeforeEach
    void setUp() {
        ingestionService = new FundDocumentIngestionService(
                parserService,
                chunkingService,
                embeddingService,
                embeddingRepository
        );
        org.springframework.test.util.ReflectionTestUtils.setField(ingestionService, "defaultSourcesPath", "../assets/rag-sources");
    }

    @Test
    @DisplayName("Should parse, chunk, embed, and idempotently persist PDF document chunks")
    void testIngestSinglePdfSuccess(@TempDir File tempDir) throws Exception {
        File pdfFile = new File(tempDir, "ppfas_flexicap_factsheet.pdf");
        pdfFile.createNewFile();

        List<ExtractedPdfPage> mockPages = List.of(
                new ExtractedPdfPage(1, "Page 1 Content"),
                new ExtractedPdfPage(2, "Page 2 Content")
        );
        when(parserService.extractPages(pdfFile)).thenReturn(mockPages);

        List<ProcessedChunk> mockChunks = List.of(
                new ProcessedChunk(0, "Chunk 1 Content", "{\"source\":\"test\"}"),
                new ProcessedChunk(1, "Chunk 2 Content", "{\"source\":\"test\"}")
        );
        when(chunkingService.chunkDocumentPages(eq(mockPages), anyString(), anyString(), anyString()))
                .thenReturn(mockChunks);

        float[] mockVec = new float[768];
        when(embeddingService.getEmbedding(anyString())).thenReturn(mockVec);

        int result = ingestionService.ingestSinglePdf(pdfFile, DocumentType.FACTSHEET);

        assertThat(result).isEqualTo(2);

        // Verify idempotency: previous chunks purged before saving
        verify(embeddingRepository).deleteByIsinAndDocumentType(anyString(), eq(DocumentType.FACTSHEET));
        verify(embeddingRepository).saveAll(anyList());
    }

    @Test
    @DisplayName("Should return 0 and skip database save when PDF has no extractable text")
    void testIngestSinglePdfEmptyPages(@TempDir File tempDir) throws Exception {
        File emptyPdf = new File(tempDir, "empty.pdf");
        emptyPdf.createNewFile();

        when(parserService.extractPages(emptyPdf)).thenReturn(List.of());

        int result = ingestionService.ingestSinglePdf(emptyPdf, DocumentType.SID);

        assertThat(result).isEqualTo(0);
        verify(embeddingRepository, never()).saveAll(anyList());
    }

    @Test
    @DisplayName("Should resolve sources directory with fallbacks")
    void testResolveSourcesDirectory() {
        File dir = ingestionService.resolveSourcesDirectory();
        assertThat(dir).isNotNull();
    }
}
