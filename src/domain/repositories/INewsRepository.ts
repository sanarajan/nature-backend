import { INewsDocument } from '../../infrastructure/database/models/NewsModel';

export interface INewsRepository {
    create(data: Partial<INewsDocument>): Promise<INewsDocument>;
    findById(id: string): Promise<INewsDocument | null>;
    findAll(): Promise<INewsDocument[]>;
    findActive(): Promise<INewsDocument[]>;
    update(id: string, data: Partial<INewsDocument>): Promise<INewsDocument | null>;
    delete(id: string): Promise<INewsDocument | null>;
}
