export interface IWalletRepository {
    findByUserId(userId: string): Promise<any | null>;
}
