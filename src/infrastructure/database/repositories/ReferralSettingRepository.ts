import { injectable } from 'tsyringe';
import { IReferralSettingRepository } from '../../../domain/repositories/IReferralSettingRepository';
import { ReferralSettingModel } from '../models/ReferralSettingModel';

@injectable()
export class ReferralSettingRepository implements IReferralSettingRepository {
    async getActiveSetting(): Promise<any> {
        return await ReferralSettingModel.findOne({ isActive: true });
    }
}
