import { inject, injectable } from 'tsyringe';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { IEmailService } from '../../../domain/services/IEmailService';
import { IWhatsAppService } from '../../../domain/services/IWhatsAppService';
import { UserOTPVerificationModel } from '../../../infrastructure/database/models/UserOTPVerificationModel';
import { UserModel } from '../../../infrastructure/database/models/UserModel';
import { IResendOtpUseCase } from '../../interfaces/auth/IResendOtpUseCase';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

@injectable()
export class ResendOtpUseCase implements IResendOtpUseCase {
    constructor(
        @inject('IUserRepository') private userRepository: IUserRepository,
        @inject('IEmailService') private emailService: IEmailService,
        @inject('IWhatsAppService') private whatsAppService: IWhatsAppService
    ) { }

    async execute(email: string): Promise<{ success: boolean; message: string; resendCount: number }> {
        if (!email) {
            throw new Error('Email address is required');
        }

        const normalizedEmail = email.toLowerCase().trim();

        // 1. Verify user exists and is not already verified
        const user = await UserModel.findOne({ email: normalizedEmail });
        if (!user) {
            throw new Error('User not found');
        }

        if (user.verified) {
            throw new Error('Account is already verified. Please log in.');
        }

        // 2. Check existing OTP record
        const existingRecord = await UserOTPVerificationModel.findOne({ email: normalizedEmail }).sort({ createdAt: -1 });
        const now = new Date();

        if (existingRecord) {
            // Check max resend limit (3 times)
            if (existingRecord.resendCount >= 3) {
                throw new Error('Maximum resend limit (3) reached for this verification session. Please wait or contact support.');
            }

            // Check 60-second cooldown
            const lastSent = existingRecord.lastResentAt || existingRecord.createdAt;
            const elapsedSeconds = Math.floor((now.getTime() - lastSent.getTime()) / 1000);
            if (elapsedSeconds < 60) {
                const remaining = 60 - elapsedSeconds;
                throw new Error(`Please wait ${remaining} second${remaining === 1 ? '' : 's'} before requesting a new OTP.`);
            }
        }

        // 3. Generate ONE new secure 6-digit numeric OTP
        const newOtp = crypto.randomInt(100000, 1000000).toString();
        const hashedOtp = await bcrypt.hash(newOtp, 10);
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        const newResendCount = existingRecord ? existingRecord.resendCount + 1 : 1;

        // 4. Overwrite previous OTP to invalidate old code and reset attempt counter
        await UserOTPVerificationModel.deleteMany({ email: normalizedEmail });
        await UserOTPVerificationModel.create({
            email: normalizedEmail,
            otp: hashedOtp,
            expiresAt,
            lastResentAt: now,
            resendCount: newResendCount,
            attempts: 0
        });

        // 5. Send SAME OTP via Email
        await this.emailService.sendVerificationEmail(user.email || normalizedEmail, newOtp);

        // 6. Send SAME OTP via WhatsApp (gracefully handle provider errors)
        if (user.phoneNumber) {
            try {
                await this.whatsAppService.sendVerificationOTP(user.phoneNumber, newOtp);
            } catch (whatsAppErr: any) {
                console.error('WhatsApp OTP delivery failed (provider issue):', whatsAppErr?.message || whatsAppErr);
            }
        }

        return {
            success: true,
            message: 'A new verification code has been sent to your email and WhatsApp.',
            resendCount: newResendCount
        };
    }
}
