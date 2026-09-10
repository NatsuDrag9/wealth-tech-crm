import { Document, model, Schema, Types } from "mongoose"

export interface IRole extends Document {
    name: string;
    description: string;
    group: Types.ObjectId;
    permissions: Types.ObjectId[];
    createdAt: Date;
    updatedAt: Date;
}

const roleSchema = new Schema<IRole>({
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    group: { type: Schema.Types.ObjectId, ref: "Group", required: true, index: true },
    permissions: [{ type: Schema.Types.ObjectId, ref: 'Permission' }]

}, { timestamps: true });

// Compound index: Role name must be unique within a Group
roleSchema.index({ name: 1, group: 1 }, { unique: true });

export const Role = model<IRole>('Role', roleSchema);