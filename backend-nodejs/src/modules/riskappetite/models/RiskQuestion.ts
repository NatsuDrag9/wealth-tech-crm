import { Document, model, Schema, Types } from 'mongoose';

export interface IRiskOption {
  _id: Types.ObjectId;
  optionLetter: string; // "A" | "B" | "C" | "D"
  optionText: string;
  points: number;
}

export interface IRiskQuestion extends Document {
  _id: Types.ObjectId;
  questionText: string;
  rationale: string;
  displayOrder: number;
  options: IRiskOption[];
  createdAt: Date;
  updatedAt: Date;
}

const riskOptionSchema = new Schema<IRiskOption>(
  {
    optionLetter: { type: String, required: true, trim: true },
    optionText: { type: String, required: true, trim: true },
    points: { type: Number, required: true },
  },
  {
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = ret._id ? String(ret._id) : ret.id;
        delete ret._id;
        return ret;
      },
    },
  }
);

const riskQuestionSchema = new Schema<IRiskQuestion>(
  {
    questionText: { type: String, required: true, trim: true },
    rationale: { type: String, required: true, trim: true },
    displayOrder: { type: Number, required: true, unique: true },
    options: [riskOptionSchema],
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

export const RiskQuestion = model<IRiskQuestion>('RiskQuestion', riskQuestionSchema);