export interface IAuthService {
    verifyAccessToken(token: string): Promise<any>;
    verifyRefreshToken(token: string): Promise<any>;
    generateTokens(payload: any): { accessToken: string, refreshToken: string };
}
