import { injectable } from 'tsyringe';
import { OAuth2Client } from 'google-auth-library';
import { IGoogleAuthService, GoogleTokenPayload } from '../interfaces/auth/IGoogleAuthService';
import { env } from '../../shared/config/env';

@injectable()
export class GoogleAuthService implements IGoogleAuthService {
    private client: OAuth2Client;

    constructor() {
        const clientId = env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
        this.client = new OAuth2Client(clientId);
    }

    async verifyGoogleToken(token: string): Promise<GoogleTokenPayload> {
        const clientId = env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
        if (!clientId) {
            throw new Error('GOOGLE_CLIENT_ID is not configured on the server');
        }

        try {
            const ticket = await this.client.verifyIdToken({
                idToken: token,
                audience: clientId,
            });

            const payload = ticket.getPayload();
            if (!payload || !payload.email) {
                throw new Error('Invalid Google token: email address missing');
            }

            return {
                googleId: payload.sub,
                email: payload.email,
                name: payload.name || payload.given_name || payload.email.split('@')[0],
                picture: payload.picture,
            };
        } catch (error: any) {
            throw new Error(error.message || 'Failed to verify Google token');
        }
    }
}
