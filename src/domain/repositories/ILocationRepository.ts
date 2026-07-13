export interface IAddressRepository {
    findById(id: string): Promise<any | null>;
    save(address: any): Promise<any>;
}

export interface IStateRepository {
    findActiveStates(): Promise<any[]>;
}
