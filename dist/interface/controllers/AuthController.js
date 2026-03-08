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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const tsyringe_1 = require("tsyringe");
const RegisterUseCase_1 = require("../../application/usecases/RegisterUseCase");
const VerifyEmailUseCase_1 = require("../../application/usecases/VerifyEmailUseCase");
const SuccessMessages_1 = require("../../constants/messages/SuccessMessages");
const AuthService_1 = require("../../application/services/AuthService");
const UserModel_1 = require("../../infrastructure/database/models/UserModel");
const AddressModel_1 = require("../../infrastructure/database/models/AddressModel");
const StateModel_1 = require("../../infrastructure/database/models/StateModel");
const cloudinary_1 = __importDefault(require("../../infrastructure/config/cloudinary"));
let AuthController = class AuthController {
    loginUseCase;
    registerUseCase;
    verifyEmailUseCase;
    authService;
    userRepository;
    constructor(loginUseCase, registerUseCase, verifyEmailUseCase, authService, userRepository) {
        this.loginUseCase = loginUseCase;
        this.registerUseCase = registerUseCase;
        this.verifyEmailUseCase = verifyEmailUseCase;
        this.authService = authService;
        this.userRepository = userRepository;
    }
    async register(req, res) {
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
        }
        catch (error) {
            console.error('Registration API Error:', error);
            res.status(400).json({
                success: false,
                message: error.message,
            });
        }
    }
    async login(req, res) {
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
                message: SuccessMessages_1.SuccessMessages.LOGIN_SUCCESS,
                data: {
                    user,
                    accessToken,
                },
            });
        }
        catch (error) {
            res.status(401).json({
                success: false,
                message: error.message,
            });
        }
    }
    async logout(req, res) {
        const prefix = req.baseUrl.includes('/admin') ? 'admin_' : 'user_';
        res.clearCookie(`${prefix}refreshToken`);
        res.clearCookie(`${prefix}jwt`);
        res.status(200).json({
            success: true,
            message: SuccessMessages_1.SuccessMessages.LOGOUT_SUCCESS,
        });
    }
    async verifyEmail(req, res) {
        const { email, token } = req.body;
        if (!email || !token) {
            res.status(400).json({ success: false, message: 'Email and token are required' });
            return;
        }
        try {
            const result = await this.verifyEmailUseCase.execute(email, token);
            res.status(200).json({
                success: true,
                message: result.message,
            });
        }
        catch (error) {
            console.error('Verify Email API Error:', error);
            res.status(400).json({
                success: false,
                message: error.message,
            });
        }
    }
    async refresh(req, res) {
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
        }
        catch (error) {
            console.error('Refresh Token Error:', error.message);
            res.status(401).json({ success: false, message: error.message || 'Invalid refresh token' });
        }
    }
    async getMe(req, res) {
        try {
            const payload = req.user;
            const fullUser = await this.userRepository.findById(payload.id);
            if (!fullUser) {
                res.status(404).json({ success: false, message: 'User not found' });
                return;
            }
            const { password: _, ...userWithoutPassword } = fullUser;
            res.status(200).json({
                success: true,
                data: { user: userWithoutPassword },
            });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
    async updateProfile(req, res) {
        try {
            const payload = req.user;
            const { username, password, avatar } = req.body;
            const userDoc = await UserModel_1.UserModel.findById(payload.id);
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
                const uploadRes = await cloudinary_1.default.uploader.upload(avatar, {
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
        }
        catch (error) {
            console.error('Update Profile Error:', error);
            res.status(500).json({ success: false, message: error.message || 'Server error updating profile' });
        }
    }
    async getUserAddresses(req, res) {
        try {
            const payload = req.user;
            const fullUser = await UserModel_1.UserModel.findById(payload.id).populate('address_ids');
            if (!fullUser) {
                res.status(404).json({ success: false, message: 'User not found' });
                return;
            }
            res.status(200).json({
                success: true,
                data: { addresses: fullUser.address_ids },
            });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
    async addOrUpdateAddress(req, res) {
        try {
            const payload = req.user;
            const userDoc = await UserModel_1.UserModel.findById(payload.id);
            if (!userDoc) {
                res.status(404).json({ success: false, message: 'User not found' });
                return;
            }
            const { firstName, lastName, company, country, street1, street2, city, state, pincode, house, place, district, _id } = req.body;
            let targetAddress;
            if (_id) {
                targetAddress = await AddressModel_1.AddressModel.findById(_id);
                if (!targetAddress) {
                    res.status(404).json({ success: false, message: 'Address not found' });
                    return;
                }
            }
            else {
                targetAddress = new AddressModel_1.AddressModel();
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
                userDoc.address_ids.push(targetAddress._id);
                await userDoc.save();
            }
            res.status(200).json({
                success: true,
                message: 'Address saved successfully!',
                data: { address: targetAddress },
            });
        }
        catch (error) {
            console.error('Save Address Error:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }
    async getStates(req, res) {
        try {
            const states = await StateModel_1.StateModel.find({ isActive: true }).select('name code').sort('name');
            res.status(200).json({
                success: true,
                data: { states }
            });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
};
exports.AuthController = AuthController;
exports.AuthController = AuthController = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)('ILoginUseCase')),
    __param(1, (0, tsyringe_1.inject)('RegisterUseCase')),
    __param(2, (0, tsyringe_1.inject)('VerifyEmailUseCase')),
    __param(3, (0, tsyringe_1.inject)('AuthService')),
    __param(4, (0, tsyringe_1.inject)('IUserRepository')),
    __metadata("design:paramtypes", [Object, RegisterUseCase_1.RegisterUseCase,
        VerifyEmailUseCase_1.VerifyEmailUseCase,
        AuthService_1.AuthService, Object])
], AuthController);
