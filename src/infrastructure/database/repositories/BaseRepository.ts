import { Model, Document } from 'mongoose';
import { IBaseRepository } from '../../../domain/repositories/IBaseRepository';

export abstract class BaseRepository<T, D extends Document> implements IBaseRepository<T> {
    constructor(protected readonly model: Model<D>) { }

    protected abstract mapToEntity(doc: D): T;
    protected abstract mapToDocument(entity: T): any;

    async findAll(filter: any = {}): Promise<T[]> {
        const docs = await this.model.find(filter);
        return docs.map((doc) => this.mapToEntity(doc));
    }

    async findById(id: string): Promise<T | null> {
        const doc = await this.model.findById(id);
        return doc ? this.mapToEntity(doc) : null;
    }

    async findOne(filter: any): Promise<T | null> {
        const doc = await this.model.findOne(filter);
        return doc ? this.mapToEntity(doc) : null;
    }

    async save(entity: T): Promise<T> {
        const data = this.mapToDocument(entity);
        const doc = await this.model.findOneAndUpdate(
            { _id: (entity as any).id || new Object() }, // Simplified for generic
            data as any,
            { upsert: true, new: true }
        );
        return this.mapToEntity(doc);
    }

    async delete(id: string): Promise<void> {
        await this.model.findByIdAndDelete(id);
    }
}
