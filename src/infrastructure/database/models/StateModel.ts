import mongoose, { Schema, Document } from 'mongoose';

export interface IStateDocument extends Document {
    name: string;
    code: string;
    country_id: mongoose.Types.ObjectId;
    isActive: boolean;
}

const stateSchema = new Schema<IStateDocument>({
    name: { type: String, required: true },
    code: { type: String, required: true },
    country_id: { type: Schema.Types.ObjectId, ref: 'Country', required: true },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

export const StateModel = mongoose.model<IStateDocument>('State', stateSchema);
