import { inject, injectable } from 'tsyringe';
import { IGetWalletUseCase } from '../../interfaces/user/IWalletUseCases';
import { IWalletRepository } from '../../../domain/repositories/IWalletRepository';
import { NotFoundError } from '../../../shared/utils/AppError';

@injectable()
export class GetWalletUseCase implements IGetWalletUseCase {
    constructor(@inject('IWalletRepository') private walletRepository: IWalletRepository) {}

    async execute(userId: string): Promise<any> {
        const wallet = await this.walletRepository.findByUserId(userId);
        if (!wallet) {
            throw new NotFoundError('Wallet not found');
        }
        return wallet;
    }
}
