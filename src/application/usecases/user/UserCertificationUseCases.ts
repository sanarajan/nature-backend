import { inject, injectable } from 'tsyringe';
import { ICertificationRepository } from '../../../domain/repositories/ICertificationRepository';
import { AppError } from '../../../shared/utils/AppError';
import { STATUS_CODES } from '../../../shared/constants/statusCodes';

@injectable()
export class UserCertificationUseCases {
    constructor(
        @inject('ICertificationRepository') private certificationRepository: ICertificationRepository
    ) {}

    async getAllCertifications() {
        return await this.certificationRepository.findAll();
    }
}
