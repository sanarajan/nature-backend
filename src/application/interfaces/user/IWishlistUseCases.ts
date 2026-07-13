export interface IToggleWishlistUseCase {
    execute(userId: string, productId: string): Promise<{ action: string }>;
}

export interface IGetWishlistUseCase {
    execute(userId: string): Promise<any[]>;
}

export interface ISyncWishlistUseCase {
    execute(userId: string, productIds: string[]): Promise<void>;
}
