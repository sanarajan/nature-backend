import bcrypt from 'bcryptjs';
import { injectable } from 'tsyringe';

@injectable()
export class PasswordService {
    async hash(password: string): Promise<string> {
        const salt = await bcrypt.genSalt(10);
        return bcrypt.hash(password, salt);
    }

    async compare(password: string, hashed: string): Promise<boolean> {
        return bcrypt.compare(password, hashed);
    }
}
