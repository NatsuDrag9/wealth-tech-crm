package com.wealthtech.crm.modules.portfolioreview.service;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Service;

import com.wealthtech.crm.modules.portfolioreview.dto.ExtractedPdfPage;

import lombok.extern.slf4j.Slf4j;

/**
 * Service for extracting structured page-level text from mutual fund regulatory documents
 * (factsheets, SIDs, riskometers, and expense disclosures) using Apache PDFBox 3.x.
 */
@Service
@Slf4j
public class PdfDocumentParserService {

    /**
     * Extracts text page-by-page from the provided PDF file.
     *
     * @param pdfFile the source PDF file
     * @return list of ExtractedPdfPage records containing page number and text
     */
    public List<ExtractedPdfPage> extractPages(File pdfFile) {
        if (pdfFile == null || !pdfFile.exists() || !pdfFile.isFile()) {
            log.warn("Cannot extract PDF text: file does not exist or is invalid: {}", pdfFile);
            return Collections.emptyList();
        }

        List<ExtractedPdfPage> pages = new ArrayList<>();
        try (PDDocument document = Loader.loadPDF(pdfFile)) {
            int totalPages = document.getNumberOfPages();
            PDFTextStripper stripper = new PDFTextStripper();

            for (int pageNum = 1; pageNum <= totalPages; pageNum++) {
                stripper.setStartPage(pageNum);
                stripper.setEndPage(pageNum);
                String pageText = stripper.getText(document);

                if (pageText != null) {
                    String cleaned = cleanExtractedText(pageText);
                    if (!cleaned.isBlank()) {
                        pages.add(new ExtractedPdfPage(pageNum, cleaned));
                    }
                }
            }

            log.info("Extracted {} text pages from PDF: {}", pages.size(), pdfFile.getName());

        } catch (IOException e) {
            log.error("Failed to parse PDF document '{}': {}", pdfFile.getAbsolutePath(), e.getMessage(), e);
        }

        return pages;
    }

    /**
     * Cleans up raw extracted text by normalizing whitespace, carriage returns,
     * and null characters.
     */
    public String cleanExtractedText(String text) {
        if (text == null) return "";
        return text.replace("\u0000", "")
                .replace("\r\n", "\n")
                .replace("\r", "\n")
                .replaceAll("[ \\t]+", " ")
                .replaceAll("\n{3,}", "\n\n")
                .trim();
    }
}
