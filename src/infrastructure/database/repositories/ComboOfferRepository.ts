import { IComboOfferRepository } from '../../../domain/repositories/IComboOfferRepository';
import { ComboOfferModel } from '../models/ComboOfferModel';

export class ComboOfferRepository implements IComboOfferRepository {
    async createComboOffer(data: any): Promise<any> {
        const comboOffer = new ComboOfferModel(data);
        return await comboOffer.save();
    }

    async findComboOfferById(id: string): Promise<any> {
        return await ComboOfferModel.findById(id)
            .populate('products.productId', 'productName price sku stock categoryId isActive');
    }

    async findAllComboOffers(): Promise<any[]> {
        return await ComboOfferModel.find({ isDeleted: { $ne: true } })
            .populate('products.productId', 'productName price stock categoryId isActive')
            .sort({ createdAt: -1 });
    }

    async updateComboOffer(id: string, data: any): Promise<any> {
        const comboOffer = await ComboOfferModel.findById(id);
        if (!comboOffer) return null;

        // Operational fields
        if (data.offerName !== undefined) comboOffer.offerName = data.offerName;
        if (data.discountType !== undefined) comboOffer.discountType = data.discountType;
        if (data.discountValue !== undefined) comboOffer.discountValue = data.discountValue;
        if (data.startDate !== undefined) comboOffer.startDate = data.startDate;
        if (data.endDate !== undefined) comboOffer.endDate = data.endDate;
        if (data.maxUsagePerOrder !== undefined) comboOffer.maxUsagePerOrder = data.maxUsagePerOrder;
        if (data.status !== undefined) comboOffer.status = data.status;
        if (data.imageUrl !== undefined) comboOffer.imageUrl = data.imageUrl;
        if (data.products !== undefined) comboOffer.products = data.products;

        // Content fields
        if (data.subtitle !== undefined) comboOffer.subtitle = data.subtitle;
        if (data.tagline !== undefined) comboOffer.tagline = data.tagline;
        if (data.shortDescription !== undefined) comboOffer.shortDescription = data.shortDescription;
        if (data.overviewTitle !== undefined) comboOffer.overviewTitle = data.overviewTitle;
        if (data.overviewDescription !== undefined) comboOffer.overviewDescription = data.overviewDescription;
        if (data.routineLabel !== undefined) comboOffer.routineLabel = data.routineLabel;
        if (data.targetConcerns !== undefined) comboOffer.targetConcerns = data.targetConcerns;
        if (data.whySpecial !== undefined) comboOffer.whySpecial = data.whySpecial;
        if (data.howToUseSteps !== undefined) comboOffer.howToUseSteps = data.howToUseSteps;
        if (data.recommendedRoutine !== undefined) comboOffer.recommendedRoutine = data.recommendedRoutine;
        if (data.whoMayBenefit !== undefined) comboOffer.whoMayBenefit = data.whoMayBenefit;
        if (data.resultsAndExpectations !== undefined) comboOffer.resultsAndExpectations = data.resultsAndExpectations;
        if (data.safetyInformation !== undefined) comboOffer.safetyInformation = data.safetyInformation;
        if (data.patchTestGuidance !== undefined) comboOffer.patchTestGuidance = data.patchTestGuidance;
        if (data.storageInstructions !== undefined) comboOffer.storageInstructions = data.storageInstructions;
        if (data.disclaimer !== undefined) comboOffer.disclaimer = data.disclaimer;
        if (data.faqs !== undefined) comboOffer.faqs = data.faqs;

        // SEO & Display fields
        if (data.seoTitle !== undefined) comboOffer.seoTitle = data.seoTitle;
        if (data.metaDescription !== undefined) comboOffer.metaDescription = data.metaDescription;
        if (data.slug !== undefined) comboOffer.slug = data.slug;
        if (data.imageAltText !== undefined) comboOffer.imageAltText = data.imageAltText;
        if (data.productBadge !== undefined) comboOffer.productBadge = data.productBadge;
        if (data.promotionalBadge !== undefined) comboOffer.promotionalBadge = data.promotionalBadge;
        if (data.ctaLabel !== undefined) comboOffer.ctaLabel = data.ctaLabel;
        if (data.supportingCtaLabel !== undefined) comboOffer.supportingCtaLabel = data.supportingCtaLabel;

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
