import { inject, injectable } from 'tsyringe';
import crypto from 'crypto';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { IEmailService } from '../../../domain/services/IEmailService';
import { IForgotPasswordUseCase } from '../../interfaces/auth/IForgotPasswordUseCase';

@injectable()
export class ForgotPasswordUseCase implements IForgotPasswordUseCase {
    constructor(
        @inject('IUserRepository') private userRepository: IUserRepository,
        @inject('IEmailService') private emailService: IEmailService
    ) { }

    async execute(email: string): Promise<{ message: string }> {
        const standardSuccessMessage = "If an account exists with this email address, a password reset link has been sent.";

        if (!email || typeof email !== 'string') {
            return { message: standardSuccessMessage };
        }

        const normalizedEmail = email.trim().toLowerCase();
        const user = await this.userRepository.findByEmail(normalizedEmail);

        if (user && user.id) {
            // Generate cryptographically secure token
            const resetToken = crypto.randomBytes(32).toString('hex');

            // Store only hashed token in database
            const passwordResetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
            const passwordResetTokenExpiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes expiry

            // Overwrite any existing reset token for this user
            await this.userRepository.findByIdAndUpdate(user.id, {
                passwordResetTokenHash,
                passwordResetTokenExpiresAt
            });

            // Send email asynchronously containing the plain token in link
            await this.emailService.sendForgotPasswordEmail(user.email, resetToken);
        }

        return { message: standardSuccessMessage };
    }
}
