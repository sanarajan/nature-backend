export interface IVerifyEmailUseCase {
    execute(email: string, token: string | number): Promise<{ success: boolean; message: string }>;
}
