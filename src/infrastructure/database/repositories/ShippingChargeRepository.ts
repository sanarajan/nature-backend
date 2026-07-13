import { IShippingChargeRepository } from '../../../domain/repositories/IShippingChargeRepository';
import { ShippingChargeModel } from '../models/ShippingChargeModel';

export class ShippingChargeRepository implements IShippingChargeRepository {
    async findByStateId(stateId: string): Promise<any> {
        return await ShippingChargeModel.findOne({ stateId });
    }

    async findAllCharges(): Promise<any[]> {
        return await ShippingChargeModel.find().populate('stateId').sort({ state: 1 });
    }

    async createCharge(data: any): Promise<any> {
        const charge = new ShippingChargeModel(data);
        return await charge.save();
    }

    async updateCharge(stateId: string, data: any): Promise<any> {
        const charge = await ShippingChargeModel.findOne({ stateId });
        if (charge) {
            if (data.state !== undefined) charge.state = data.state;
            if (data.charge !== undefined) charge.charge = data.charge;
            if (data.isActive !== undefined) charge.isActive = data.isActive;
            return await charge.save();
        }
        return null;
    }

    async deleteCharge(id: string): Promise<any> {
        return await ShippingChargeModel.findByIdAndDelete(id);
    }
}
