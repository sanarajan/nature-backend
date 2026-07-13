import { inject, injectable } from 'tsyringe';
import { IShippingAgencyRepository } from '../../../domain/repositories/IShippingAgencyRepository';
import { AppError } from '../../../shared/utils/AppError';
import { STATUS_CODES } from '../../../shared/constants/statusCodes';

@injectable()
export class AddShippingAgencyUseCase {
    constructor(
        @inject('IShippingAgencyRepository') private shippingAgencyRepository: IShippingAgencyRepository
    ) {}

    async execute(data: any) {
        const { name, trackingUrlTemplate } = data;
        return await this.shippingAgencyRepository.createAgency({ name, trackingUrlTemplate });
    }
}

@injectable()
export class GetAllShippingAgenciesUseCase {
    constructor(
        @inject('IShippingAgencyRepository') private shippingAgencyRepository: IShippingAgencyRepository
    ) {}

    async execute() {
        return await this.shippingAgencyRepository.findAllAgencies();
    }
}

@injectable()
export class UpdateShippingAgencyUseCase {
    constructor(
        @inject('IShippingAgencyRepository') private shippingAgencyRepository: IShippingAgencyRepository
    ) {}

    async execute(id: string, data: any) {
        const { name, trackingUrlTemplate, isActive } = data;
        const agency = await this.shippingAgencyRepository.updateAgency(id, { name, trackingUrlTemplate, isActive });
        if (!agency) {
            throw new AppError('Shipping agency not found', STATUS_CODES.NOT_FOUND);
        }
        return agency;
    }
}

@injectable()
export class DeleteShippingAgencyUseCase {
    constructor(
        @inject('IShippingAgencyRepository') private shippingAgencyRepository: IShippingAgencyRepository
    ) {}

    async execute(id: string) {
        const agency = await this.shippingAgencyRepository.deleteAgency(id);
        if (!agency) {
            throw new AppError('Shipping agency not found', STATUS_CODES.NOT_FOUND);
        }
    }
}
