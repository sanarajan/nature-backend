import mongoose, { Schema, Document } from 'mongoose';

export interface IUnitDocument extends Document {
    unitName: string;
}

const unitSchema = new Schema<IUnitDocument>({
    unitName: { type: String, required: true, unique: true }
}, { timestamps: true });

export const UnitModel = mongoose.model<IUnitDocument>('Unit', unitSchema);
