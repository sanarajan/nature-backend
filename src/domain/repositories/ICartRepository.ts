export interface ICartRepository {
    findByUserId(userId: string): Promise<any | null>;
    createCart(userId: string): Promise<any>;
    save(cart: any): Promise<any>;
}

export interface IWishlistRepository {
    findByUserId(userId: string): Promise<any | null>;
    createWishlist(userId: string): Promise<any>;
    save(wishlist: any): Promise<any>;
    findItem(userId: string, productId: string): Promise<any>;
    deleteItem(id: string): Promise<void>;
}
