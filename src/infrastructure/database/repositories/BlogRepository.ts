import { IBlogRepository } from '../../../domain/repositories/IBlogRepository';
import { BlogModel, IBlogDocument } from '../models/BlogModel';

export class BlogRepository implements IBlogRepository {
    async create(data: Partial<IBlogDocument>): Promise<IBlogDocument> {
        const blog = new BlogModel(data);
        return await blog.save();
    }

    async findById(id: string): Promise<IBlogDocument | null> {
        return await BlogModel.findById(id).exec();
    }

    async findAll(): Promise<IBlogDocument[]> {
        return await BlogModel.find().sort({ createdAt: -1 }).exec();
    }

    async findActive(): Promise<IBlogDocument[]> {
        return await BlogModel.find({ status: 'active' })
            .sort({ createdAt: -1 })
            .exec();
    }

    async update(id: string, data: Partial<IBlogDocument>): Promise<IBlogDocument | null> {
        return await BlogModel.findByIdAndUpdate(id, data, { new: true }).exec();
    }

    async delete(id: string): Promise<IBlogDocument | null> {
        return await BlogModel.findByIdAndDelete(id).exec();
    }
}
