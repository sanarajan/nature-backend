"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const container_1 = require("./infrastructure/config/container");
const PasswordService_1 = require("./infrastructure/services/PasswordService");
const User_1 = require("./domain/entities/User");
const UserRole_1 = require("./constants/enums/UserRole");
const database_1 = require("./infrastructure/config/database");
const SuccessMessages_1 = require("./constants/messages/SuccessMessages");
const seedAdmin = async () => {
    await (0, database_1.connectDB)();
    const userRepository = container_1.container.resolve('IUserRepository');
    const passwordService = container_1.container.resolve(PasswordService_1.PasswordService);
    const adminEmail = 'admin@gmail.com';
    const existingAdmin = await userRepository.findByEmail(adminEmail);
    if (!existingAdmin) {
        const hashedPassword = await passwordService.hash('123456');
        const adminUser = new User_1.User('', adminEmail, 'Admin', 'admin', undefined, // phoneNumber
        hashedPassword, // password
        UserRole_1.UserRole.ADMIN, true, // verified
        undefined // addresses
        );
        await userRepository.save(adminUser);
        console.log(SuccessMessages_1.SuccessMessages.ADMIN_CREATED);
    }
    else {
        console.log('Admin user already exists');
    }
    process.exit(0);
};
seedAdmin();
