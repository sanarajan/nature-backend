import { Request, Response } from 'express';
import { inject, injectable } from 'tsyringe';
import { ILoginUseCase } from '../../application/interfaces/auth/ILoginUseCase';
import { IRegisterUseCase } from '../../application/interfaces/auth/IRegisterUseCase';
import { IVerifyEmailUseCase } from '../../application/interfaces/auth/IVerifyEmailUseCase';
import { IForgotPasswordUseCase } from '../../application/interfaces/auth/IForgotPasswordUseCase';
import { IResetPasswordUseCase } from '../../application/interfaces/auth/IResetPasswordUseCase';
import { IAuthService } from '../../application/interfaces/auth/IAuthService';
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { STATUS_CODES } from '../../shared/constants/statusCodes';
import { AUTH_MESSAGES } from '../../shared/constants/messages/authMessages';
import { env } from '../../shared/config/env';

@injectable()
export class AuthController {
    constructor(
        @inject('ILoginUseCase') private loginUseCase: ILoginUseCase,
        @inject('IRegisterUseCase') private registerUseCase: IRegisterUseCase,
        @inject('IVerifyEmailUseCase') private verifyEmailUseCase: IVerifyEmailUseCase,
        @inject('IForgotPasswordUseCase') private forgotPasswordUseCase: IForgotPasswordUseCase,
        @inject('IResetPasswordUseCase') private resetPasswordUseCase: IResetPasswordUseCase,
        @inject('IAuthService') private authService: IAuthService,
        @inject('IUserRepository') private userRepository: IUserRepository
    ) { }

    async register(req: Request, res: Response): Promise<void> {
        const { username, email, phoneNumber, password } = req.body;

        try {
            const { user, message } = await this.registerUseCase.execute({
                username,
                email,
                phoneNumber,
                password
            });

            res.status(STATUS_CODES.CREATED).json({
                success: true,
                message: message,
                data: { user },
            });
        } catch (error: any) {
            res.status(STATUS_CODES.BAD_REQUEST).json({
                success: false,
                message: error.message,
            });
        }
    }

    async login(req: Request, res: Response): Promise<void> {
        const { email, password } = req.body;

        try {
            const { user, accessToken, refreshToken } = await this.loginUseCase.execute(email, password);

            const roleUpper = user.role ? user.role.toUpperCase() : '';
            
            const isAdminRoute = req.baseUrl.includes('/admin');
            if (!isAdminRoute && (roleUpper === 'ADMIN' || roleUpper === 'STAFF')) {
                res.status(STATUS_CODES.UNAUTHORIZED).json({
                    success: false,
                    message: AUTH_MESSAGES.INVALID_CREDENTIALS,
                });
                return;
            }
            
            if (isAdminRoute && (roleUpper !== 'ADMIN' && roleUpper !== 'STAFF')) {
                res.status(STATUS_CODES.UNAUTHORIZED).json({
                    success: false,
                    message: AUTH_MESSAGES.INVALID_CREDENTIALS,
                });
                return;
            }

            const prefix = (roleUpper === 'ADMIN' || roleUpper === 'STAFF') ? 'admin_' : 'user_';

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
                message: error.message,
            });
        }
    }

    async logout(req: Request, res: Response): Promise<void> {
        const prefix = req.baseUrl.includes('/admin') ? 'admin_' : 'user_';
        res.clearCookie(`${prefix}refreshToken`);
        res.clearCookie(`${prefix}jwt`);
        res.status(STATUS_CODES.OK).json({
            success: true,
            message: AUTH_MESSAGES.LOGOUT_SUCCESS,
        });
    }

    async verifyEmail(req: Request, res: Response): Promise<void> {
        const { email, token } = req.body;
        if (!email || !token) {
            res.status(STATUS_CODES.BAD_REQUEST).json({ success: false, message: 'Email and token are required' });
            return;
        }

        try {
            const result = await this.verifyEmailUseCase.execute(email as string, token as string);
            res.status(STATUS_CODES.OK).json({
                success: true,
                message: result.message,
            });
        } catch (error: any) {
            res.status(STATUS_CODES.BAD_REQUEST).json({
                success: false,
                message: error.message,
            });
        }
    }

    async forgotPassword(req: Request, res: Response): Promise<void> {
        const { email } = req.body;

        try {
            const result = await this.forgotPasswordUseCase.execute(email);
            res.status(STATUS_CODES.OK).json({
                success: true,
                message: result.message,
            });
        } catch (error: any) {
            res.status(STATUS_CODES.BAD_REQUEST).json({
                success: false,
                message: error.message,
            });
        }
    }

    async resetPassword(req: Request, res: Response): Promise<void> {
        const { token, newPassword } = req.body;

        try {
            const result = await this.resetPasswordUseCase.execute(token, newPassword);
            res.status(STATUS_CODES.OK).json({
                success: true,
                message: result.message,
            });
        } catch (error: any) {
            res.status(STATUS_CODES.BAD_REQUEST).json({
                success: false,
                message: error.message,
            });
        }
    }

    async refresh(req: Request, res: Response): Promise<void> {
        const prefix = req.baseUrl.includes('/admin') ? 'admin_' : 'user_';
        const refreshToken = req.cookies[`${prefix}refreshToken`];

        if (!refreshToken) {
            res.status(STATUS_CODES.UNAUTHORIZED).json({ success: false, message: 'Refresh token not found' });
            return;
        }

        try {
            const decoded = await this.authService.verifyRefreshToken(refreshToken);
            
            const user = await this.userRepository.findById(decoded.id);
            if (!user) {
                res.status(STATUS_CODES.UNAUTHORIZED).json({ success: false, message: AUTH_MESSAGES.USER_NOT_FOUND });
                return;
            }

            const { accessToken } = this.authService.generateTokens({
                id: user.id,
                email: user.email,
                role: user.role,
                isInfluencer: user.isInfluencer
            });

            res.cookie(`${prefix}jwt`, accessToken, {
                httpOnly: true,
                secure: env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 15 * 60 * 1000,
            });

            res.status(STATUS_CODES.OK).json({
                success: true,
                data: { accessToken, role: user.role },
            });
        } catch (error: any) {
            res.status(STATUS_CODES.UNAUTHORIZED).json({ success: false, message: error.message || AUTH_MESSAGES.INVALID_TOKEN });
        }
    }
}
