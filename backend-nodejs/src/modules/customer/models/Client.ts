import { Document, model, Schema, Types } from "mongoose";
import { ClientStatus, Gender } from "../enums/clientEnums";

export interface IClient extends Document {
    _id: Types.ObjectId;
    firstName: string;
    lastName: string;
    fullName: string;   // Virtual property (computed, not stored in DB)
    email: string;
    phone: string;
    pan?: string;
    dateOfBirth?: Date;
    gender?: Gender;
    status: ClientStatus;
    relationshipManager?: Types.ObjectId;    // Reference to User model
    signUpDate: Date;
    createdBy?: Types.ObjectId; // Reference to User model
    createdAt: Date;
    updatedAt: Date;
}


const clientSchema = new Schema<IClient>(
    {
        firstName: { type: String, required: true, trim: true },
        lastName: { type: String, required: true, trim: true },
        email: { type: String, required: true, unique: true, trim: true, lowercase: true },
        phone: { type: String, required: true, unique: true, trim: true, },
        pan: {
            type: String,
            trim: true,
            uppercase: true,
            sparse: true,
            match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid Indian PAN format (e.g. ABCDE1234F)'],
        },
        dateOfBirth: {
            type: Date
        },
        gender: {
            type: String,
            enum: Object.values(Gender)
        },
        status: {
            type: String,
            enum: Object.values(ClientStatus),
            default: ClientStatus.ONBOARDING,
            index: true, // Speeds up filtering clients by status in dashboard                              
        },
        relationshipManager: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            index: true // Speeds up filtering clients assigned to a specific RM                            
        },
        signUpDate: {
            type: Date,
            default: Date.now
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },

    },
    {
        timestamps: true, // Automatically manages createdAt and updatedAt                                
        toJSON: {
            virtuals: true, // Crucial: includes fullName in the serialized JSON                            
            transform: (_doc, ret: Record<string, unknown>) => {
                ret.id = ret._id ? ret._id.toString() : ret.id;
                delete ret._id;
                delete ret.__v;
                return ret;
            },
        },
    }
)

clientSchema.virtual('fullName').get(function () {
    return `${this.firstName} ${this.lastName}`.trim();
});

export const Client = model<IClient>('Client', clientSchema);