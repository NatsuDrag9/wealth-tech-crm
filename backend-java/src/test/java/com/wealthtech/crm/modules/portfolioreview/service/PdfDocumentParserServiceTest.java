package com.wealthtech.crm.modules.portfolioreview.service;

import java.io.File;
import java.io.FileOutputStream;
import java.util.List;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import com.wealthtech.crm.modules.portfolioreview.dto.ExtractedPdfPage;

class PdfDocumentParserServiceTest {

    private PdfDocumentParserService parserService;

    @BeforeEach
    void setUp() {
        parserService = new PdfDocumentParserService();
    }

    @Test
    @DisplayName("Should extract text page-by-page from valid PDF document")
    void testExtractPagesFromValidPdf(@TempDir File tempDir) throws Exception {
        File samplePdf = new File(tempDir, "sample_factsheet.pdf");

        try (PDDocument doc = new PDDocument()) {
            PDPage page1 = new PDPage();
            doc.addPage(page1);
            try (PDPageContentStream cs = new PDPageContentStream(doc, page1)) {
                cs.beginText();
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), 12);
                cs.newLineAtOffset(50, 700);
                cs.showText("HDFC Top 100 Fund Factsheet Page 1");
                cs.endText();
            }

            PDPage page2 = new PDPage();
            doc.addPage(page2);
            try (PDPageContentStream cs = new PDPageContentStream(doc, page2)) {
                cs.beginText();
                cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 12);
                cs.newLineAtOffset(50, 700);
                cs.showText("Total Expense Ratio: 1.15% per annum");
                cs.endText();
            }

            doc.save(samplePdf);
        }

        List<ExtractedPdfPage> pages = parserService.extractPages(samplePdf);

        assertThat(pages).hasSize(2);
        assertThat(pages.get(0).pageNumber()).isEqualTo(1);
        assertThat(pages.get(0).text()).contains("HDFC Top 100 Fund Factsheet Page 1");
        assertThat(pages.get(1).pageNumber()).isEqualTo(2);
        assertThat(pages.get(1).text()).contains("Total Expense Ratio: 1.15% per annum");
    }

    @Test
    @DisplayName("Should return empty list gracefully for non-existent file")
    void testExtractPagesNonExistentFile() {
        File missingFile = new File("/invalid/path/missing.pdf");
        List<ExtractedPdfPage> pages = parserService.extractPages(missingFile);

        assertThat(pages).isEmpty();
    }

    @Test
    @DisplayName("Should return empty list gracefully for corrupted PDF file")
    void testExtractPagesCorruptFile(@TempDir File tempDir) throws Exception {
        File corruptPdf = new File(tempDir, "corrupted.pdf");
        try (FileOutputStream fos = new FileOutputStream(corruptPdf)) {
            fos.write("Invalid corrupt PDF header".getBytes());
        }

        List<ExtractedPdfPage> pages = parserService.extractPages(corruptPdf);

        assertThat(pages).isEmpty();
    }
}
