import { inject, injectable } from 'tsyringe';
import { ILoginUseCase, LoginResponse } from '../interfaces/ILoginUseCase';
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { PasswordService } from '../../infrastructure/services/PasswordService';
import { JwtService } from '../../infrastructure/services/JwtService';
import { ErrorMessages } from '../../constants/messages/ErrorMessages';
import { UserRole } from '../../constants/enums/UserRole';

@injectable()
export class LoginUseCase implements ILoginUseCase {
    constructor(
        @inject('IUserRepository') private userRepository: IUserRepository,
        private passwordService: PasswordService,
        private jwtService: JwtService
    ) { }

    async execute(email: string, password: string): Promise<LoginResponse> {
        const user = await this.userRepository.findByEmail(email);

        if (!user || !user.password) {
            throw new Error(ErrorMessages.INVALID_CREDENTIALS);
        }

        if (user.verified === false && user.role !== UserRole.ADMIN) {
            throw new Error('Please verify your email address before logging in.');
        }

        const isPasswordValid = await this.passwordService.compare(password, user.password);

        if (!isPasswordValid) {
            throw new Error(ErrorMessages.INVALID_CREDENTIALS);
        }

        const payload = { id: user.id, email: user.email, role: user.role };
        const accessToken = this.jwtService.generateAccessToken(payload);
        const refreshToken = this.jwtService.generateRefreshToken(payload);

        // Remove password before returning
        const { password: _, ...userWithoutPassword } = user;

        return {
            user: userWithoutPassword as any,
            accessToken,
            refreshToken,
        };
    }
}
