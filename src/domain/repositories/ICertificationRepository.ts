import { ICertificationDocument } from '../../infrastructure/database/models/CertificationModel';

export interface ICertificationRepository {
    create(data: Partial<ICertificationDocument>): Promise<ICertificationDocument>;
    findById(id: string): Promise<ICertificationDocument | null>;
    findAll(): Promise<ICertificationDocument[]>;
    update(id: string, data: Partial<ICertificationDocument>): Promise<ICertificationDocument | null>;
    delete(id: string): Promise<ICertificationDocument | null>;
}
