"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerifyEmailUseCase = void 0;
const tsyringe_1 = require("tsyringe");
const UserOTPVerificationModel_1 = require("../../infrastructure/database/models/UserOTPVerificationModel");
const UserModel_1 = require("../../infrastructure/database/models/UserModel");
const EmailService_1 = require("../../infrastructure/services/EmailService");
const ReferralSettingModel_1 = require("../../infrastructure/database/models/ReferralSettingModel");
let VerifyEmailUseCase = class VerifyEmailUseCase {
    userRepository;
    emailService;
    constructor(userRepository, emailService) {
        this.userRepository = userRepository;
        this.emailService = emailService;
    }
    async execute(email, token) {
        // 1. Find the OTP record
        const otpRecord = await UserOTPVerificationModel_1.UserOTPVerificationModel.findOne({ email, otp: token });
        if (!otpRecord) {
            throw new Error('Invalid or expired verification link');
        }
        // 2. Find the user
        const user = await UserModel_1.UserModel.findOne({ email });
        if (!user) {
            throw new Error('User not found');
        }
        if (user.verified) {
            // Cleanup just in case
            await UserOTPVerificationModel_1.UserOTPVerificationModel.deleteOne({ _id: otpRecord._id });
            return { success: true, message: 'Email is already verified' };
        }
        // 3. Mark user as verified
        user.verified = true;
        await user.save();
        // 4. Send Welcome Email with Referral Code
        try {
            // First check if a referral setting exists for the percentage
            let referralSetting = await ReferralSettingModel_1.ReferralSettingModel.findOne({ isActive: true });
            if (!referralSetting) {
                // Creates a default row dynamically so it is available moving forward if the table was completely empty.
                referralSetting = await ReferralSettingModel_1.ReferralSettingModel.create({
                    offerPercentage: 20,
                    joiningDiscountPercentage: 20
                });
            }
            if (user.referralId && user.email) {
                await this.emailService.sendWelcomeWithReferralEmail(user.email, user.referralId, referralSetting.offerPercentage, referralSetting.joiningDiscountPercentage);
            }
        }
        catch (error) {
            console.error('Failed to send welcome email:', error);
        }
        // 5. Delete the OTP record as it has been used
        await UserOTPVerificationModel_1.UserOTPVerificationModel.deleteOne({ _id: otpRecord._id });
        return { success: true, message: 'Email successfully verified. Please check your email for your Welcome details and Referral link!' };
    }
};
exports.VerifyEmailUseCase = VerifyEmailUseCase;
exports.VerifyEmailUseCase = VerifyEmailUseCase = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)('IUserRepository')),
    __metadata("design:paramtypes", [Object, EmailService_1.EmailService])
], VerifyEmailUseCase);
