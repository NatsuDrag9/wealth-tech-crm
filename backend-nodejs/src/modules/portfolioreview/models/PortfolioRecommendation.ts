import { Document, model, Schema, Types } from "mongoose";
import { IEligibleFund } from "./EligibleFund";
import { RecommendationFlowType, RecommendationStatus } from "../enums/portfolioEnums";
import { ScoreCategoryCode } from "../../riskappetite/enums/riskEnums";

export interface IRecommendationFundItem {
    _id: Types.ObjectId;
    eligibleFund: Types.ObjectId | IEligibleFund; // ref: 'EligibleFund'
    amount: number;
    replacesEntryId?: Types.ObjectId | null;
    displayOrder: number;
}

export interface IPortfolioRecommendation extends Document {
    _id: Types.ObjectId;
    client: Types.ObjectId; // ref: 'Client'
    portfolioReview?: Types.ObjectId | null; // ref: 'PortfolioReview'
    flowType: RecommendationFlowType;
    status: RecommendationStatus;
    investorCategory?: ScoreCategoryCode | null;
    generatedDocumentUrl?: string | null;
    funds: IRecommendationFundItem[];
    createdAt: Date;
    updatedAt: Date;
}

const recommendationFundSchema = new Schema<IRecommendationFundItem>(
    {
        eligibleFund: { type: Schema.Types.ObjectId, ref: 'EligibleFund', required: true },
        amount: { type: Number, required: true },
        replacesEntryId: { type: Schema.Types.ObjectId, default: null },
        displayOrder: { type: Number, default: 1 },
    },
    {
        toJSON: {
            virtuals: true,
            transform: (_doc, ret: Record<string, unknown>) => {
                ret.id = ret._id ? String(ret._id) : ret.id;
                delete ret._id;
                return ret;
            },
        },
    }
);

const portfolioRecommendationSchema = new Schema<IPortfolioRecommendation>(
    {
        client: { type: Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
        portfolioReview: { type: Schema.Types.ObjectId, ref: 'PortfolioReview', default: null },
        flowType: {
            type: String,
            enum: Object.values(RecommendationFlowType),
            required: true,
        },
        status: {
            type: String,
            enum: Object.values(RecommendationStatus),
            default: RecommendationStatus.SAVED,
            index: true,
        },
        investorCategory: {
            type: String,
            enum: Object.values(ScoreCategoryCode),
            default: null,
        },
        generatedDocumentUrl: { type: String, default: null },
        funds: [recommendationFundSchema],
    },
    {
        timestamps: true,
        toJSON: {
            virtuals: true,
            transform: (_doc, ret: Record<string, unknown>) => {
                ret.id = ret._id ? String(ret._id) : ret.id;
                delete ret._id;
                delete ret.__v;
                return ret;
            },
        },
    }
);

// Compound index for querying client proposals sorted by date
portfolioRecommendationSchema.index({ client: 1, createdAt: -1 });

export const PortfolioRecommendation = model<IPortfolioRecommendation>(
    'PortfolioRecommendation',
    portfolioRecommendationSchema
);