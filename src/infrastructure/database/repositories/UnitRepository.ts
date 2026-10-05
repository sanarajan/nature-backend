import { IUnitRepository } from '../../../domain/repositories/IUnitRepository';
import { UnitModel } from '../models/UnitModel';

export class UnitRepository implements IUnitRepository {
    async findAllUnits(): Promise<any[]> {
        return await UnitModel.find().select('unitName _id');
    }

    async findById(id: string): Promise<any | null> {
        return await UnitModel.findById(id);
    }

    async createUnit(data: { unitName: string }): Promise<any> {
        const unit = new UnitModel(data);
        return await unit.save();
    }

    async updateUnit(id: string, data: { unitName: string }): Promise<any | null> {
        return await UnitModel.findByIdAndUpdate(id, data, { new: true });
    }

    async deleteUnit(id: string): Promise<any | null> {
        return await UnitModel.findByIdAndDelete(id);
    }

    async findByName(unitName: string): Promise<any | null> {
        // Case insensitive search
        return await UnitModel.findOne({ unitName: { $regex: new RegExp(`^${unitName}$`, 'i') } });
    }

    async findByNameExcludingId(unitName: string, excludeId: string): Promise<any | null> {
        return await UnitModel.findOne({ 
            unitName: { $regex: new RegExp(`^${unitName}$`, 'i') },
            _id: { $ne: excludeId }
        });
    }
}
