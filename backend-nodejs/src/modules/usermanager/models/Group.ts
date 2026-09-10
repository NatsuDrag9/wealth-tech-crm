import { Document, model, Schema } from "mongoose";

export interface IGroup extends Document {
    name: string;
    description: string;
    createdAt: Date;
    updatedAt: Date;
}

const groupSchema = new Schema<IGroup>(
    {
        name: { type: String, required: true, unique: true, trim: true },
        description: { type: String, default: '' },
    },
    { timestamps: true }
);

export const Group = model<IGroup>('Group', groupSchema);