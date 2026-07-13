import { injectable } from 'tsyringe';
import { IAddressRepository, IStateRepository } from '../../../domain/repositories/ILocationRepository';
import { AddressModel } from '../models/AddressModel';
import { StateModel } from '../models/StateModel';

@injectable()
export class AddressRepository implements IAddressRepository {
    async findById(id: string): Promise<any | null> {
        return AddressModel.findById(id).exec();
    }

    async save(addressData: any): Promise<any> {
        if (addressData._id) {
            return AddressModel.findByIdAndUpdate(addressData._id, addressData, { new: true }).exec();
        } else {
            const newAddress = new AddressModel(addressData);
            return newAddress.save();
        }
    }
}

@injectable()
export class StateRepository implements IStateRepository {
    async findActiveStates(): Promise<any[]> {
        return StateModel.find({ isActive: true }).select('name code').sort('name').exec();
    }
}
