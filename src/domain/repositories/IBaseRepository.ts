export interface IBaseRepository<T> {
    findAll(filter?: any): Promise<T[]>;
    findById(id: string): Promise<T | null>;
    findOne(filter: any): Promise<T | null>;
    save(item: T): Promise<T>;
    delete(id: string): Promise<void>;
}
