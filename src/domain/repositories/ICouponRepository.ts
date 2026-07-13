export interface ICouponRepository {
    findActiveCoupons(currentDate: Date): Promise<any[]>;
    findActiveCouponByCode(code: string, currentDate: Date): Promise<any | null>;
    findAll(): Promise<any[]>;
    findById(id: string): Promise<any | null>;
    findByName(name: string): Promise<any | null>;
    findByNameExcludeId(name: string, excludeId: string): Promise<any | null>;
    save(coupon: any): Promise<any>;
    create(couponData: any): Promise<any>;
    deleteById(id: string): Promise<any | null>;
}
