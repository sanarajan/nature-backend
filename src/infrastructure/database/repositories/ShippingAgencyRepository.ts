import { IShippingAgencyRepository } from '../../../domain/repositories/IShippingAgencyRepository';
import { ShippingAgencyModel } from '../models/ShippingAgencyModel';

export class ShippingAgencyRepository implements IShippingAgencyRepository {
    async createAgency(data: any): Promise<any> {
        const agency = new ShippingAgencyModel(data);
        return await agency.save();
    }

    async findAllAgencies(): Promise<any[]> {
        return await ShippingAgencyModel.find().sort({ createdAt: -1 });
    }

    async updateAgency(id: string, data: any): Promise<any> {
        return await ShippingAgencyModel.findByIdAndUpdate(id, data, { new: true });
    }

    async deleteAgency(id: string): Promise<any> {
        return await ShippingAgencyModel.findByIdAndDelete(id);
    }

    async findById(id: string): Promise<any> {
        return await ShippingAgencyModel.findById(id);
    }
}
