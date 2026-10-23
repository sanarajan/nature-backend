export interface IResendOtpUseCase {
    execute(email: string): Promise<{ success: boolean; message: string; resendCount: number }>;
}
