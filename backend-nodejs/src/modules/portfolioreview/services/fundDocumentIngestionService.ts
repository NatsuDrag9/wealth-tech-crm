import fs from 'fs';
import path from 'path';
import { config } from '../../../config/environment';
import { logger } from '../../../common/utils/logger';
import { DocumentType, FundDocumentEmbedding } from '../models/FundDocumentEmbedding';
import { ScoreCategoryCode } from '../../riskappetite/enums/riskEnums';
import { pdfDocumentParserService } from './pdfDocumentParserService';
import { documentChunkingService } from './documentChunkingService';
import { geminiEmbeddingService } from '../../../common/services/geminiEmbeddingService';
import { IngestionSummaryDto } from '../dto/ragDto';

export interface FileIngestionMeta {
  isin: string;
  schemeName: string;
  category: ScoreCategoryCode;
  documentType: DocumentType;
  assetClass?: string;
}

/**
 * Service for ingesting mutual fund PDF source documents into MongoDB:
 * 1. Discovers files across factsheets, sids, riskometer, and expenses directories.
 * 2. Parses pages via PdfDocumentParserService.
 * 3. Chunks text via DocumentChunkingService.
 * 4. Generates dense vector embeddings via GeminiEmbeddingService.
 * 5. Persists chunks and vectors into FundDocumentEmbedding collection idempotently.
 */
export class FundDocumentIngestionService {
  public resolveSourcesDirectory(): string | null {
    const candidates = [
      path.resolve(config.rag.sourcesPath),
      path.resolve(process.cwd(), 'assets/rag-sources'),
      path.resolve(process.cwd(), '../assets/rag-sources'),
      path.resolve(__dirname, '../../../../../../assets/rag-sources'),
    ];

    for (const cand of candidates) {
      if (fs.existsSync(cand) && fs.statSync(cand).isDirectory()) {
        return cand;
      }
    }

    return null;
  }

  /**
   * Scans and ingests all regulatory document corpora found in assets/rag-sources.
   */
  public async ingestAllSources(): Promise<IngestionSummaryDto> {
    const startTime = Date.now();
    const sourcesDir = this.resolveSourcesDirectory();

    if (!sourcesDir) {
      logger.warn('RAG sources directory not found. Ingestion skipped.');
      return {
        documentsProcessed: 0,
        chunksCreated: 0,
        embeddingsGenerated: 0,
        failedDocuments: 0,
        elapsedMs: Date.now() - startTime,
        status: 'SKIPPED_DIRECTORY_NOT_FOUND',
      };
    }

    logger.info({ sourcesDir }, 'Starting full RAG mutual fund corpus ingestion...');

    const subDirs: Array<{ folder: string; type: DocumentType }> = [
      { folder: 'factsheets', type: 'FACTSHEET' },
      { folder: 'sids', type: 'SID' },
      { folder: 'riskometer', type: 'RISKOMETER' },
      { folder: 'expenses', type: 'EXPENSE_DISCLOSURE' },
    ];

    let totalDocs = 0;
    let totalChunks = 0;
    let totalEmbeddings = 0;
    let failedDocs = 0;

    for (const { folder, type } of subDirs) {
      const dirPath = path.join(sourcesDir, folder);
      if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
        continue;
      }

      const files = fs.readdirSync(dirPath).filter((f) => f.toLowerCase().endsWith('.pdf') || f.toLowerCase().endsWith('.txt'));

      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const meta = this.inferMetadataFromFilename(file, type);

        try {
          const chunkCount = await this.ingestSingleFile(filePath, meta);
          totalDocs++;
          totalChunks += chunkCount;
          totalEmbeddings += chunkCount;
        } catch (error: unknown) {
          failedDocs++;
          logger.error({ err: error, file }, 'Failed to ingest regulatory document');
        }
      }
    }

    const elapsedMs = Date.now() - startTime;
    logger.info(
      { totalDocs, totalChunks, totalEmbeddings, failedDocs, elapsedMs },
      'RAG mutual fund corpus ingestion completed'
    );

    return {
      documentsProcessed: totalDocs,
      chunksCreated: totalChunks,
      embeddingsGenerated: totalEmbeddings,
      failedDocuments: failedDocs,
      elapsedMs,
      status: failedDocs === 0 ? 'COMPLETED' : 'COMPLETED_WITH_ERRORS',
    };
  }

  /**
   * Ingests a single document file or buffer idempotently.
   */
  public async ingestSingleFile(
    fileSource: string | Buffer,
    meta: FileIngestionMeta,
    sourceFileName: string = 'document.pdf'
  ): Promise<number> {
    const fileName = typeof fileSource === 'string' ? path.basename(fileSource) : sourceFileName;
    logger.info({ isin: meta.isin, documentType: meta.documentType, file: fileName }, 'Ingesting document...');

    // 1. Enforce strict idempotency: delete previous embeddings for this (isin, documentType)
    await FundDocumentEmbedding.deleteMany({
      isin: meta.isin,
      documentType: meta.documentType,
    });

    // 2. Extract structured pages
    const pages = pdfDocumentParserService.extractPages(fileSource);
    if (pages.length === 0) {
      logger.warn({ file: fileName }, 'No text extracted from document; skipping chunking.');
      return 0;
    }

    // 3. Segment into overlapping semantic chunks
    const chunks = documentChunkingService.chunkDocumentPages(
      pages,
      fileName,
      meta.schemeName,
      meta.isin
    );

    if (chunks.length === 0) {
      return 0;
    }

    // 4. Generate embeddings and persist documents
    const documentsToInsert = [];
    for (const chunk of chunks) {
      const vector = await geminiEmbeddingService.getEmbedding(chunk.chunkText);

      documentsToInsert.push({
        isin: meta.isin,
        fundName: meta.schemeName,
        documentType: meta.documentType,
        scoreCategory: meta.category,
        assetClass: meta.assetClass || 'EQUITY',
        chunkIndex: chunk.chunkIndex,
        chunkText: chunk.chunkText,
        metadata: chunk.metadata,
        embedding: vector,
        createdAt: new Date(),
      });
    }

    await FundDocumentEmbedding.insertMany(documentsToInsert);
    logger.info(
      { isin: meta.isin, documentType: meta.documentType, chunks: documentsToInsert.length },
      'Successfully persisted document chunks with embeddings'
    );

    return documentsToInsert.length;
  }

  private inferMetadataFromFilename(fileName: string, type: DocumentType): FileIngestionMeta {
    const base = fileName.toUpperCase();

    // Default canonical metadata for wealth-tech mutual funds
    if (base.includes('FLEXI') || base.includes('PPFAS') || base.includes('PARAG')) {
      return {
        isin: 'INF879O01019',
        schemeName: 'Parag Parikh Flexi Cap Fund',
        category: ScoreCategoryCode.AGGRESSIVE,
        documentType: type,
        assetClass: 'EQUITY',
      };
    }
    if (base.includes('CONSERVATIVE') || base.includes('HYBRID')) {
      return {
        isin: 'INF879O01027',
        schemeName: 'Parag Parikh Conservative Hybrid Fund',
        category: ScoreCategoryCode.CONSERVATIVE,
        documentType: type,
        assetClass: 'HYBRID',
      };
    }
    if (base.includes('TAX') || base.includes('ELSS')) {
      return {
        isin: 'INF879O01035',
        schemeName: 'Parag Parikh ELSS Tax Saver Fund',
        category: ScoreCategoryCode.AGGRESSIVE,
        documentType: type,
        assetClass: 'EQUITY',
      };
    }

    return {
      isin: 'INF879O01999',
      schemeName: 'Parag Parikh Core Fund',
      category: ScoreCategoryCode.MODERATE,
      documentType: type,
      assetClass: 'EQUITY',
    };
  }
}

export const fundDocumentIngestionService = new FundDocumentIngestionService();
