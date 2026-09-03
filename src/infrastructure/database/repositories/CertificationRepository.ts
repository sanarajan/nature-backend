import { ICertificationRepository } from '../../../domain/repositories/ICertificationRepository';
import { CertificationModel, ICertificationDocument } from '../models/CertificationModel';

export class CertificationRepository implements ICertificationRepository {
    async create(data: Partial<ICertificationDocument>): Promise<ICertificationDocument> {
        const certification = new CertificationModel(data);
        return await certification.save();
    }

    async findById(id: string): Promise<ICertificationDocument | null> {
        return await CertificationModel.findById(id).exec();
    }

    async findAll(): Promise<ICertificationDocument[]> {
        return await CertificationModel.find().sort({ createdAt: -1 }).exec();
    }

    async update(id: string, data: Partial<ICertificationDocument>): Promise<ICertificationDocument | null> {
        return await CertificationModel.findByIdAndUpdate(id, data, { new: true }).exec();
    }

    async delete(id: string): Promise<ICertificationDocument | null> {
        return await CertificationModel.findByIdAndDelete(id).exec();
    }
}
