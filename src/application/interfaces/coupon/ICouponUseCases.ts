export interface IGetActiveCouponsUseCase {
    execute(userId?: string): Promise<any[]>;
}

export interface IValidateCouponUseCase {
    execute(code: string, purchaseAmount: number, userId: string): Promise<any>;
}
