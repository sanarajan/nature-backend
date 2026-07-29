import mongoose, { Schema, Document } from 'mongoose';

export interface IUserNotificationDocument extends Document {
    userId: mongoose.Types.ObjectId;
    title: string;
    message: string;
    type: string;
    isRead: boolean;
    metadata?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}

const userNotificationSchema = new Schema<IUserNotificationDocument>({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, default: 'WITHDRAWAL' },
    isRead: { type: Boolean, default: false },
    metadata: { type: Schema.Types.Mixed }
}, { timestamps: true });

export const UserNotificationModel = mongoose.model<IUserNotificationDocument>('UserNotification', userNotificationSchema);
