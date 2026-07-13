export interface IGetWalletUseCase {
    execute(userId: string): Promise<any>;
}
