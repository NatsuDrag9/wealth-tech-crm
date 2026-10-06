import fs from 'fs';
import { logger } from '../../../common/utils/logger';

export interface ExtractedPdfPage {
  pageNumber: number;
  text: string;
}

/**
 * Service for extracting structured page-level text from mutual fund regulatory documents
 * (factsheets, SIDs, riskometers, and expense disclosures).
 */
export class PdfDocumentParserService {
  /**
   * Extracts text page-by-page from a PDF file path or memory buffer.
   */
  public extractPages(fileSource: string | Buffer): ExtractedPdfPage[] {
    try {
      let buffer: Buffer;
      if (typeof fileSource === 'string') {
        if (!fs.existsSync(fileSource)) {
          logger.warn({ fileSource }, 'Cannot extract PDF text: file does not exist');
          return [];
        }
        buffer = fs.readFileSync(fileSource);
      } else {
        buffer = fileSource;
      }

      const pages: ExtractedPdfPage[] = [];
      const content = buffer.toString('latin1');

      // Attempt to split pages by PDF /Page object markers
      const rawPages = content.split(/\/Type\s*\/Page[^s]/);

      if (rawPages.length > 1) {
        for (let i = 1; i < rawPages.length; i++) {
          const pageContent = rawPages[i];
          const text = this.extractTextFromRawStream(pageContent);
          const cleaned = this.cleanExtractedText(text);
          if (cleaned.length > 0) {
            pages.push({ pageNumber: i, text: cleaned });
          }
        }
      }

      // Fallback: If no /Page markers matched (or pure text/markdown format)
      if (pages.length === 0) {
        const fullCleaned = this.cleanExtractedText(this.extractTextFromRawStream(content));
        if (fullCleaned.length > 0) {
          pages.push({ pageNumber: 1, text: fullCleaned });
        }
      }

      return pages;
    } catch (error: unknown) {
      logger.error({ err: error }, 'Failed to parse PDF document text');
      return [];
    }
  }

  private extractTextFromRawStream(raw: string): string {
    const textTokens: string[] = [];

    // Match text blocks enclosed in BT ... ET
    const btEtRegex = /BT[\s\S]*?ET/g;
    let btMatch: RegExpExecArray | null;

    while ((btMatch = btEtRegex.exec(raw)) !== null) {
      const block = btMatch[0];
      // Match parenthesized text literals: (text)
      const literalRegex = /\(([^)]+)\)/g;
      let litMatch: RegExpExecArray | null;
      while ((litMatch = literalRegex.exec(block)) !== null) {
        textTokens.push(litMatch[1]);
      }
    }

    if (textTokens.length > 0) {
      return textTokens.join(' ');
    }

    // Secondary fallback: remove non-printable bytes
    return raw.replace(/[\x00-\x1F\x7F-\x9F]/g, ' ');
  }

  private cleanExtractedText(raw: string): string {
    return raw
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s*\n\s*\n+/g, '\n\n')
      .trim();
  }
}

export const pdfDocumentParserService = new PdfDocumentParserService();
