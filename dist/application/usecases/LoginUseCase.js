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
exports.LoginUseCase = void 0;
const tsyringe_1 = require("tsyringe");
const PasswordService_1 = require("../../infrastructure/services/PasswordService");
const JwtService_1 = require("../../infrastructure/services/JwtService");
const ErrorMessages_1 = require("../../constants/messages/ErrorMessages");
const UserRole_1 = require("../../constants/enums/UserRole");
let LoginUseCase = class LoginUseCase {
    userRepository;
    passwordService;
    jwtService;
    constructor(userRepository, passwordService, jwtService) {
        this.userRepository = userRepository;
        this.passwordService = passwordService;
        this.jwtService = jwtService;
    }
    async execute(email, password) {
        const user = await this.userRepository.findByEmail(email);
        if (!user || !user.password) {
            throw new Error(ErrorMessages_1.ErrorMessages.INVALID_CREDENTIALS);
        }
        if (user.verified === false && user.role !== UserRole_1.UserRole.ADMIN) {
            throw new Error('Please verify your email address before logging in.');
        }
        const isPasswordValid = await this.passwordService.compare(password, user.password);
        if (!isPasswordValid) {
            throw new Error(ErrorMessages_1.ErrorMessages.INVALID_CREDENTIALS);
        }
        const payload = { id: user.id, email: user.email, role: user.role };
        const accessToken = this.jwtService.generateAccessToken(payload);
        const refreshToken = this.jwtService.generateRefreshToken(payload);
        // Remove password before returning
        const { password: _, ...userWithoutPassword } = user;
        return {
            user: userWithoutPassword,
            accessToken,
            refreshToken,
        };
    }
};
exports.LoginUseCase = LoginUseCase;
exports.LoginUseCase = LoginUseCase = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)('IUserRepository')),
    __metadata("design:paramtypes", [Object, PasswordService_1.PasswordService,
        JwtService_1.JwtService])
], LoginUseCase);
