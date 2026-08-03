import { inject, injectable } from 'tsyringe';
import crypto from 'crypto';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { IPasswordService } from '../../../domain/services/IPasswordService';
import { IResetPasswordUseCase } from '../../interfaces/auth/IResetPasswordUseCase';

@injectable()
export class ResetPasswordUseCase implements IResetPasswordUseCase {
    constructor(
        @inject('IUserRepository') private userRepository: IUserRepository,
        @inject('IPasswordService') private passwordService: IPasswordService
    ) { }

    async execute(token: string, newPassword: string): Promise<{ message: string }> {
        if (!token || typeof token !== 'string') {
            throw new Error("This password reset link is invalid or has expired. Please request a new password reset link.");
        }

        if (!newPassword || newPassword.length < 8) {
            throw new Error("Password must be at least 8 characters long.");
        }

        // Hash token to compare with DB
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        const user = await this.userRepository.findByResetTokenHash(tokenHash);

        if (!user || !user.id) {
            throw new Error("This password reset link is invalid or has expired. Please request a new password reset link.");
        }

        // Hash the new password
        const hashedPassword = await this.passwordService.hash(newPassword);

        // Update password and immediately invalidate the reset token
        await this.userRepository.findByIdAndUpdate(user.id, {
            password: hashedPassword,
            passwordResetTokenHash: null,
            passwordResetTokenExpiresAt: null
        });

        return { message: "Your password has been reset successfully." };
    }
}
