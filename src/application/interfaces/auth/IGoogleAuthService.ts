export interface GoogleTokenPayload {
    googleId: string;
    email: string;
    name: string;
    picture?: string;
}

export interface IGoogleAuthService {
    verifyGoogleToken(token: string): Promise<GoogleTokenPayload>;
}
