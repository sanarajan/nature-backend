export interface IShippingAgencyRepository {
    createAgency(data: any): Promise<any>;
    findAllAgencies(): Promise<any[]>;
    updateAgency(id: string, data: any): Promise<any>;
    deleteAgency(id: string): Promise<any>;
    findById(id: string): Promise<any>;
}
