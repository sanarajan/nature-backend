import { IBlogDocument } from '../../infrastructure/database/models/BlogModel';

export interface IBlogRepository {
    create(data: Partial<IBlogDocument>): Promise<IBlogDocument>;
    findById(id: string): Promise<IBlogDocument | null>;
    findAll(): Promise<IBlogDocument[]>;
    findActive(): Promise<IBlogDocument[]>;
    update(id: string, data: Partial<IBlogDocument>): Promise<IBlogDocument | null>;
    delete(id: string): Promise<IBlogDocument | null>;
}
