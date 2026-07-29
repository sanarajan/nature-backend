import { injectable } from 'tsyringe';
import { IStaffRepository } from '../../../domain/repositories/IStaffRepository';
import { Staff } from '../../../domain/entities/Staff';
import { StaffModel, IStaffDocument } from '../models/StaffModel';
import { BaseRepository } from './BaseRepository';

@injectable()
export class StaffRepository extends BaseRepository<Staff, IStaffDocument> implements IStaffRepository {
    constructor() {
        super(StaffModel);
    }

    async findByEmail(email: string): Promise<Staff | null> {
        return this.findOne({ email });
    }

    async save(staff: Staff): Promise<Staff> {
        let query: any = {};
        if (staff.id && staff.id.trim() !== '') {
            query = { _id: staff.id };
            const staffDoc = await StaffModel.findOneAndUpdate(
                query,
                this.mapToDocument(staff),
                { upsert: true, new: true }
            );
            return this.mapToEntity(staffDoc);
        } else {
            const docData = this.mapToDocument(staff);
            // Ensure Mongoose generates the _id automatically
            delete docData._id;
            const doc = new StaffModel(docData);
            const saved = await doc.save();
            return this.mapToEntity(saved);
        }
    }

    protected mapToEntity(doc: IStaffDocument): Staff {
        return new Staff(
            doc._id.toString(),
            doc.name,
            doc.email,
            doc.phone,
            doc.profilePhoto,
            doc.password,
            doc.status,
            doc.isBlocked,
            doc.createdAt,
            doc.updatedAt
        );
    }

    protected mapToDocument(entity: Staff): any {
        const doc: any = {
            name: entity.name,
            email: entity.email,
            phone: entity.phone,
            profilePhoto: entity.profilePhoto !== undefined ? entity.profilePhoto : null,
            status: entity.status,
            isBlocked: entity.isBlocked
        };
        if (entity.password) {
            doc.password = entity.password;
        }
        return doc;
    }
}
