import { Document, model, Schema, Types } from "mongoose";
import { ScoreCategoryCode } from "../../riskappetite/enums/riskEnums";

export interface IEligibleFund extends Document {
    _id: Types.ObjectId;
    fundName: string;
    isin: string;
    fundSubCategory: string;
    assetClass: string;
    instrumentType: string;
    scoreCategory: ScoreCategoryCode;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const eligibleFundSchema = new Schema<IEligibleFund>(
    {
        fundName: { type: String, required: true, trim: true },
        isin: { type: String, required: true, unique: true, trim: true, index: true },
        fundSubCategory: { type: String, required: true, trim: true },
        assetClass: { type: String, required: true, trim: true },
        instrumentType: { type: String, default: "Mutual Fund", trim: true },
        scoreCategory: {
            type: String,
            enum: Object.values(ScoreCategoryCode),
            required: true,
            index: true
        },
        isActive: { type: Boolean, default: true, index: true }
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
        }
    }

)

// Compound index for category filtering of active funds
eligibleFundSchema.index({ scoreCategory: 1, isActive: 1 });

export const EligibleFund = model<IEligibleFund>('EligibleFund', eligibleFundSchema);