import { Request, Response } from 'express';
import { AppError } from '../../../common/utils/AppError';
import { logger } from '../../../common/utils/logger';
import { fundDocumentIngestionService } from '../services/fundDocumentIngestionService';
import { ragRetrievalService } from '../services/ragRetrievalService';
import { ragSynthesisService } from '../services/ragSynthesisService';
import { RagQueryRequestDto, RagRetrievalRequestDto } from '../dto/ragDto';
import { ScoreCategoryCode } from '../../riskappetite/enums/riskEnums';
import { DocumentType } from '../models/FundDocumentEmbedding';

export class RagController {
  /**
   * Triggers RAG corpus ingestion from assets/rag-sources directory or via uploaded document.
   */
  public async ingestCorpus(req: Request, res: Response): Promise<Response> {
    try {
      if (req.file) {
        const isin = (req.body.isin || 'INF879O01999').trim().toUpperCase();
        const schemeName = (req.body.schemeName || 'Uploaded Scheme').trim();
        const category = (req.body.category || ScoreCategoryCode.MODERATE) as ScoreCategoryCode;
        const documentType = (req.body.documentType || 'FACTSHEET') as DocumentType;
        const assetClass = (req.body.assetClass || 'EQUITY').trim();

        const chunks = await fundDocumentIngestionService.ingestSingleFile(
          req.file.buffer,
          { isin, schemeName, category, documentType, assetClass },
          req.file.originalname
        );

        return res.status(200).json({
          status: 'success',
          message: `Successfully ingested document with ${chunks} chunks and embeddings.`,
          chunksCreated: chunks,
        });
      }

      const summary = await fundDocumentIngestionService.ingestAllSources();
      return res.status(200).json(summary);
    } catch (error: unknown) {
      logger.error({ err: error }, 'RAG corpus ingestion endpoint encountered error');
      throw new AppError('Failed to execute RAG document ingestion', 500);
    }
  }

  /**
   * Executes candidate-constrained vector + lexical hybrid evidence retrieval.
   */
  public async retrieveEvidence(req: Request, res: Response): Promise<Response> {
    const { query, clientId, candidateIsins, scoreCategory, topK, similarityThreshold } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      throw new AppError('Query text is required', 400);
    }

    const requestDto: RagRetrievalRequestDto = {
      query: query.trim(),
      clientId: clientId ? String(clientId) : undefined,
      candidateIsins: Array.isArray(candidateIsins) ? candidateIsins : undefined,
      scoreCategory: scoreCategory ? String(scoreCategory) : undefined,
      topK: topK !== undefined ? Number(topK) : undefined,
      similarityThreshold: similarityThreshold !== undefined ? Number(similarityThreshold) : undefined,
    };

    const response = await ragRetrievalService.retrieveEvidence(requestDto);
    return res.status(200).json(response);
  }

  /**
   * Executes end-to-end PII-protected grounded query synthesis with Gemini 2.0 Flash.
   */
  public async queryAndSynthesize(req: Request, res: Response): Promise<Response> {
    const { query, conversationId, clientId, candidateIsins, topK, similarityThreshold, temperature } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      throw new AppError('Query text is required', 400);
    }

    const requestDto: RagQueryRequestDto = {
      query: query.trim(),
      conversationId: conversationId ? String(conversationId).trim() : undefined,
      clientId: clientId ? String(clientId) : undefined,
      candidateIsins: Array.isArray(candidateIsins) ? candidateIsins : undefined,
      topK: topK !== undefined ? Number(topK) : undefined,
      similarityThreshold: similarityThreshold !== undefined ? Number(similarityThreshold) : undefined,
      temperature: temperature !== undefined ? Number(temperature) : undefined,
    };

    const response = await ragSynthesisService.queryAndSynthesize(requestDto);
    return res.status(200).json(response);
  }
}

export const ragController = new RagController();
