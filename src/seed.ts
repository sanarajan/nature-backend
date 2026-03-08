import 'reflect-metadata';
import { container } from './infrastructure/config/container';
import { IUserRepository } from './domain/repositories/IUserRepository';
import { PasswordService } from './infrastructure/services/PasswordService';
import { User } from './domain/entities/User';
import { UserRole } from './constants/enums/UserRole';
import { connectDB } from './infrastructure/config/database';
import { SuccessMessages } from './constants/messages/SuccessMessages';

const seedAdmin = async () => {
    await connectDB();

    const userRepository = container.resolve<IUserRepository>('IUserRepository');
    const passwordService = container.resolve(PasswordService);

    const adminEmail = 'admin@gmail.com';
    const existingAdmin = await userRepository.findByEmail(adminEmail);

    if (!existingAdmin) {
        const hashedPassword = await passwordService.hash('123456');
        const adminUser = new User(
            '',
            adminEmail,
            'Admin',
            'admin',
            undefined, // phoneNumber
            hashedPassword, // password
            UserRole.ADMIN,
            true, // verified
            undefined // addresses
        );
        await userRepository.save(adminUser);
        console.log(SuccessMessages.ADMIN_CREATED);
    } else {
        console.log('Admin user already exists');
    }
    process.exit(0);
};

seedAdmin();
