import { User } from '../entities/User';

export interface IUserRepository {
    findByEmail(email: string): Promise<User | null>;
    findByPhoneNumber(phoneNumber: string): Promise<User | null>;
    findById(id: string): Promise<User | null>;
    save(user: User): Promise<User>;
    findInfluencers(): Promise<any[]>;
    findPendingInfluencerRequests(): Promise<any[]>;
    findAllInfluencerRequests(): Promise<any[]>;
    findByIdAndUpdate(id: string, data: any): Promise<any | null>;
    trackReferralVisit(code: string): Promise<boolean>;
}

