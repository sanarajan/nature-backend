export interface IAddCouponUseCase {
    execute(data: any): Promise<any>;
}

export interface IGetAllCouponsUseCase {
    execute(): Promise<any[]>;
}

export interface IGetCouponByIdUseCase {
    execute(id: string): Promise<any>;
}

export interface IUpdateCouponUseCase {
    execute(id: string, data: any): Promise<any>;
}

export interface IDeleteCouponUseCase {
    execute(id: string): Promise<void>;
}

export interface IToggleCouponStatusUseCase {
    execute(id: string): Promise<any>;
}
