export interface IJwtService {
    generateAccessToken(payload: any): string;
    generateRefreshToken(payload: any): string;
    verifyAccessToken(token: string): any;
    verifyRefreshToken(token: string): any;
}
