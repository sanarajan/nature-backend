import { injectable } from 'tsyringe';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { User } from '../../../domain/entities/User';
import { UserModel, IUserDocument } from '../models/UserModel';
import { BaseRepository } from './BaseRepository';

@injectable()
export class UserRepository extends BaseRepository<User, IUserDocument> implements IUserRepository {
    constructor() {
        super(UserModel);
    }

    async findByEmail(email: string): Promise<User | null> {
        return this.findOne({ email });
    }

    async findByPhoneNumber(phoneNumber: string): Promise<User | null> {
        return this.findOne({ phoneNumber });
    }

    async findById(id: string): Promise<User | null> {
        const userDoc = await UserModel.findById(id).populate('address_ids').exec();
        return userDoc ? this.mapToEntity(userDoc) : null;
    }

    protected mapToEntity(userDoc: IUserDocument): User {
        return new User(
            userDoc._id.toString(),
            userDoc.email || '',
            userDoc.displayName,
            userDoc.username,
            userDoc.phoneNumber,
            userDoc.password,
            userDoc.role,
            userDoc.verified || false,
            userDoc.imageUrl,
            userDoc.referralId,
            userDoc.referredBy?.toString(),
            (userDoc.address_ids || []).map((addr: any) => ({
                id: addr._id.toString(),
                ...addr.toObject ? addr.toObject() : addr
            })),
            userDoc.createdAt,
            userDoc.updatedAt
        );
    }

    protected mapToDocument(user: User): any {
        return {
            email: user.email,
            displayName: user.displayName,
            username: user.username,
            phoneNumber: user.phoneNumber,
            password: user.password,
            role: user.role,
            verified: user.verified,
            imageUrl: user.imageUrl,
            referralId: user.referralId,
            referredBy: user.referredBy,
        };
    }

    // Override save for custom email-based upsert logic
    async save(user: User): Promise<User> {
        let query: any = {};
        if (user.id) {
            query = { _id: user.id };
        } else if (user.email) {
            query = { email: user.email };
        } else if (user.phoneNumber) {
            query = { phoneNumber: user.phoneNumber };
        }

        const userDoc = await UserModel.findOneAndUpdate(
            query,
            this.mapToDocument(user),
            { upsert: true, new: true }
        );
        return this.mapToEntity(userDoc);
    }
}
