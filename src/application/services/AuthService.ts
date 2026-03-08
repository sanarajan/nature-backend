import { inject, injectable } from 'tsyringe';
import { JwtService } from '../../infrastructure/services/JwtService';

@injectable()
export class AuthService {
    constructor(
        private jwtService: JwtService
    ) { }

    async verifyAccessToken(token: string): Promise<any> {
        try {
            return this.jwtService.verifyAccessToken(token);
        } catch (error: any) {
            throw new Error(error.message || 'Access token invalid or expired');
        }
    }

    async verifyRefreshToken(token: string): Promise<any> {
        try {
            return this.jwtService.verifyRefreshToken(token);
        } catch (error: any) {
            throw new Error(error.message || 'Refresh token invalid or expired');
        }
    }

    generateTokens(payload: any) {
        const accessToken = this.jwtService.generateAccessToken(payload);
        const refreshToken = this.jwtService.generateRefreshToken(payload);
        return { accessToken, refreshToken };
    }
}
