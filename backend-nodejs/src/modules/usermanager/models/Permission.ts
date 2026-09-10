import { Document, model, Schema } from "mongoose";

export interface IPermission extends Document {
    codename: string;
    name: string;
    contentType: string;
    createdAt: Date;
    updatedAt: Date;
}

const permissionSchema = new Schema<IPermission>({
    codename: { type: String, required: true, unique: true }, // unique: true automatically creates the index
    name: { type: String, required: true },
    contentType: { type: String, required: true, index: true }
},
    { timestamps: true }
);

export const Permission = model<IPermission>('Permission', permissionSchema);