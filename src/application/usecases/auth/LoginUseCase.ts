import { inject, injectable } from 'tsyringe';
import { ILoginUseCase, LoginResponse } from '../../interfaces/auth/ILoginUseCase';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { IPasswordService } from '../../../domain/services/IPasswordService';
import { IJwtService } from '../../../domain/services/IJwtService';
import { IStaffRepository } from '../../../domain/repositories/IStaffRepository';
import { IEmailService } from '../../../domain/services/IEmailService';
import { IWhatsAppService } from '../../../domain/services/IWhatsAppService';
import { UserOTPVerificationModel } from '../../../infrastructure/database/models/UserOTPVerificationModel';
import { ErrorMessages } from '../../../constants/messages/ErrorMessages';
import { UserRole } from '../../../constants/enums/UserRole';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

@injectable()
export class LoginUseCase implements ILoginUseCase {
    constructor(
        @inject('IUserRepository') private userRepository: IUserRepository,
        @inject('IPasswordService') private passwordService: IPasswordService,
        @inject('IJwtService') private jwtService: IJwtService,
        @inject('IStaffRepository') private staffRepository: IStaffRepository,
        @inject('IEmailService') private emailService?: IEmailService,
        @inject('IWhatsAppService') private whatsAppService?: IWhatsAppService
    ) { }

    async execute(email: string, password: string): Promise<LoginResponse> {
        // 1. Try to find the user in Staff collection first
        const staff = await this.staffRepository.findByEmail(email);
        if (staff) {
            if (!staff.password) {
                throw new Error(ErrorMessages.INVALID_CREDENTIALS);
            }

            const isPasswordValid = await this.passwordService.compare(password, staff.password);
            if (!isPasswordValid) {
                throw new Error(ErrorMessages.INVALID_CREDENTIALS);
            }

            if (staff.status === 'BLOCKED' || staff.isBlocked) {
                throw new Error('Your account is blocked. Please contact admin.');
            }

            const payload = { id: staff.id, email: staff.email, role: 'STAFF', isInfluencer: false };
            const accessToken = this.jwtService.generateAccessToken(payload);
            const refreshToken = this.jwtService.generateRefreshToken(payload);

            return {
                user: {
                    id: staff.id,
                    email: staff.email,
                    displayName: staff.name,
                    username: staff.name,
                    role: 'STAFF'
                } as any,
                accessToken,
                refreshToken
            };
        }

        const user = await this.userRepository.findByEmail(email);

        if (!user || !user.password) {
            throw new Error(ErrorMessages.INVALID_CREDENTIALS);
        }

        const isPasswordValid = await this.passwordService.compare(password, user.password);

        if (!isPasswordValid) {
            throw new Error(ErrorMessages.INVALID_CREDENTIALS);
        }

        // 2. Enforce verification for unverified users
        if (user.verified === false && user.role !== UserRole.ADMIN) {
            const normalizedEmail = user.email.toLowerCase().trim();
            const existingOtp = await UserOTPVerificationModel.findOne({ email: normalizedEmail }).sort({ createdAt: -1 });
            const now = new Date();
            let shouldSendNewOtp = false;

            if (!existingOtp || (existingOtp.expiresAt && existingOtp.expiresAt < now)) {
                shouldSendNewOtp = true;
            }

            if (shouldSendNewOtp && this.emailService) {
                const otp = crypto.randomInt(100000, 1000000).toString();
                const hashedOtp = await bcrypt.hash(otp, 10);
                const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

                await UserOTPVerificationModel.deleteMany({ email: normalizedEmail });
                await UserOTPVerificationModel.create({
                    email: normalizedEmail,
                    otp: hashedOtp,
                    expiresAt,
                    lastResentAt: now,
                    resendCount: existingOtp ? existingOtp.resendCount : 0,
                    attempts: 0
                });

                await this.emailService.sendVerificationEmail(user.email, otp);

                if (user.phoneNumber && this.whatsAppService) {
                    try {
                        await this.whatsAppService.sendVerificationOTP(user.phoneNumber, otp);
                    } catch (err: any) {
                        console.error('WhatsApp OTP delivery failed (provider issue):', err?.message || err);
                    }
                }
            }

            const error: any = new Error('Please verify your account before logging in.');
            error.requiresVerification = true;
            error.email = user.email;
            error.phoneNumber = user.phoneNumber;
            throw error;
        }

        const payload = { id: user.id, email: user.email, role: user.role, isInfluencer: user.isInfluencer };
        const accessToken = this.jwtService.generateAccessToken(payload);
        const refreshToken = this.jwtService.generateRefreshToken(payload);

        // Remove password before returning
        const { password: _, ...userWithoutPassword } = user;

        return {
            user: userWithoutPassword as any,
            accessToken,
            refreshToken,
        };
    }
}

