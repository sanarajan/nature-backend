import { container } from 'tsyringe';
import { LoginUseCase } from '../../application/usecases/LoginUseCase';
import { RegisterUseCase } from '../../application/usecases/RegisterUseCase';
import { VerifyEmailUseCase } from '../../application/usecases/VerifyEmailUseCase';
import { AuthService } from '../../application/services/AuthService';

// UseCases
container.registerSingleton<LoginUseCase>('ILoginUseCase', LoginUseCase);
container.registerSingleton<RegisterUseCase>('IRegisterUseCase', RegisterUseCase);
container.registerSingleton<VerifyEmailUseCase>('IVerifyEmailUseCase', VerifyEmailUseCase);

// Application Services
container.registerSingleton<AuthService>('IAuthService', AuthService);
