import mongoose, { Schema, Document } from 'mongoose';

export interface IAdminNotificationDocument extends Document {
    message: string;
    link?: string;
    type?: string;
    isRead: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const adminNotificationSchema = new Schema<IAdminNotificationDocument>({
    message: { type: String, required: true },
    link: { type: String, default: '/admin/influencers' },
    type: { type: String, default: 'INFLUENCER_REQUEST' },
    isRead: { type: Boolean, default: false }
}, { timestamps: true });

export const AdminNotificationModel = mongoose.model<IAdminNotificationDocument>('AdminNotification', adminNotificationSchema);
