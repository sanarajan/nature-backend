import { inject, injectable } from 'tsyringe';
import { IEmailService } from '../../../domain/services/IEmailService';

export interface SubmitContactFormDTO {
    name: string;
    email: string;
    preference: string;
    message: string;
    captchaToken: string;
}

@injectable()
export class SubmitContactFormUseCase {
    constructor(
        @inject('IEmailService') private emailService: IEmailService
    ) {}

    async execute(data: SubmitContactFormDTO): Promise<void> {
        const { name, email, preference, message, captchaToken } = data;

        // Verify CAPTCHA
        const secretKey = process.env.RECAPTCHA_SECRET_KEY;
        if (!secretKey) {
            console.warn("RECAPTCHA_SECRET_KEY is not set. Assuming development environment and skipping CAPTCHA verification.");
        } else {
            const verificationUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${captchaToken}`;
            const response = await fetch(verificationUrl, { method: 'POST' });
            const result = await response.json();
            
            if (!result.success) {
                throw new Error("CAPTCHA verification failed");
            }
        }

        // Send Email
        await this.emailService.sendContactEmail(name, email, preference, message);
    }
}
