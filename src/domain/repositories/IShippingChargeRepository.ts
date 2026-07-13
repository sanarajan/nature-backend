export interface IShippingChargeRepository {
    findByStateId(stateId: string): Promise<any>;
    findAllCharges(): Promise<any[]>;
    createCharge(data: any): Promise<any>;
    updateCharge(stateId: string, data: any): Promise<any>;
    deleteCharge(id: string): Promise<any>;
}
