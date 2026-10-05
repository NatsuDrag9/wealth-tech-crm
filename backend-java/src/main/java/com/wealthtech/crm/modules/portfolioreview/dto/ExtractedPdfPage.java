package com.wealthtech.crm.modules.portfolioreview.dto;

/**
 * Record holding text extracted from a single page of a PDF document.
 *
 * @param pageNumber 1-indexed page number in the source PDF
 * @param text extracted raw text from the page
 */
public record ExtractedPdfPage(int pageNumber, String text) {
}
