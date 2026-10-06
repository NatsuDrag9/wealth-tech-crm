import { Document, model, Schema } from 'mongoose';

export interface IRagConversationTurn extends Document {
  conversationId: string;
  turnIndex: number;
  userQuery: string;
  synthesizedAnswer: string;
  isGrounded: boolean;
  clientId?: string;
  createdAt: Date;
}

const ragConversationTurnSchema = new Schema<IRagConversationTurn>(
  {
    conversationId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    turnIndex: {
      type: Number,
      required: true,
    },
    userQuery: {
      type: String,
      required: true,
      trim: true,
    },
    synthesizedAnswer: {
      type: String,
      required: true,
      trim: true,
    },
    isGrounded: {
      type: Boolean,
      required: true,
      default: true,
    },
    clientId: {
      type: String,
      trim: true,
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
    collection: 'rag_conversation_turns',
  }
);

// Compound indexes for rapid window buffer lookups and client conversation history
ragConversationTurnSchema.index({ conversationId: 1, turnIndex: 1 });
ragConversationTurnSchema.index({ clientId: 1, createdAt: -1 });

export const RagConversationTurn = model<IRagConversationTurn>(
  'RagConversationTurn',
  ragConversationTurnSchema
);
