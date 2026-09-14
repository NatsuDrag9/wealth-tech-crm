import { Document, model, Schema, Types } from "mongoose";
import { EntryAction, ReviewStatus } from "../enums/portfolioEnums";

export interface IPortfolioEntry {
    _id: Types.ObjectId;
    fundName: string;
    isin: string;
    units: number;
    purchaseNav: number;
    currentNav: number;
    investedAmount: number;
    currentValue: number;
    absReturnPct: number;
    gain: number;
    cagrPct: number;
    holdingDays: number;
    action: EntryAction;
}

export interface IPortfolioReview extends Document {
    _id: Types.ObjectId;
    client: Types.ObjectId; // ref: 'Client'                                                            
    status: ReviewStatus;
    totalInvested: number;
    totalCurrentValue: number;
    totalGain: number;
    gainPercentage: number;
    cagr: number;
    note?: string | null;
    ecasFileKey?: string | null;
    entries: IPortfolioEntry[];
    createdAt: Date;
    updatedAt: Date;
}

const portfolioEntrySchema = new Schema<IPortfolioEntry>(
    {
        fundName: { type: String, required: true, trim: true },
        isin: { type: String, required: true, trim: true },
        units: { type: Number, required: true },
        purchaseNav: { type: Number, required: true },
        currentNav: { type: Number, required: true },
        investedAmount: { type: Number, required: true },
        currentValue: { type: Number, required: true },
        absReturnPct: { type: Number, required: true },
        gain: { type: Number, required: true },
        cagrPct: { type: Number, required: true },
        holdingDays: { type: Number, required: true },
        action: {
            type: String,
            enum: Object.values(EntryAction),
            default: EntryAction.HOLD,
            required: true,
        },
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

const portfolioReviewSchema = new Schema<IPortfolioReview>(
    {
        client: { type: Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
        status: {
            type: String,
            enum: Object.values(ReviewStatus),
            default: ReviewStatus.PENDING,
            index: true,
        },
        totalInvested: { type: Number, default: 0 },
        totalCurrentValue: { type: Number, default: 0 },
        totalGain: { type: Number, default: 0 },
        gainPercentage: { type: Number, default: 0 },
        cagr: { type: Number, default: 0 },
        note: { type: String, trim: true },
        ecasFileKey: { type: String, trim: true, default: null },
        entries: [portfolioEntrySchema],
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

// Compound index for querying a client's latest portfolio review                                     
portfolioReviewSchema.index({ client: 1, createdAt: -1 });

export const PortfolioReview = model<IPortfolioReview>('PortfolioReview', portfolioReviewSchema);  