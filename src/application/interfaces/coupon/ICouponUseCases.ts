export interface IGetActiveCouponsUseCase {
    execute(): Promise<any[]>;
}

export interface IValidateCouponUseCase {
    execute(code: string, purchaseAmount: number): Promise<any>;
}
