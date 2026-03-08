import jwt from 'jsonwebtoken';
import { injectable } from 'tsyringe';
import dotenv from 'dotenv';

dotenv.config();

@injectable()
export class JwtService {
    private readonly accessSecret = process.env.JWT_ACCESS_SECRET || 'access_secret';
    private readonly refreshSecret = process.env.JWT_REFRESH_SECRET || 'refresh_secret';

    generateAccessToken(payload: any): string {
        return jwt.sign(payload, this.accessSecret, { expiresIn: '15m' });
    }

    generateRefreshToken(payload: any): string {
        return jwt.sign(payload, this.refreshSecret, { expiresIn: '7d' });
    }

    verifyAccessToken(token: string): any {
        return jwt.verify(token, this.accessSecret);
    }

    verifyRefreshToken(token: string): any {
        return jwt.verify(token, this.refreshSecret);
    }
}
