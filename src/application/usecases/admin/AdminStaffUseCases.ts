import { inject, injectable } from 'tsyringe';
import { IStaffRepository } from '../../../domain/repositories/IStaffRepository';
import { Staff } from '../../../domain/entities/Staff';
import { IPasswordService } from '../../../domain/services/IPasswordService';
import { IEmailService } from '../../../domain/services/IEmailService';
import { NotFoundError, ValidationError } from '../../../shared/utils/AppError';
import cloudinary from '../../../infrastructure/config/cloudinary';
import crypto from 'crypto';

function generateRandomPassword(): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const digits = '0123456789';
    const symbols = '!@#$%^&*';
    const all = uppercase + lowercase + digits + symbols;
    
    // Generate secure random bytes
    const bytes = crypto.randomBytes(12);
    let password = '';
    
    // Select one of each character category to guarantee complexity
    password += uppercase[crypto.randomBytes(1)[0] % uppercase.length];
    password += lowercase[crypto.randomBytes(1)[0] % lowercase.length];
    password += digits[crypto.randomBytes(1)[0] % digits.length];
    password += symbols[crypto.randomBytes(1)[0] % symbols.length];
    
    // Fill the rest of the 12 character password
    for (let i = 0; i < 8; i++) {
        password += all[bytes[i] % all.length];
    }
    
    // Shuffle the characters
    return password.split('').sort(() => 0.5 - Math.random()).join('');
}

@injectable()
export class CreateStaffUseCase {
    constructor(
        @inject('IStaffRepository') private staffRepository: IStaffRepository,
        @inject('IPasswordService') private passwordService: IPasswordService,
        @inject('IEmailService') private emailService: IEmailService
    ) {}

    async execute(data: { name: string; email: string; phone: string; profilePhoto?: string }): Promise<Staff> {
        if (!data.name || !data.name.trim()) {
            throw new ValidationError('Name is required');
        }
        if (!data.email || !data.email.trim()) {
            throw new ValidationError('Email is required');
        }
        if (!data.phone || !data.phone.trim()) {
            throw new ValidationError('Phone number is required');
        }

        const existing = await this.staffRepository.findByEmail(data.email);
        if (existing) {
            throw new ValidationError('Email already in use');
        }

        // Auto-generate strong unique password on the backend
        const plainTextPassword = generateRandomPassword();
        const hashedPassword = await this.passwordService.hash(plainTextPassword);

        // Optional profile photo upload using existing Cloudinary integration
        let uploadedPhotoUrl = null;
        if (data.profilePhoto && data.profilePhoto.startsWith('data:image')) {
            const uploadRes = await cloudinary.uploader.upload(data.profilePhoto, {
                folder: 'natural_ayam/staff',
            });
            uploadedPhotoUrl = uploadRes.secure_url;
        }

        const staff = new Staff(
            '',
            data.name,
            data.email,
            data.phone,
            uploadedPhotoUrl,
            hashedPassword,
            'ACTIVE',
            false
        );

        const savedStaff = await this.staffRepository.save(staff);

        // Send registration credentials email after successful creation
        try {
            await this.emailService.sendStaffCredentialsEmail(savedStaff.email, savedStaff.name, plainTextPassword);
        } catch (emailError) {
            console.error('Failed to send staff credential email:', emailError);
            // Do not roll back staff creation if email sending fails temporarily
        }

        return savedStaff;
    }
}

@injectable()
export class GetStaffListUseCase {
    constructor(
        @inject('IStaffRepository') private staffRepository: IStaffRepository
    ) {}

    async execute(): Promise<Staff[]> {
        return this.staffRepository.findAll();
    }
}

@injectable()
export class GetStaffDetailsUseCase {
    constructor(
        @inject('IStaffRepository') private staffRepository: IStaffRepository
    ) {}

    async execute(id: string): Promise<Staff> {
        const staff = await this.staffRepository.findById(id);
        if (!staff) {
            throw new NotFoundError('Staff not found');
        }
        return staff;
    }
}

@injectable()
export class UpdateStaffUseCase {
    constructor(
        @inject('IStaffRepository') private staffRepository: IStaffRepository,
        @inject('IPasswordService') private passwordService: IPasswordService
    ) {}

    async execute(id: string, data: { name?: string; email?: string; phone?: string; profilePhoto?: string; status?: 'ACTIVE' | 'BLOCKED'; password?: string }): Promise<Staff> {
        const staff = await this.staffRepository.findById(id);
        if (!staff) {
            throw new NotFoundError('Staff not found');
        }

        if (data.email && data.email !== staff.email) {
            const existing = await this.staffRepository.findByEmail(data.email);
            if (existing) {
                throw new ValidationError('Email already in use');
            }
        }

        let hashedPassword = staff.password;
        if (data.password && data.password.trim() !== '') {
            hashedPassword = await this.passwordService.hash(data.password);
        }

        // Optional profile photo upload
        let uploadedPhotoUrl = data.profilePhoto !== undefined ? data.profilePhoto : staff.profilePhoto;
        if (data.profilePhoto && data.profilePhoto.startsWith('data:image')) {
            const uploadRes = await cloudinary.uploader.upload(data.profilePhoto, {
                folder: 'natural_ayam/staff',
            });
            uploadedPhotoUrl = uploadRes.secure_url;
        }

        const newStatus = data.status ?? staff.status;
        const newIsBlocked = newStatus === 'BLOCKED';

        const updatedStaff = new Staff(
            id,
            data.name ?? staff.name,
            data.email ?? staff.email,
            data.phone ?? staff.phone,
            uploadedPhotoUrl,
            hashedPassword,
            newStatus,
            newIsBlocked,
            staff.createdAt,
            new Date()
        );

        return this.staffRepository.save(updatedStaff);
    }
}

@injectable()
export class ActivateStaffUseCase {
    constructor(
        @inject('IStaffRepository') private staffRepository: IStaffRepository
    ) {}

    async execute(id: string): Promise<Staff> {
        const staff = await this.staffRepository.findById(id);
        if (!staff) {
            throw new NotFoundError('Staff not found');
        }

        const updated = new Staff(
            id,
            staff.name,
            staff.email,
            staff.phone,
            staff.profilePhoto,
            staff.password,
            'ACTIVE',
            false,
            staff.createdAt,
            new Date()
        );

        return this.staffRepository.save(updated);
    }
}

@injectable()
export class DeactivateStaffUseCase {
    constructor(
        @inject('IStaffRepository') private staffRepository: IStaffRepository
    ) {}

    async execute(id: string): Promise<Staff> {
        const staff = await this.staffRepository.findById(id);
        if (!staff) {
            throw new NotFoundError('Staff not found');
        }

        const updated = new Staff(
            id,
            staff.name,
            staff.email,
            staff.phone,
            staff.profilePhoto,
            staff.password,
            'BLOCKED',
            true,
            staff.createdAt,
            new Date()
        );

        return this.staffRepository.save(updated);
    }
}

@injectable()
export class BlockStaffUseCase {
    constructor(
        @inject('IStaffRepository') private staffRepository: IStaffRepository
    ) {}

    async execute(id: string): Promise<Staff> {
        const staff = await this.staffRepository.findById(id);
        if (!staff) {
            throw new NotFoundError('Staff not found');
        }

        const updated = new Staff(
            id,
            staff.name,
            staff.email,
            staff.phone,
            staff.profilePhoto,
            staff.password,
            'BLOCKED',
            true,
            staff.createdAt,
            new Date()
        );

        return this.staffRepository.save(updated);
    }
}

@injectable()
export class UnblockStaffUseCase {
    constructor(
        @inject('IStaffRepository') private staffRepository: IStaffRepository
    ) {}

    async execute(id: string): Promise<Staff> {
        const staff = await this.staffRepository.findById(id);
        if (!staff) {
            throw new NotFoundError('Staff not found');
        }

        const updated = new Staff(
            id,
            staff.name,
            staff.email,
            staff.phone,
            staff.profilePhoto,
            staff.password,
            'ACTIVE',
            false,
            staff.createdAt,
            new Date()
        );

        return this.staffRepository.save(updated);
    }
}
