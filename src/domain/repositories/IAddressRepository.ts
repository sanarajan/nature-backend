export interface IAddressRepository {
    createAddress(data: any): Promise<any>;
    findAddressById(id: string): Promise<any>;
    findAddressesByUserId(userId: string): Promise<any[]>;
    updateAddress(id: string, data: any): Promise<any>;
    deleteAddress(id: string): Promise<any>;
}
