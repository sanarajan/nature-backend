import { inject, injectable } from 'tsyringe';
import {
    IGetMeUseCase,
    IUpdateProfileUseCase,
    IGetUserAddressesUseCase,
    IAddOrUpdateAddressUseCase,
    IGetStatesUseCase
} from '../../interfaces/user/IUserUseCases';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { IAddressRepository, IStateRepository } from '../../../domain/repositories/ILocationRepository';
import { NotFoundError } from '../../../shared/utils/AppError';
import cloudinary from '../../../infrastructure/config/cloudinary';

@injectable()
export class GetMeUseCase implements IGetMeUseCase {
    constructor(@inject('IUserRepository') private userRepository: IUserRepository) {}

    async execute(userId: string): Promise<any> {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new NotFoundError('User not found');
        }
        
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }
}

@injectable()
export class UpdateProfileUseCase implements IUpdateProfileUseCase {
    constructor(
        @inject('IUserRepository') private userRepository: IUserRepository
    ) {}

    async execute(userId: string, data: { username?: string; password?: string; avatar?: string }): Promise<any> {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new NotFoundError('User not found');
        }

        if (data.username && data.username.trim().length >= 3) {
            (user as any).username = data.username.trim();
            (user as any).displayName = data.username.trim();
        }

        if (data.password && data.password.trim().length >= 8) {
            user.password = data.password.trim();
        }

        if (data.avatar && data.avatar.startsWith('data:image')) {
            const uploadRes = await cloudinary.uploader.upload(data.avatar, {
                folder: 'natural_ayam/users',
            });
            (user as any).imageUrl = uploadRes.secure_url;
        }

        const savedUser = await this.userRepository.save(user);
        const { password, ...userWithoutPassword } = savedUser;
        return userWithoutPassword;
    }
}

@injectable()
export class GetUserAddressesUseCase implements IGetUserAddressesUseCase {
    constructor(@inject('IUserRepository') private userRepository: IUserRepository) {}

    async execute(userId: string): Promise<any> {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new NotFoundError('User not found');
        }
        return user.addresses || [];
    }
}

@injectable()
export class AddOrUpdateAddressUseCase implements IAddOrUpdateAddressUseCase {
    constructor(
        @inject('IUserRepository') private userRepository: IUserRepository,
        @inject('IAddressRepository') private addressRepository: IAddressRepository
    ) {}

    async execute(userId: string, addressData: any): Promise<any> {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new NotFoundError('User not found');
        }

        let address;
        if (addressData._id) {
            address = await this.addressRepository.findById(addressData._id);
            if (!address) throw new NotFoundError('Address not found');
            Object.assign(address, addressData);
        } else {
            address = addressData;
        }

        const savedAddress = await this.addressRepository.save(address);

        if (!addressData._id) {
            // Need to update User document to include this address _id
            // Since User entity doesn't directly manage save of references,
            // we have to update it in the repository.
            // For now, let's append and save user.
            (user as any).addresses.push(savedAddress);
            await this.userRepository.save(user);
        }

        return savedAddress;
    }
}

@injectable()
export class GetStatesUseCase implements IGetStatesUseCase {
    constructor(@inject('IStateRepository') private stateRepository: IStateRepository) {}

    async execute(): Promise<any> {
        return await this.stateRepository.findActiveStates();
    }
}
