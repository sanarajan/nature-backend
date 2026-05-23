import { container } from 'tsyringe';
import { UserRepository } from '../database/repositories/UserRepository';
import { EmailService } from '../services/EmailService';
import { JwtService } from '../services/JwtService';
import { PasswordService } from '../services/PasswordService';
import { RazorpayService } from '../services/RazorpayService';

// Repositories
container.registerSingleton<UserRepository>('IUserRepository', UserRepository);

// Services
container.registerSingleton<EmailService>('IEmailService', EmailService);
container.registerSingleton<JwtService>('IJwtService', JwtService);
container.registerSingleton<PasswordService>('IPasswordService', PasswordService);
container.registerSingleton<RazorpayService>('IRazorpayService', RazorpayService);
