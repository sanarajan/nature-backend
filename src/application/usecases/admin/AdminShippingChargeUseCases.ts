import { inject, injectable } from 'tsyringe';
import { IShippingChargeRepository } from '../../../domain/repositories/IShippingChargeRepository';
import { StateModel } from '../../../infrastructure/database/models/StateModel';
import { AppError } from '../../../shared/utils/AppError';
import { STATUS_CODES } from '../../../shared/constants/statusCodes';

@injectable()
export class GetShippingChargesUseCase {
    constructor(
        @inject('IShippingChargeRepository') private shippingChargeRepository: IShippingChargeRepository
    ) {}

    async execute() {
        return await this.shippingChargeRepository.findAllCharges();
    }
}

@injectable()
export class AddOrUpdateShippingChargeUseCase {
    constructor(
        @inject('IShippingChargeRepository') private shippingChargeRepository: IShippingChargeRepository
    ) {}

    async execute(data: any) {
        const { state, stateId, charge, isActive } = data;
        let shippingCharge = await this.shippingChargeRepository.findByStateId(stateId);

        if (shippingCharge) {
            shippingCharge = await this.shippingChargeRepository.updateCharge(stateId, { state, charge, isActive });
        } else {
            shippingCharge = await this.shippingChargeRepository.createCharge({
                state,
                stateId,
                charge,
                isActive: isActive !== undefined ? isActive : true
            });
        }
        return shippingCharge;
    }
}

@injectable()
export class DeleteShippingChargeUseCase {
    constructor(
        @inject('IShippingChargeRepository') private shippingChargeRepository: IShippingChargeRepository
    ) {}

    async execute(id: string) {
        const charge = await this.shippingChargeRepository.deleteCharge(id);
        if (!charge) {
            throw new AppError('Shipping charge not found', STATUS_CODES.NOT_FOUND);
        }
    }
}

@injectable()
export class GetStatesUseCase {
    async execute() {
        // Keeping StateModel here for simplicity, or ideally abstract to IStateRepository
        return await StateModel.find({ isActive: true }).sort({ name: 1 });
    }
}
