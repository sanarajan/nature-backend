import { LoginResponse } from './ILoginUseCase';

export interface IGoogleAuthUseCase {
    execute(credential: string): Promise<LoginResponse>;
}
