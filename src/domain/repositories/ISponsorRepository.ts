import { ISponsorDocument } from '../../infrastructure/database/models/SponsorModel';

export interface ISponsorRepository {
    create(data: Partial<ISponsorDocument>): Promise<ISponsorDocument>;
    findById(id: string): Promise<ISponsorDocument | null>;
    findAll(): Promise<ISponsorDocument[]>;
    findActive(): Promise<ISponsorDocument[]>;
    update(id: string, data: Partial<ISponsorDocument>): Promise<ISponsorDocument | null>;
    delete(id: string): Promise<ISponsorDocument | null>;
}
