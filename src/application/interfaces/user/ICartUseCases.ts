export interface IGetCartUseCase {
    execute(userId: string, influencerRef?: string): Promise<any>;
}

export interface IToggleCartItemUseCase {
    execute(userId: string, productId: string, quantity: number, influencerRef?: string): Promise<any>;
}

export interface IUpdateCartItemQuantityUseCase {
    execute(userId: string, productId: string, quantity: number, influencerRef?: string): Promise<any>;
}

export interface IRemoveCartItemUseCase {
    execute(userId: string, productId: string, influencerRef?: string): Promise<any>;
}

export interface ISyncOfflineCartUseCase {
    execute(userId: string, cartItems: any[], influencerRef?: string): Promise<any>;
}

export interface ICalculateCartTotalsUseCase {
    execute(products: any[]): Promise<any>;
}
