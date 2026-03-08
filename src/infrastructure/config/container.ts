import 'reflect-metadata';
import { container } from 'tsyringe';
import { UserRepository } from '../database/repositories/UserRepository';
import { LoginUseCase } from '../../application/usecases/LoginUseCase';
import { RegisterUseCase } from '../../application/usecases/RegisterUseCase';
import { VerifyEmailUseCase } from '../../application/usecases/VerifyEmailUseCase';
import { AuthService } from '../../application/services/AuthService';
import { EmailService } from '../services/EmailService';

// Infrastructure
container.registerSingleton<UserRepository>('IUserRepository', UserRepository);
container.registerSingleton<EmailService>('EmailService', EmailService);

// Application
container.registerSingleton<LoginUseCase>('ILoginUseCase', LoginUseCase);
container.registerSingleton<RegisterUseCase>('RegisterUseCase', RegisterUseCase);
container.registerSingleton<VerifyEmailUseCase>('VerifyEmailUseCase', VerifyEmailUseCase);
container.registerSingleton<AuthService>('AuthService', AuthService);

export { container };
