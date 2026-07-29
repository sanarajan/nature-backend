import { injectable } from 'tsyringe';
import { IAddressRepository } from '../../../domain/repositories/IAddressRepository';
import { AddressModel } from '../models/AddressModel';

@injectable()
export class AddressRepository implements IAddressRepository {
    async createAddress(data: any): Promise<any> {
        const address = new AddressModel(data);
        return await address.save();
    }

    async findAddressById(id: string): Promise<any> {
        return await AddressModel.findById(id);
    }

    async findAddressesByUserId(userId: string): Promise<any[]> {
        return await AddressModel.find({ user: userId });
    }

    async updateAddress(id: string, data: any): Promise<any> {
        return await AddressModel.findByIdAndUpdate(id, data, { new: true });
    }

    async deleteAddress(id: string): Promise<any> {
        return await AddressModel.findByIdAndDelete(id);
    }

    async findById(id: string): Promise<any | null> {
        return await AddressModel.findById(id);
    }

    async save(addressData: any): Promise<any> {
        if (addressData._id) {
            return await AddressModel.findByIdAndUpdate(addressData._id, addressData, { new: true });
        } else {
            const address = new AddressModel(addressData);
            return await address.save();
        }
    }
}
