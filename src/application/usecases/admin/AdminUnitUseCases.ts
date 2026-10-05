import { inject, injectable } from 'tsyringe';
import { IUnitRepository } from '../../../domain/repositories/IUnitRepository';
import { IProductRepository } from '../../../domain/repositories/IProductRepository';
import { AppError } from '../../../shared/utils/AppError';
import { STATUS_CODES } from '../../../shared/constants/statusCodes';

@injectable()
export class AddUnitUseCase {
    constructor(
        @inject('IUnitRepository') private unitRepository: IUnitRepository
    ) {}

    async execute(data: { unitName: string }) {
        if (!data.unitName || data.unitName.trim() === '') {
            throw new AppError('Unit name is required', STATUS_CODES.BAD_REQUEST);
        }
        
        const trimmedName = data.unitName.trim();

        const existingUnit = await this.unitRepository.findByName(trimmedName);
        if (existingUnit) {
            throw new AppError('Unit name already exists', STATUS_CODES.BAD_REQUEST);
        }

        return await this.unitRepository.createUnit({
            unitName: trimmedName
        });
    }
}

@injectable()
export class GetAllUnitsUseCase {
    constructor(
        @inject('IUnitRepository') private unitRepository: IUnitRepository,
        @inject('IProductRepository') private productRepository: IProductRepository
    ) {}

    async execute() {
        const units = await this.unitRepository.findAllUnits();
        
        // Calculate isUsed dynamically for each unit
        const unitsWithUsage = await Promise.all(units.map(async (unit) => {
            const count = await this.productRepository.countByUnitId(unit._id.toString(), unit.unitName);
            return {
                ...(unit.toObject ? unit.toObject() : unit), // handle mongoose document or lean object
                isUsed: count > 0
            };
        }));

        return unitsWithUsage;
    }
}

@injectable()
export class GetUnitByIdUseCase {
    constructor(
        @inject('IUnitRepository') private unitRepository: IUnitRepository
    ) {}

    async execute(id: string) {
        const unit = await this.unitRepository.findById(id);
        if (!unit) {
            throw new AppError('Unit not found', STATUS_CODES.NOT_FOUND);
        }
        return unit;
    }
}

@injectable()
export class UpdateUnitUseCase {
    constructor(
        @inject('IUnitRepository') private unitRepository: IUnitRepository
    ) {}

    async execute(id: string, data: { unitName: string }) {
        if (!data.unitName || data.unitName.trim() === '') {
            throw new AppError('Unit name is required', STATUS_CODES.BAD_REQUEST);
        }

        const trimmedName = data.unitName.trim();

        const existingUnit = await this.unitRepository.findByNameExcludingId(trimmedName, id);
        if (existingUnit) {
            throw new AppError('Unit name already exists', STATUS_CODES.BAD_REQUEST);
        }

        const updatedUnit = await this.unitRepository.updateUnit(id, {
            unitName: trimmedName
        });

        if (!updatedUnit) {
            throw new AppError('Unit not found', STATUS_CODES.NOT_FOUND);
        }

        return updatedUnit;
    }
}

@injectable()
export class DeleteUnitUseCase {
    constructor(
        @inject('IUnitRepository') private unitRepository: IUnitRepository,
        @inject('IProductRepository') private productRepository: IProductRepository
    ) {}

    async execute(id: string) {
        // Find the unit first
        const unit = await this.unitRepository.findById(id);
        if (!unit) {
            throw new AppError('Unit not found', STATUS_CODES.NOT_FOUND);
        }

        // Check if the unit is used in any product
        const count = await this.productRepository.countByUnitId(id, unit.unitName);
        if (count > 0) {
            throw new AppError('This unit is currently used by one or more products and cannot be deleted.', STATUS_CODES.BAD_REQUEST);
        }

        // Delete if not used
        const deletedUnit = await this.unitRepository.deleteUnit(id);
        if (!deletedUnit) {
            throw new AppError('Unit not found', STATUS_CODES.NOT_FOUND);
        }

        return deletedUnit;
    }
}
