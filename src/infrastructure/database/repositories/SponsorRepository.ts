import { ISponsorRepository } from '../../../domain/repositories/ISponsorRepository';
import { SponsorModel, ISponsorDocument } from '../models/SponsorModel';

export class SponsorRepository implements ISponsorRepository {
    async create(data: Partial<ISponsorDocument>): Promise<ISponsorDocument> {
        const sponsor = new SponsorModel(data);
        return await sponsor.save();
    }

    async findById(id: string): Promise<ISponsorDocument | null> {
        return await SponsorModel.findById(id).exec();
    }

    async findAll(): Promise<ISponsorDocument[]> {
        return await SponsorModel.find().sort({ createdAt: -1 }).exec();
    }

    async findActive(): Promise<ISponsorDocument[]> {
        return await SponsorModel.find({ status: 'active' })
            .select('companyName companyType websiteUrl imageUrl status')
            .sort({ createdAt: -1 })
            .exec();
    }

    async update(id: string, data: Partial<ISponsorDocument>): Promise<ISponsorDocument | null> {
        return await SponsorModel.findByIdAndUpdate(id, data, { new: true }).exec();
    }

    async delete(id: string): Promise<ISponsorDocument | null> {
        return await SponsorModel.findByIdAndDelete(id).exec();
    }
}
