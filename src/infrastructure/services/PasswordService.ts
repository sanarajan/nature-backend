import bcrypt from 'bcryptjs';
import { injectable } from 'tsyringe';
import { IPasswordService } from '../../domain/services/IPasswordService';

@injectable()
export class PasswordService implements IPasswordService {
    async hash(password: string): Promise<string> {
        const salt = await bcrypt.genSalt(10);
        return bcrypt.hash(password, salt);
    }

    async compare(password: string, hashed: string): Promise<boolean> {
        return bcrypt.compare(password, hashed);
    }
}
