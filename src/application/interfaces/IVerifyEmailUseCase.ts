export interface IVerifyEmailUseCase {
    execute(email: string, token: string): Promise<{ success: boolean; message: string }>;
}
