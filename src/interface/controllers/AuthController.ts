import { Request, Response } from 'express';
import { inject, injectable } from 'tsyringe';
import { ILoginUseCase } from '../../application/interfaces/ILoginUseCase';
import { RegisterUseCase } from '../../application/usecases/RegisterUseCase';
import { VerifyEmailUseCase } from '../../application/usecases/VerifyEmailUseCase';
import { SuccessMessages } from '../../constants/messages/SuccessMessages';
import { AuthService } from '../../application/services/AuthService';
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { UserModel } from '../../infrastructure/database/models/UserModel';
import { AddressModel } from '../../infrastructure/database/models/AddressModel';
import { StateModel } from '../../infrastructure/database/models/StateModel';
import cloudinary from '../../infrastructure/config/cloudinary';

@injectable()
export class AuthController {
    constructor(
        @inject('ILoginUseCase') private loginUseCase: ILoginUseCase,
        @inject('RegisterUseCase') private registerUseCase: RegisterUseCase,
        @inject('VerifyEmailUseCase') private verifyEmailUseCase: VerifyEmailUseCase,
        @inject('AuthService') private authService: AuthService,
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

            res.status(201).json({
                success: true,
                message: message,
                data: {
                    user,
                },
            });
        } catch (error: any) {
            console.error('Registration API Error:', error);
            res.status(400).json({
                success: false,
                message: error.message,
            });
        }
    }

    async login(req: Request, res: Response): Promise<void> {
        const { email, password } = req.body;

        try {
            const { user, accessToken, refreshToken } = await this.loginUseCase.execute(email, password);

            // Determine prefix based on USER ROLE for safer cookie handling
            const prefix = (user.role.toUpperCase() === 'ADMIN') ? 'admin_' : 'user_';

            // Set Refresh Token in HTTP-only Cookie
            res.cookie(`${prefix}refreshToken`, refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            });

            // Set Access Token (jwt) in HTTP-only Cookie
            res.cookie(`${prefix}jwt`, accessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 15 * 60 * 1000, // 15 minutes
            });

            res.status(200).json({
                success: true,
                message: SuccessMessages.LOGIN_SUCCESS,
                data: {
                    user,
                    accessToken,
                },
            });
        } catch (error: any) {
            res.status(401).json({
                success: false,
                message: error.message,
            });
        }
    }

    async logout(req: Request, res: Response): Promise<void> {
        const prefix = req.baseUrl.includes('/admin') ? 'admin_' : 'user_';
        res.clearCookie(`${prefix}refreshToken`);
        res.clearCookie(`${prefix}jwt`);
        res.status(200).json({
            success: true,
            message: SuccessMessages.LOGOUT_SUCCESS,
        });
    }

    async verifyEmail(req: Request, res: Response): Promise<void> {
        const { email, token } = req.body;
        if (!email || !token) {
            res.status(400).json({ success: false, message: 'Email and token are required' });
            return;
        }

        try {
            const result = await this.verifyEmailUseCase.execute(email as string, token as string);
            res.status(200).json({
                success: true,
                message: result.message,
            });
        } catch (error: any) {
            console.error('Verify Email API Error:', error);
            res.status(400).json({
                success: false,
                message: error.message,
            });
        }
    }

    async refresh(req: Request, res: Response): Promise<void> {
        const prefix = req.baseUrl.includes('/admin') ? 'admin_' : 'user_';
        const refreshToken = req.cookies[`${prefix}refreshToken`];

        if (!refreshToken) {
            res.status(401).json({ success: false, message: 'Refresh token not found' });
            return;
        }

        try {
            const decoded = await this.authService.verifyRefreshToken(refreshToken);
            const { accessToken } = this.authService.generateTokens({
                id: decoded.id,
                email: decoded.email,
                role: decoded.role
            });

            res.cookie(`${prefix}jwt`, accessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 15 * 60 * 1000,
            });

            res.status(200).json({
                success: true,
                data: {
                    accessToken,
                    role: decoded.role
                },
            });
        } catch (error: any) {
            console.error('Refresh Token Error:', error.message);
            res.status(401).json({ success: false, message: error.message || 'Invalid refresh token' });
        }
    }

    async getMe(req: Request, res: Response): Promise<void> {
        try {
            const payload = (req as any).user;
            const fullUser = await this.userRepository.findById(payload.id);

            if (!fullUser) {
                res.status(404).json({ success: false, message: 'User not found' });
                return;
            }

            const { password: _, ...userWithoutPassword } = fullUser as any;

            res.status(200).json({
                success: true,
                data: { user: userWithoutPassword },
            });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async updateProfile(req: Request, res: Response): Promise<void> {
        try {
            const payload = (req as any).user;
            const { username, password, avatar } = req.body;

            const userDoc = await UserModel.findById(payload.id);
            if (!userDoc) {
                res.status(404).json({ success: false, message: 'User not found' });
                return;
            }

            if (username && username.trim().length >= 3) {
                userDoc.username = username.trim();
                userDoc.displayName = username.trim();
            }

            if (password && password.trim().length >= 8) {
                userDoc.password = password.trim();
                // The pre-save hook on the UserModel will automatically hash this before DB save!
            }

            if (avatar && avatar.startsWith('data:image')) {
                const uploadRes = await cloudinary.uploader.upload(avatar, {
                    folder: 'natural_ayam/users',
                });
                userDoc.imageUrl = uploadRes.secure_url;
            }

            await userDoc.save();

            const { password: _, ...userWithoutPassword } = userDoc.toObject();

            res.status(200).json({
                success: true,
                message: 'Profile updated successfully!',
                data: { user: userWithoutPassword },
            });
        } catch (error: any) {
            console.error('Update Profile Error:', error);
            res.status(500).json({ success: false, message: error.message || 'Server error updating profile' });
        }
    }

    async getUserAddresses(req: Request, res: Response): Promise<void> {
        try {
            const payload = (req as any).user;
            const fullUser = await UserModel.findById(payload.id).populate('address_ids');
            if (!fullUser) {
                res.status(404).json({ success: false, message: 'User not found' });
                return;
            }

            res.status(200).json({
                success: true,
                data: { addresses: fullUser.address_ids },
            });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async addOrUpdateAddress(req: Request, res: Response): Promise<void> {
        try {
            const payload = (req as any).user;
            const userDoc = await UserModel.findById(payload.id);
            if (!userDoc) {
                res.status(404).json({ success: false, message: 'User not found' });
                return;
            }

            const { firstName, lastName, company, country, street1, street2, city, state, pincode, house, place, district, _id } = req.body;

            let targetAddress;
            if (_id) {
                targetAddress = await AddressModel.findById(_id);
                if (!targetAddress) {
                    res.status(404).json({ success: false, message: 'Address not found' });
                    return;
                }
            } else {
                targetAddress = new AddressModel();
            }

            targetAddress.firstName = firstName || '';
            targetAddress.lastName = lastName || '';
            targetAddress.company = company || '';
            targetAddress.country = country || 'India';
            targetAddress.street1 = street1 || '';
            targetAddress.street2 = street2 || '';
            targetAddress.city = city || '';
            targetAddress.state = state || '';
            targetAddress.pincode = pincode || '';
            targetAddress.house = house || '';
            targetAddress.place = place || '';
            targetAddress.district = district || '';

            await targetAddress.save();

            if (!_id) {
                userDoc.address_ids.push(targetAddress._id as any);
                await userDoc.save();
            }

            res.status(200).json({
                success: true,
                message: 'Address saved successfully!',
                data: { address: targetAddress },
            });
        } catch (error: any) {
            console.error('Save Address Error:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    async getStates(req: Request, res: Response): Promise<void> {
        try {
            const states = await StateModel.find({ isActive: true }).select('name code').sort('name');
            res.status(200).json({
                success: true,
                data: { states }
            });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
}
