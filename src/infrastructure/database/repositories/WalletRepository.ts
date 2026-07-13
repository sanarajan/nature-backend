import { injectable } from 'tsyringe';
import { IWalletRepository } from '../../../domain/repositories/IWalletRepository';
import { WalletModel } from '../models/WalletModel';

@injectable()
export class WalletRepository implements IWalletRepository {
    async findByUserId(userId: string): Promise<any | null> {
        return WalletModel.findOne({ userId }).exec();
    }
}
