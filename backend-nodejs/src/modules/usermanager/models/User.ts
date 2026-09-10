import { Document, model, Schema, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
    email: string;
    password?: string;
    fullName: string;
    group: Types.ObjectId;
    role: Types.ObjectId;
    reportsTo?: Types.ObjectId | null;
    languages: string[];
    createdAt: Date;
    updatedAt: Date;
    comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        password: { type: String, required: true, select: false },
        fullName: { type: String, required: true, trim: true },
        group: { type: Schema.Types.ObjectId, ref: 'Group', required: true, index: true },
        role: { type: Schema.Types.ObjectId, ref: 'Role', required: true, index: true },
        reportsTo: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        languages: { type: [String], default: ['Sanskrit'] },
    },
    { timestamps: true }
);

// Pre-save hook: Hash password with salt rounds = 10
userSchema.pre('save', async function (next) {
    if (!this.isModified('password') || !this.password) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Instance method for login credential verification
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
};

// toJSON transform: sanitize sensitive fields and map _id to id
userSchema.set('toJSON', {
    transform: (doc, ret: Record<string, any>) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        delete ret.password;
        return ret;
    },
});

export const User = model<IUser>('User', userSchema);