import { inject, injectable } from 'tsyringe';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { UserOTPVerificationModel } from '../../../infrastructure/database/models/UserOTPVerificationModel';
import { UserModel } from '../../../infrastructure/database/models/UserModel';
import { IEmailService } from '../../../domain/services/IEmailService';
import { ReferralSettingModel } from '../../../infrastructure/database/models/ReferralSettingModel';
import { IVerifyEmailUseCase } from '../../interfaces/auth/IVerifyEmailUseCase';
import { IWhatsAppService } from '../../../domain/services/IWhatsAppService';
import { IComboOfferRepository } from '../../../domain/repositories/IComboOfferRepository';
import bcrypt from 'bcryptjs';

@injectable()
export class VerifyEmailUseCase implements IVerifyEmailUseCase {
    constructor(
        @inject('IUserRepository') private userRepository: IUserRepository,
        @inject('IEmailService') private emailService: IEmailService,
        @inject('IWhatsAppService')private whatsAppService: IWhatsAppService,
        @inject('IComboOfferRepository')private comboOfferRepository: IComboOfferRepository
    ) { }

    async execute(email: string, token: string | number): Promise<{ success: boolean; message: string }> {
        if (!email || token === undefined || token === null || token === '') {
            throw new Error('Email and verification code are required');
        }

        const normalizedEmail = email.toLowerCase().trim();
        const cleanOtp = typeof token === 'number'
            ? String(token).padStart(6, '0')
            : String(token).trim();

        if (!/^\d{6}$/.test(cleanOtp)) {
            throw new Error('Verification code must be a 6-digit number');
        }

        // 1. Find the latest OTP record
        const otpRecord = await UserOTPVerificationModel.findOne({ email: normalizedEmail }).sort({ createdAt: -1 });

        if (!otpRecord) {
            throw new Error('No active verification session found or code expired. Please request a new OTP.');
        }

        // 2. Check for brute-force attempts limit (max 5)
        if (otpRecord.attempts >= 5) {
            await UserOTPVerificationModel.deleteOne({ _id: otpRecord._id });
            throw new Error('Too many failed attempts. This verification code has been invalidated. Please request a new OTP.');
        }

        // 3. Check 10-minute expiry
        const isExpired = otpRecord.expiresAt
            ? new Date() > otpRecord.expiresAt
            : (Date.now() - otpRecord.createdAt.getTime() > 10 * 60 * 1000);

        if (isExpired) {
            await UserOTPVerificationModel.deleteOne({ _id: otpRecord._id });
            throw new Error('Verification code has expired. Please request a new OTP.');
        }

        // 4. Verify hashed OTP
        const isMatch = await bcrypt.compare(cleanOtp, otpRecord.otp);
        if (!isMatch) {
            otpRecord.attempts = (otpRecord.attempts || 0) + 1;
            await otpRecord.save();
            const remaining = 5 - otpRecord.attempts;
            if (remaining <= 0) {
                await UserOTPVerificationModel.deleteOne({ _id: otpRecord._id });
                throw new Error('Too many failed attempts. This verification code has been invalidated. Please request a new OTP.');
            }
            throw new Error(`Invalid verification code. You have ${remaining} attempt(s) remaining.`);
        }

        // 5. Find the user
        const user = await UserModel.findOne({ email: normalizedEmail });
        if (!user) {
            throw new Error('User not found');
        }

        if (user.verified) {
            await UserOTPVerificationModel.deleteMany({ email: normalizedEmail });
            return { success: true, message: 'Account is already verified. Please log in.' };
        }

        // 6. Mark user as verified
        user.verified = true;
        await user.save();
        await UserOTPVerificationModel.deleteMany({ email: normalizedEmail });

        // 7. Send WhatsApp welcome combo offer
        try {
            console.log('[Welcome WhatsApp] Started');

            const comboOffer =
                await this.comboOfferRepository.findLatestActiveComboOffer();

            console.log(
                '[Welcome WhatsApp] Active combo found:',
                !!comboOffer
            );

            if (!comboOffer) {
                console.warn(
                    '[Welcome WhatsApp] No active combo offer found'
                );
            } else {
                // Confirm these field names against UserModel.
                const phoneNumber = user.phoneNumber;

                console.log(
                    '[Welcome WhatsApp] Phone available:',
                    !!phoneNumber
                );
                console.log(
                    '[Welcome WhatsApp] Customer name available:',
                    !!user.displayName
                );
                console.log(
                    '[Welcome WhatsApp] Combo image available:',
                    !!comboOffer.imageUrl
                );
                console.log(
                    '[Welcome WhatsApp] Combo slug available:',
                    !!comboOffer.slug
                );

                if (phoneNumber) {
                    console.log(
                        '[Welcome WhatsApp] Calling sendWelcomeComboOffer'
                    );

                    await this.whatsAppService.sendWelcomeComboOffer(
                        phoneNumber,
                        // user.displayName || '',
                        comboOffer.offerName,
                        comboOffer.imageUrl || '',                        
comboOffer.slug || comboOffer._id

                    );

                    console.log(
                        '[Welcome WhatsApp] Service call completed'
                    );
                } else {
                    console.warn(
                        '[Welcome WhatsApp] Skipped: phone number is missing'
                    );
                }
            }
        } catch (error: any) {
            console.error(
                '[Welcome WhatsApp] Failed:',
                error?.response?.data || error?.message || error
            );
        }


        // 8. Send Welcome Email with Referral Code
        try {
            let referralSetting = await ReferralSettingModel.findOne({ isActive: true });
            if (!referralSetting) {
                referralSetting = await ReferralSettingModel.create({
                    offerPercentage: 20,
                    joiningDiscountPercentage: 20
                });
            }

            if (user.referralId && user.email) {
                await this.emailService.sendWelcomeWithReferralEmail(
                    user.email,
                    user.referralId,
                    referralSetting.offerPercentage,
                    referralSetting.joiningDiscountPercentage
                );
            }
        } catch (error) {
            console.error('Failed to send welcome email:', error);
        }

        // 8. Delete the OTP record as it has been used
        await UserOTPVerificationModel.deleteOne({ _id: otpRecord._id });

        return { success: true, message: 'Account successfully verified! You can now log in.' };
    }
}
