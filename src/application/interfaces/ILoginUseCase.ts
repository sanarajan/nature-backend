import { User } from '../../domain/entities/User';

export interface LoginResponse {
    user: User;
    accessToken: string;
    refreshToken: string;
}

export interface ILoginUseCase {
    execute(email: string, password: string): Promise<LoginResponse>;
}
