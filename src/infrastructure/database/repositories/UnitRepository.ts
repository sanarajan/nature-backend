import { IUnitRepository } from '../../../domain/repositories/IUnitRepository';
import { UnitModel } from '../models/UnitModel';

export class UnitRepository implements IUnitRepository {
    async findAllUnits(): Promise<any[]> {
        return await UnitModel.find().select('unitName _id');
    }
}
