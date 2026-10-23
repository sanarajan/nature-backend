import { inject, injectable } from 'tsyringe';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { IPasswordService } from '../../../domain/services/IPasswordService';
import { IJwtService } from '../../../domain/services/IJwtService';
import { User } from '../../../domain/entities/User';
import { UserRole } from '../../../constants/enums/UserRole';
import { IEmailService } from '../../../domain/services/IEmailService';
import { UserOTPVerificationModel } from '../../../infrastructure/database/models/UserOTPVerificationModel';
import { UserModel } from '../../../infrastructure/database/models/UserModel';
import { WalletModel } from '../../../infrastructure/database/models/WalletModel';
import { IRegisterUseCase, RegisterRequest, RegisterResponse } from '../../interfaces/auth/IRegisterUseCase';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { IWhatsAppService } from '../../../domain/services/IWhatsAppService';

@injectable()
export class RegisterUseCase implements IRegisterUseCase {
    constructor(
        @inject('IUserRepository') private userRepository: IUserRepository,
        @inject('IPasswordService') private passwordService: IPasswordService,
        @inject('IJwtService') private jwtService: IJwtService,
        @inject('IEmailService') private emailService: IEmailService,
        @inject('IWhatsAppService') private whatsAppService: IWhatsAppService
    ) { }

    async execute(data: RegisterRequest): Promise<RegisterResponse> {
        // 1. Validate if Email is already in use
        const existingEmailUser = await this.userRepository.findByEmail(data.email);
        if (existingEmailUser) {
            if (existingEmailUser.verified) {
                throw new Error('Email address is already registered');
            }

            // User registered previously but has not completed OTP verification
            if (data.phoneNumber && data.phoneNumber !== existingEmailUser.phoneNumber) {
                const otherPhoneUser = await this.userRepository.findByPhoneNumber(data.phoneNumber);
                if (otherPhoneUser && otherPhoneUser.id !== existingEmailUser.id && otherPhoneUser.verified) {
                    throw new Error('Mobile number is already registered');
                }
            }

            // Update user details if password/phone updated
            if (data.password) {
                const hashedPassword = await this.passwordService.hash(data.password);
                await UserModel.findByIdAndUpdate(existingEmailUser.id, {
                    password: hashedPassword,
                    displayName: data.username || existingEmailUser.displayName,
                    username: data.username || existingEmailUser.username,
                    phoneNumber: data.phoneNumber || existingEmailUser.phoneNumber
                });
            }

            // Check existing OTP and rate limits / cooldown
            const normalizedExistingEmail = existingEmailUser.email.toLowerCase().trim();
            const existingOtpRecord = await UserOTPVerificationModel.findOne({ email: normalizedExistingEmail }).sort({ createdAt: -1 });
            const now = new Date();
            let shouldSendNewOtp = true;

            if (existingOtpRecord) {
                const lastSent = existingOtpRecord.lastResentAt || existingOtpRecord.createdAt;
                const elapsedSeconds = Math.floor((now.getTime() - lastSent.getTime()) / 1000);
                if (elapsedSeconds < 60) {
                    shouldSendNewOtp = false;
                } else if (existingOtpRecord.resendCount >= 3) {
                    if (existingOtpRecord.expiresAt > now) {
                        shouldSendNewOtp = false;
                    }
                }
            }

            if (shouldSendNewOtp) {
                const otp = crypto.randomInt(100000, 1000000).toString();
                const hashedOtp = await bcrypt.hash(otp, 10);
                const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

                await UserOTPVerificationModel.deleteMany({ email: normalizedExistingEmail });
                await UserOTPVerificationModel.create({
                    email: normalizedExistingEmail,
                    otp: hashedOtp,
                    expiresAt,
                    lastResentAt: now,
                    resendCount: existingOtpRecord ? existingOtpRecord.resendCount + 1 : 0,
                    attempts: 0
                });

                await this.emailService.sendVerificationEmail(existingEmailUser.email, otp);

                const phoneToUse = data.phoneNumber || existingEmailUser.phoneNumber;
                if (phoneToUse) {
                    try {
                        await this.whatsAppService.sendVerificationOTP(phoneToUse, otp);
                    } catch (whatsAppErr: any) {
                        console.error('WhatsApp OTP delivery failed (provider issue):', whatsAppErr?.message || whatsAppErr);
                    }
                }
            }

            const { password: _, ...userWithoutPassword } = existingEmailUser;
            return {
                user: userWithoutPassword as any,
                message: 'Account already created. Please verify your account with the OTP sent to your email and WhatsApp.'
            };
        }

        // 2. Validate if Mobile Number is already in use
        const existingPhoneUser = await this.userRepository.findByPhoneNumber(data.phoneNumber);
        if (existingPhoneUser) {
            if (existingPhoneUser.verified) {
                throw new Error('Mobile number is already registered');
            }
            throw new Error('Mobile number is already registered with an unverified account. Please verify using that account.');
        }

        // 3. Validate if Username is already in use
        if (data.username) {
            const existingUsernameUser = await UserModel.findOne({ username: data.username });
            if (existingUsernameUser && existingUsernameUser.verified) {
                throw new Error('Username is already taken');
            }
        }

        // 3. Hash the password
        let finalPassword = data.password;
        if (finalPassword) {
            finalPassword = await this.passwordService.hash(finalPassword);
        }

        // 4. Generate referralId
        const namePart = (data.username || 'USER').substring(0, 4).toUpperCase();
        const randPart = Math.floor(1000 + Math.random() * 9000).toString();
        const referralId = namePart + randPart;

        // 5. Check if referred by someone
        let referredByUserId: string | undefined = undefined;
        if (data.referralCode) {
            const referrer = await UserModel.findOne({ referralId: data.referralCode });
            if (referrer) {
                referredByUserId = referrer._id.toString();
            }
        }

        // 6. Create new user entity
        const newUser = new User(
            '', // id will be generated by the database
            data.email,
            data.username, // displayName
            data.username, // username
            data.phoneNumber,
            finalPassword,
            UserRole.USER,
            false, // verified is false initially
            undefined, // imageUrl
            referralId,
            referredByUserId,
            [], // addresses
            new Date(),
            new Date()
        );

        // 7. Save the user
        const savedUser = await this.userRepository.save(newUser);

        // 8. Create Wallet for User
        await WalletModel.create({ userId: savedUser.id });

        // 9. Generate ONE secure 6-digit numeric OTP and save hash
        const otp = crypto.randomInt(100000, 1000000).toString();
        const hashedOtp = await bcrypt.hash(otp, 10);
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        const normalizedSavedEmail = savedUser.email.toLowerCase().trim();

        await UserOTPVerificationModel.deleteMany({ email: normalizedSavedEmail });
        await UserOTPVerificationModel.create({
            email: normalizedSavedEmail,
            otp: hashedOtp,
            expiresAt,
            resendCount: 0,
            lastResentAt: new Date(),
            attempts: 0
        });

        // 10. Send the SAME OTP via Email
        await this.emailService.sendVerificationEmail(savedUser.email, otp);

        // 11. Send the SAME OTP through WhatsApp (gracefully handle provider errors)
        if (savedUser.phoneNumber) {
            try {
                await this.whatsAppService.sendVerificationOTP(
                    savedUser.phoneNumber,
                    otp
                );
            } catch (whatsAppErr: any) {
                console.error('WhatsApp OTP delivery failed (provider issue):', whatsAppErr?.message || whatsAppErr);
            }
        }

        // 12. Return response (No JWT tokens since verified: false)
        const { password: _, ...userWithoutPassword } = savedUser;

        return {
            user: userWithoutPassword as any,
            message: 'Registration successful. Please verify your account with the OTP sent to your email and WhatsApp.'
        };
    }
}
