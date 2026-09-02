import { Request, Response } from 'express';
import { inject, injectable } from 'tsyringe';
import { SubmitContactFormUseCase } from '../../../application/usecases/user/SubmitContactFormUseCase';
import asyncHandler from 'express-async-handler';

@injectable()
export class ContactController {
    constructor(
        @inject(SubmitContactFormUseCase) private submitContactFormUseCase: SubmitContactFormUseCase
    ) {}

    public submitForm = asyncHandler(async (req: Request, res: Response) => {
        const { name, email, preference, message, captchaToken } = req.body;

        // Basic validation
        if (!name || name.trim().length < 2) {
            res.status(400).json({ success: false, message: 'Valid name is required' });
            return;
        }

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            res.status(400).json({ success: false, message: 'Valid email is required' });
            return;
        }

        if (!preference || preference.trim().length === 0) {
            res.status(400).json({ success: false, message: 'Preference is required' });
            return;
        }

        if (!message || message.trim().length < 5 || message.trim().length > 5000) {
            res.status(400).json({ success: false, message: 'Message must be between 5 and 5000 characters' });
            return;
        }

        if (!captchaToken) {
            res.status(400).json({ success: false, message: 'CAPTCHA verification is required' });
            return;
        }

        try {
            await this.submitContactFormUseCase.execute({
                name: name.trim(),
                email: email.trim(),
                preference: preference.trim(),
                message: message.trim(),
                captchaToken
            });

            res.status(200).json({ success: true, message: 'Your message has been sent successfully.' });
        } catch (error: any) {
            res.status(400).json({ success: false, message: error.message || 'Security verification failed or email could not be sent. Please try again.' });
        }
    });
}
