import { User } from '../../domain/entities/User';

export interface RegisterRequest {
    username: string;
    email: string;
    phoneNumber: string;
    password?: string;
    referralCode?: string;
}

export interface RegisterResponse {
    user: Omit<User, 'password'>;
    message: string;
}

export interface IRegisterUseCase {
    execute(data: RegisterRequest): Promise<RegisterResponse>;
}
