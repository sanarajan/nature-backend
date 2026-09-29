import 'reflect-metadata';
import { SharedPricingService } from './SharedPricingService';
import { ComboOfferModel } from '../../infrastructure/database/models/ComboOfferModel';
import { OfferModel } from '../../infrastructure/database/models/OfferModel';
import { InfluencerSettingModel } from '../../infrastructure/database/models/InfluencerSettingModel';
import { LoyaltySettingModel } from '../../infrastructure/database/models/LoyaltySettingModel';

// Basic mocking to bypass DB
ComboOfferModel.find = (() => ({
    populate: () => Promise.resolve([
        {
            _id: 'combo1',
            offerName: 'Combo A',
            status: true,
            startDate: new Date(0),
            endDate: new Date(Date.now() + 100000),
            discountType: 'flat',
            discountValue: 100,
            products: [
                {
                    productId: { _id: 'p1', price: 500 },
                    requiredQuantity: 1
                },
                {
                    productId: { _id: 'p2', price: 300 },
                    requiredQuantity: 1
                }
            ]
        }
    ])
})) as any;

OfferModel.find = (() => Promise.resolve([])) as any;
InfluencerSettingModel.findOne = (() => Promise.resolve({ influencerEnabled: false })) as any;
LoyaltySettingModel.findOne = (() => Promise.resolve(null)) as any;

const runTest = async () => {
    try {
        const service = new SharedPricingService();
        
        const cart: any = {
            products: [
                {
                    product: { _id: 'p1', price: 500 },
                    quantity: 2
                },
                {
                    product: { _id: 'p2', price: 300 },
                    quantity: 1
                },
                {
                    product: { _id: 'p3', price: 200 },
                    quantity: 1
                }
            ]
        };

        const result = await service.calculate(cart, {});

        // Assertions for Phase 3
        if (!result.appliedComboOffer) throw new Error('Legacy appliedComboOffer is missing');
        if (result.appliedComboOffer._id !== 'combo1') throw new Error('Legacy appliedComboOffer has wrong ID');
        
        if (!Array.isArray(result.appliedComboOffers)) throw new Error('New appliedComboOffers is not an array');
        if (result.appliedComboOffers.length !== 1) throw new Error('New appliedComboOffers should have 1 item');
        if (result.appliedComboOffers[0].offerId !== 'combo1') throw new Error('New array item has wrong ID');
        if (result.appliedComboOffers[0].applications !== 1) throw new Error('New array item has wrong applications');
        if (result.appliedComboOffers[0].discountAmount !== 100) throw new Error('New array item has wrong discount');

        const p1ComboPart = result.products.find((p: any) => p.product._id === 'p1' && p.isComboItem);
        if (!p1ComboPart) throw new Error('Combo part of p1 missing');
        if (!Array.isArray(p1ComboPart.comboAllocations)) throw new Error('comboAllocations missing on p1');
        if (p1ComboPart.comboAllocations.length !== 1) throw new Error('comboAllocations should have 1 item');
        if (p1ComboPart.comboAllocations[0].comboOfferId !== 'combo1') throw new Error('comboAllocations has wrong ID');
        if (p1ComboPart.comboAllocations[0].quantity !== 1) throw new Error('comboAllocations has wrong quantity');
        if (typeof p1ComboPart.comboAllocations[0].discountAmount !== 'number') throw new Error('comboAllocations missing discount share');

        const p1LeftoverPart = result.products.find((p: any) => p.product._id === 'p1' && !p.isComboItem);
        if (!p1LeftoverPart) throw new Error('Leftover part of p1 missing');
        if (!Array.isArray(p1LeftoverPart.comboAllocations) || p1LeftoverPart.comboAllocations.length !== 0) throw new Error('Leftover part should have empty comboAllocations');

        console.log('[PASS] Phase 3 Backward Compatibility Tests Passed');
    } catch (e: any) {
        console.error('[FAIL] Phase 3 Backward Compatibility Tests Failed');
        console.error(e);
        process.exit(1);
    }
};

runTest();
