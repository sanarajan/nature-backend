import { Staff } from '../entities/Staff';

export interface IStaffRepository {
    findByEmail(email: string): Promise<Staff | null>;
    findById(id: string): Promise<Staff | null>;
    findAll(filter?: any): Promise<Staff[]>;
    save(staff: Staff): Promise<Staff>;
    delete(id: string): Promise<void>;
}
