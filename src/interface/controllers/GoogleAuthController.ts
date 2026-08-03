import { Request, Response } from 'express';
import { inject, injectable } from 'tsyringe';
import { IGoogleAuthUseCase } from '../../application/interfaces/auth/IGoogleAuthUseCase';
import { STATUS_CODES } from '../../shared/constants/statusCodes';
import { AUTH_MESSAGES } from '../../shared/constants/messages/authMessages';
import { env } from '../../shared/config/env';

@injectable()
export class GoogleAuthController {
    constructor(
        @inject('IGoogleAuthUseCase') private googleAuthUseCase: IGoogleAuthUseCase
    ) { }

    async googleLogin(req: Request, res: Response): Promise<void> {
        const { credential } = req.body;

        if (!credential) {
            res.status(STATUS_CODES.BAD_REQUEST).json({
                success: false,
                message: 'Google credential token is required',
            });
            return;
        }

        try {
            const { user, accessToken, refreshToken } = await this.googleAuthUseCase.execute(credential);

            const prefix = 'user_';

            res.cookie(`${prefix}refreshToken`, refreshToken, {
                httpOnly: true,
                secure: env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 7 * 24 * 60 * 60 * 1000,
            });

            res.cookie(`${prefix}jwt`, accessToken, {
                httpOnly: true,
                secure: env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 15 * 60 * 1000,
            });

            res.status(STATUS_CODES.OK).json({
                success: true,
                message: AUTH_MESSAGES.LOGIN_SUCCESS,
                data: { user, accessToken },
            });
        } catch (error: any) {
            res.status(STATUS_CODES.UNAUTHORIZED).json({
                success: false,
                message: error.message || 'Google authentication failed',
            });
        }
    }
}
