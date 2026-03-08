import { inject, injectable } from 'tsyringe';
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { UserOTPVerificationModel } from '../../infrastructure/database/models/UserOTPVerificationModel';
import { UserModel } from '../../infrastructure/database/models/UserModel';
import { EmailService } from '../../infrastructure/services/EmailService';
import { ReferralSettingModel } from '../../infrastructure/database/models/ReferralSettingModel';

@injectable()
export class VerifyEmailUseCase {
    constructor(
        @inject('IUserRepository') private userRepository: IUserRepository,
        private emailService: EmailService
    ) { }

    async execute(email: string, token: string): Promise<{ success: boolean; message: string }> {
        // 1. Find the OTP record
        const otpRecord = await UserOTPVerificationModel.findOne({ email, otp: token });

        if (!otpRecord) {
            throw new Error('Invalid or expired verification link');
        }

        // 2. Find the user
        const user = await UserModel.findOne({ email });
        if (!user) {
            throw new Error('User not found');
        }

        if (user.verified) {
            // Cleanup just in case
            await UserOTPVerificationModel.deleteOne({ _id: otpRecord._id });
            return { success: true, message: 'Email is already verified' };
        }

        // 3. Mark user as verified
        user.verified = true;
        await user.save();

        // 4. Send Welcome Email with Referral Code
        try {
            // First check if a referral setting exists for the percentage
            let referralSetting = await ReferralSettingModel.findOne({ isActive: true });
            if (!referralSetting) {
                // Creates a default row dynamically so it is available moving forward if the table was completely empty.
                referralSetting = await ReferralSettingModel.create({
                    offerPercentage: 20,
                    joiningDiscountPercentage: 20
                });
            }

            if (user.referralId && user.email) {
                await this.emailService.sendWelcomeWithReferralEmail(user.email, user.referralId, referralSetting.offerPercentage, referralSetting.joiningDiscountPercentage);
            }
        } catch (error) {
            console.error('Failed to send welcome email:', error);
        }

        // 5. Delete the OTP record as it has been used
        await UserOTPVerificationModel.deleteOne({ _id: otpRecord._id });

        return { success: true, message: 'Email successfully verified. Please check your email for your Welcome details and Referral link!' };
    }
}
