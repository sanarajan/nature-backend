import { IOfferRepository } from '../../../domain/repositories/IOfferRepository';
import { OfferModel } from '../models/OfferModel';

export class OfferRepository implements IOfferRepository {
    async createOffer(data: any): Promise<any> {
        const offer = new OfferModel(data);
        return await offer.save();
    }

    async findOfferById(id: string): Promise<any> {
        return await OfferModel.findById(id);
    }

    async findAllOffers(): Promise<any[]> {
        return await OfferModel.find({ isDeleted: { $ne: true } })
            .populate('productId', 'productName price')
            .populate('categoryId', 'categoryName')
            .sort({ createdAt: -1 });
    }

    async updateOffer(id: string, data: any): Promise<any> {
        return await OfferModel.findOneAndUpdate(
            { _id: id, isDeleted: { $ne: true } },
            data,
            { new: true }
        );
    }

    async deleteOffer(id: string): Promise<void> {
        const offer = await OfferModel.findById(id);
        if (offer) {
            offer.isDeleted = true;
            await offer.save();
        }
    }

    async toggleOfferStatus(id: string): Promise<any> {
        const offer = await OfferModel.findById(id);
        if (offer) {
            offer.status = !offer.status;
            return await offer.save();
        }
        return null;
    }
}
