import { Document, model, Schema } from 'mongoose';
import { ScoreCategoryCode } from '../../riskappetite/enums/riskEnums';

export type DocumentType = 'FACTSHEET' | 'SID' | 'RISKOMETER' | 'EXPENSE_DISCLOSURE';

export interface IFundDocumentEmbedding extends Document {
  isin: string;
  fundName: string;
  documentType: DocumentType;
  scoreCategory: ScoreCategoryCode;
  assetClass?: string;
  chunkIndex: number;
  chunkText: string;
  metadata?: string;
  embedding: number[];
  createdAt: Date;
}

const fundDocumentEmbeddingSchema = new Schema<IFundDocumentEmbedding>(
  {
    isin: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    fundName: {
      type: String,
      required: true,
      trim: true,
    },
    documentType: {
      type: String,
      required: true,
      enum: ['FACTSHEET', 'SID', 'RISKOMETER', 'EXPENSE_DISCLOSURE'],
      index: true,
    },
    scoreCategory: {
      type: String,
      required: true,
      enum: Object.values(ScoreCategoryCode),
      index: true,
    },
    assetClass: {
      type: String,
      trim: true,
    },
    chunkIndex: {
      type: Number,
      required: true,
    },
    chunkText: {
      type: String,
      required: true,
    },
    metadata: {
      type: String,
    },
    embedding: {
      type: [Number],
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
    collection: 'fund_document_embeddings',
  }
);

// Compound indexes for rapid candidate filtering and idempotency
fundDocumentEmbeddingSchema.index({ isin: 1, documentType: 1 });
fundDocumentEmbeddingSchema.index({ isin: 1, scoreCategory: 1 });
fundDocumentEmbeddingSchema.index({ chunkText: 'text', fundName: 'text' });

export const FundDocumentEmbedding = model<IFundDocumentEmbedding>(
  'FundDocumentEmbedding',
  fundDocumentEmbeddingSchema
);
