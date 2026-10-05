export interface IUnitRepository {
    findAllUnits(): Promise<any[]>;
    findById(id: string): Promise<any | null>;
    createUnit(data: { unitName: string }): Promise<any>;
    updateUnit(id: string, data: { unitName: string }): Promise<any | null>;
    deleteUnit(id: string): Promise<any | null>;
    findByName(unitName: string): Promise<any | null>;
    findByNameExcludingId(unitName: string, excludeId: string): Promise<any | null>;
}
