export interface IGetMeUseCase {
    execute(userId: string): Promise<any>;
}

export interface IUpdateProfileUseCase {
    execute(userId: string, data: { username?: string; password?: string; avatar?: string }): Promise<any>;
}

export interface IGetUserAddressesUseCase {
    execute(userId: string): Promise<any>;
}

export interface IAddOrUpdateAddressUseCase {
    execute(userId: string, addressData: any): Promise<any>;
}

export interface IGetStatesUseCase {
    execute(): Promise<any>;
}
