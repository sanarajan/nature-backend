import { IComboOfferRepository } from '../../../domain/repositories/IComboOfferRepository';
import { ComboOfferModel } from '../models/ComboOfferModel';

export class ComboOfferRepository implements IComboOfferRepository {
    async createComboOffer(data: any): Promise<any> {
        const comboOffer = new ComboOfferModel(data);
        return await comboOffer.save();
    }

    async findComboOfferById(id: string): Promise<any> {
        return await ComboOfferModel.findById(id);
    }

    async findAllComboOffers(): Promise<any[]> {
        return await ComboOfferModel.find({ isDeleted: { $ne: true } })
            .populate('products.productId', 'productName price')
            .sort({ createdAt: -1 });
    }

    async updateComboOffer(id: string, data: any): Promise<any> {
        const comboOffer = await ComboOfferModel.findById(id);
        if (!comboOffer) return null;

        if (data.offerName !== undefined) comboOffer.offerName = data.offerName;
        if (data.discountType !== undefined) comboOffer.discountType = data.discountType;
        if (data.discountValue !== undefined) comboOffer.discountValue = data.discountValue;
        if (data.startDate !== undefined) comboOffer.startDate = data.startDate;
        if (data.endDate !== undefined) comboOffer.endDate = data.endDate;
        if (data.maxUsagePerOrder !== undefined) comboOffer.maxUsagePerOrder = data.maxUsagePerOrder;
        if (data.status !== undefined) comboOffer.status = data.status;
        if (data.imageUrl !== undefined) comboOffer.imageUrl = data.imageUrl;
        if (data.products !== undefined) comboOffer.products = data.products;

        return await comboOffer.save();
    }

    async deleteComboOffer(id: string): Promise<void> {
        const offer = await ComboOfferModel.findById(id);
        if (offer) {
            offer.isDeleted = true;
            await offer.save();
        }
    }

    async toggleComboOfferStatus(id: string): Promise<any> {
        const offer = await ComboOfferModel.findById(id);
        if (offer) {
            offer.status = !offer.status;
            return await offer.save();
        }
        return null;
    }
}
