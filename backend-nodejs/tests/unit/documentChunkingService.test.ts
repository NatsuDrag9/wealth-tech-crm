import { describe, it, expect } from 'vitest';
import {
  DocumentChunkingService,
  ProcessedChunk,
} from '../../src/modules/portfolioreview/services/documentChunkingService';
import { ExtractedPdfPage } from '../../src/modules/portfolioreview/services/pdfDocumentParserService';

describe('DocumentChunkingService', () => {
  const service = new DocumentChunkingService();
  const sourceFileName = 'sample_factsheet.pdf';
  const schemeName = 'HDFC Top 100 Fund';
  const isin = 'INF179K01BE2';

  it('should return an empty array when pages array is empty or null', () => {
    const emptyResult = service.chunkDocumentPages([], sourceFileName, schemeName, isin);
    expect(emptyResult).toEqual([]);

    const nullResult = service.chunkDocumentPages(
      null as unknown as ExtractedPdfPage[],
      sourceFileName,
      schemeName,
      isin
    );
    expect(nullResult).toEqual([]);
  });

  it('should skip pages that contain only whitespace or empty text', () => {
    const pages: ExtractedPdfPage[] = [
      { pageNumber: 1, text: '   \n  \t  ' },
      { pageNumber: 2, text: '' },
    ];

    const result = service.chunkDocumentPages(pages, sourceFileName, schemeName, isin);
    expect(result).toHaveLength(0);
  });

  it('should create a single chunk with metadata for a short page under 1200 characters', () => {
    const shortText = 'HDFC Top 100 Fund is an open-ended equity scheme predominantly investing in large cap stocks.';
    const pages: ExtractedPdfPage[] = [{ pageNumber: 1, text: shortText }];

    const chunks = service.chunkDocumentPages(pages, sourceFileName, schemeName, isin);

    expect(chunks).toHaveLength(1);
    const chunk = chunks[0];
    expect(chunk.chunkIndex).toBe(0);
    expect(chunk.pageNumber).toBe(1);
    expect(chunk.chunkText).toBe(shortText);

    const parsedMetadata = JSON.parse(chunk.metadata) as Record<string, unknown>;
    expect(parsedMetadata.sourceFile).toBe(sourceFileName);
    expect(parsedMetadata.schemeName).toBe(schemeName);
    expect(parsedMetadata.isin).toBe(isin);
    expect(parsedMetadata.pageNumber).toBe(1);
    expect(parsedMetadata.chunkIndex).toBe(0);
  });

  it('should segment a multi-paragraph long page with overlap when exceeding chunk size', () => {
    // Generate paragraphs that together exceed 1200 characters
    const para1 = 'Paragraph 1: Investment Objective and Strategy. '.repeat(15); // ~720 chars
    const para2 = 'Paragraph 2: Portfolio Holdings and Sector Allocation. '.repeat(15); // ~825 chars
    const para3 = 'Paragraph 3: Key Personnel and Fund Managers. '.repeat(10); // ~460 chars
    const fullPageText = `${para1}\n\n${para2}\n\n${para3}`;

    const pages: ExtractedPdfPage[] = [{ pageNumber: 1, text: fullPageText }];

    const chunks = service.chunkDocumentPages(pages, sourceFileName, schemeName, isin);

    expect(chunks.length).toBeGreaterThan(1);
    // Verify sequential indexing
    chunks.forEach((chunk: ProcessedChunk, index: number) => {
      expect(chunk.chunkIndex).toBe(index);
      expect(chunk.pageNumber).toBe(1);
      const meta = JSON.parse(chunk.metadata) as Record<string, unknown>;
      expect(meta.chunkIndex).toBe(index);
    });

    // Verify overlap: subsequent chunk contains trailing text from earlier chunk
    const firstChunk = chunks[0].chunkText;
    const secondChunk = chunks[1].chunkText;
    const firstChunkTrailing = firstChunk.slice(-100);
    expect(secondChunk).toContain(firstChunkTrailing.slice(0, 50));
  });

  it('should split an oversized single paragraph by sentence boundaries', () => {
    // Single paragraph without double-newlines, exceeding 1200 chars
    const sentence = 'The fund manager maintains a disciplined value investment process across all market cycles. ';
    const longParagraph = sentence.repeat(25); // ~2350 chars
    const pages: ExtractedPdfPage[] = [{ pageNumber: 1, text: longParagraph }];

    const chunks = service.chunkDocumentPages(pages, sourceFileName, schemeName, isin);

    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((chunk: ProcessedChunk) => {
      expect(chunk.chunkText.length).toBeGreaterThan(0);
      expect(chunk.chunkText.length).toBeLessThanOrEqual(1500);
    });
  });

  it('should maintain global sequential chunk indexing across multiple pages', () => {
    const pages: ExtractedPdfPage[] = [
      { pageNumber: 1, text: 'Page 1 summary factsheet content.' },
      { pageNumber: 2, text: 'Page 2 riskometer and expense ratio details.' },
      { pageNumber: 3, text: 'Page 3 benchmark comparison and returns.' },
    ];

    const chunks = service.chunkDocumentPages(pages, sourceFileName, schemeName, isin);

    expect(chunks).toHaveLength(3);
    expect(chunks[0].chunkIndex).toBe(0);
    expect(chunks[0].pageNumber).toBe(1);
    expect(chunks[1].chunkIndex).toBe(1);
    expect(chunks[1].pageNumber).toBe(2);
    expect(chunks[2].chunkIndex).toBe(2);
    expect(chunks[2].pageNumber).toBe(3);
  });
});
