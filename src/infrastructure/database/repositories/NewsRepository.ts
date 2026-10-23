import { INewsRepository } from '../../../domain/repositories/INewsRepository';
import { NewsModel, INewsDocument } from '../models/NewsModel';

export class NewsRepository implements INewsRepository {
    async create(data: Partial<INewsDocument>): Promise<INewsDocument> {
        const news = new NewsModel(data);
        return await news.save();
    }

    async findById(id: string): Promise<INewsDocument | null> {
        return await NewsModel.findById(id).exec();
    }

    async findAll(): Promise<INewsDocument[]> {
        return await NewsModel.find().sort({ publishedDate: -1, createdAt: -1 }).exec();
    }

    async findActive(): Promise<INewsDocument[]> {
        return await NewsModel.find({ status: 'active' })
            .select('title summary content publishedDate imageUrl websiteUrl status createdAt updatedAt')
            .sort({ publishedDate: -1, createdAt: -1 })
            .exec();
    }

    async update(id: string, data: Partial<INewsDocument>): Promise<INewsDocument | null> {
        return await NewsModel.findByIdAndUpdate(id, data, { new: true }).exec();
    }

    async delete(id: string): Promise<INewsDocument | null> {
        return await NewsModel.findByIdAndDelete(id).exec();
    }
}
