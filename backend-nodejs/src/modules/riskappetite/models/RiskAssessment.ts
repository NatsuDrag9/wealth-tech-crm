import { Document, model, Schema, Types } from 'mongoose';
import { AssessmentStatus, IScoreCategoryInfo } from '../enums/riskEnums';

export interface IRiskAnswer {
  question: Types.ObjectId; // ref: 'RiskQuestion'
  selectedOption: Types.ObjectId;
  points: number;
  answeredAt: Date;
}

export interface IRiskAssessment extends Document {
  _id: Types.ObjectId;
  client: Types.ObjectId; // ref: 'Client'
  status: AssessmentStatus;
  answers: IRiskAnswer[];
  totalScore?: number;
  scoreCategory?: IScoreCategoryInfo;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const riskAnswerSchema = new Schema<IRiskAnswer>(
  {
    question: { type: Schema.Types.ObjectId, ref: 'RiskQuestion', required: true },
    selectedOption: { type: Schema.Types.ObjectId, required: true },
    points: { type: Number, required: true },
    answeredAt: { type: Date, default: Date.now },
  },
  { _id: false } // Embedded subdocument does not need a standalone _id
);

const riskAssessmentSchema = new Schema<IRiskAssessment>(
  {
    client: { type: Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
    status: {
      type: String,
      enum: Object.values(AssessmentStatus),
      default: AssessmentStatus.IN_PROGRESS,
      index: true,
    },
    answers: [riskAnswerSchema],
    totalScore: { type: Number },
    scoreCategory: {
      code: { type: String },
      displayName: { type: String },
      minScore: { type: Number },
      maxScore: { type: Number },
    },
    completedAt: { type: Date },
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

// Compound index for querying a client's latest completed assessment
riskAssessmentSchema.index({ client: 1, status: 1, completedAt: -1 });

export const RiskAssessment = model<IRiskAssessment>('RiskAssessment', riskAssessmentSchema);