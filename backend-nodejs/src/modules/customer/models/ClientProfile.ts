import { Document, model, Schema, Types } from "mongoose";
import { ClientStatus, KycStatus } from "../enums/clientEnums";

export interface IClientProfile extends Document {
    _id: Types.ObjectId;
    client: Types.ObjectId;
    kycStatus: KycStatus;
    clientStatus: ClientStatus;
    addressLine?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country: string;
    createdAt: Date;
    updatedAt: Date;
}

const clientProfileSchema = new Schema<IClientProfile>(
    {
        client: {
            type: Schema.Types.ObjectId,
            ref: 'Client',
            required: true,
            unique: true,
            index: true,
        },
        kycStatus: {
            type: String,
            enum: Object.values(KycStatus),
            default: KycStatus.PENDING,
            index: true,
        },
        clientStatus: {
            type: String,
            enum: Object.values(ClientStatus),
            default: ClientStatus.ONBOARDING
        },
        addressLine: { type: String, trim: true },
        city: { type: String, trim: true },
        state: { type: String, trim: true },
        pincode: { type: String, trim: true, maxLength: 10 },
        country: { type: String, trim: true, default: 'India' }
    },
    {
        timestamps: true,
        toJSON: {
            virtuals: true,
            transform: (_doc, ret: Record<string, unknown>) => {
                ret.id = ret._id ? ret._id.toString() : ret.id;
                delete ret._id;
                delete ret.__v;
                return ret;
            }
        }
    }
);

export const ClientProfile = model<IClientProfile>('ClientProfile', clientProfileSchema);