export interface IAddressRepository {
    findById(id: string): Promise<any | null>;
    save(address: any): Promise<any>;
    createAddress?(data: any): Promise<any>;
    findAddressById?(id: string): Promise<any>;
    findAddressesByUserId?(userId: string): Promise<any[]>;
    updateAddress?(id: string, data: any): Promise<any>;
    deleteAddress?(id: string): Promise<any>;
}

export interface IStateRepository {
    findActiveStates(): Promise<any[]>;
}
