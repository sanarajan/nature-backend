export interface IResetPasswordUseCase {
    execute(token: string, newPassword: string): Promise<{ message: string }>;
}
