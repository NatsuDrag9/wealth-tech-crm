import { ExtractedPdfPage } from './pdfDocumentParserService';

export interface ProcessedChunk {
  chunkIndex: number;
  chunkText: string;
  metadata: string;
  pageNumber: number;
}

/**
 * Service for segmenting extracted document text into semantic chunks
 * with configurable overlap and natural paragraph/sentence boundary preservation.
 */
export class DocumentChunkingService {
  private static readonly DEFAULT_TARGET_CHUNK_SIZE = 1200; // characters (~250-300 words)
  private static readonly DEFAULT_OVERLAP_SIZE = 200; // characters

  /**
   * Chunks a document page-by-page, attaching metadata headers and sliding overlap windows.
   */
  public chunkDocumentPages(
    pages: ExtractedPdfPage[],
    sourceFileName: string,
    schemeName: string,
    isin: string
  ): ProcessedChunk[] {
    if (!pages || pages.length === 0) {
      return [];
    }

    const processedChunks: ProcessedChunk[] = [];
    let globalChunkIndex = 0;

    for (const page of pages) {
      const pageText = page.text.trim();
      if (pageText.length === 0) continue;

      if (pageText.length <= DocumentChunkingService.DEFAULT_TARGET_CHUNK_SIZE) {
        // Small page fits within a single chunk
        const metadata = JSON.stringify({
          sourceFile: sourceFileName,
          schemeName,
          isin,
          pageNumber: page.pageNumber,
          chunkIndex: globalChunkIndex,
        });

        processedChunks.push({
          chunkIndex: globalChunkIndex++,
          chunkText: pageText,
          metadata,
          pageNumber: page.pageNumber,
        });
      } else {
        // Segment large page text using paragraph and sentence boundaries
        const subChunks = this.splitIntoSubChunks(pageText);

        for (const subChunkText of subChunks) {
          const metadata = JSON.stringify({
            sourceFile: sourceFileName,
            schemeName,
            isin,
            pageNumber: page.pageNumber,
            chunkIndex: globalChunkIndex,
          });

          processedChunks.push({
            chunkIndex: globalChunkIndex++,
            chunkText: subChunkText,
            metadata,
            pageNumber: page.pageNumber,
          });
        }
      }
    }

    return processedChunks;
  }

  private splitIntoSubChunks(text: string): string[] {
    const chunks: string[] = [];
    const paragraphs = text.split(/\n\s*\n/);
    let currentChunk = '';

    for (const para of paragraphs) {
      const trimmedPara = para.trim();
      if (!trimmedPara) continue;

      if (currentChunk.length + trimmedPara.length + 2 <= DocumentChunkingService.DEFAULT_TARGET_CHUNK_SIZE) {
        currentChunk = currentChunk.length > 0 ? `${currentChunk}\n\n${trimmedPara}` : trimmedPara;
      } else {
        if (currentChunk.length > 0) {
          chunks.push(currentChunk);
          // Overlap window: keep trailing characters for contextual continuity
          const overlap = currentChunk.slice(
            Math.max(0, currentChunk.length - DocumentChunkingService.DEFAULT_OVERLAP_SIZE)
          );
          currentChunk = `${overlap}\n\n${trimmedPara}`;
        } else {
          // Paragraph itself exceeds target size; split by sentences
          const sentenceChunks = this.splitBySentences(trimmedPara);
          chunks.push(...sentenceChunks);
          currentChunk = '';
        }
      }
    }

    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  private splitBySentences(paragraph: string): string[] {
    const chunks: string[] = [];
    const sentences = paragraph.split(/(?<=[.!?])\s+/);
    let current = '';

    for (const sentence of sentences) {
      if (current.length + sentence.length + 1 <= DocumentChunkingService.DEFAULT_TARGET_CHUNK_SIZE) {
        current = current.length > 0 ? `${current} ${sentence}` : sentence;
      } else {
        if (current.length > 0) {
          chunks.push(current.trim());
        }
        current = sentence;
      }
    }

    if (current.trim().length > 0) {
      chunks.push(current.trim());
    }

    return chunks;
  }
}

export const documentChunkingService = new DocumentChunkingService();
