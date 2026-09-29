import 'reflect-metadata';
import { SharedPricingService } from './SharedPricingService';
import { ComboOfferModel } from '../../infrastructure/database/models/ComboOfferModel';
import { OfferModel } from '../../infrastructure/database/models/OfferModel';

const assertEqual = (actual: any, expected: any, msg: string) => {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(msg + "\\nExpected: " + JSON.stringify(expected, null, 2) + "\\nActual: " + JSON.stringify(actual, null, 2));
    }
};

const runTest = async (name: string, fn: () => Promise<void>) => {
    try {
        await fn();
        console.log("[PASS] " + name);
    } catch (e: any) {
        console.error("[FAIL] " + name);
        console.error(e.message);
        process.exit(1);
    }
};

const createCart = (items: { id: string, qty: number, price: number }[]) => {
    return {
        products: items.map(item => ({
            product: { _id: item.id, price: item.price },
            quantity: item.qty
        }))
    };
};

const createCombo = (
    id: string, 
    discountType: string, 
    discountValue: number, 
    maxUsage: number | null | undefined, 
    items: { id: string, qty: number, price: number }[]
) => {
    return {
        _id: id,
        offerName: "Combo " + id,
        status: true,
        startDate: new Date(Date.now() - 10000),
        endDate: new Date(Date.now() + 100000),
        discountType,
        discountValue,
        maxUsagePerOrder: maxUsage,
        products: items.map(item => ({
            productId: { _id: item.id, price: item.price, toString: () => item.id },
            requiredQuantity: item.qty
        }))
    };
};

const createOffer = (
    id: string,
    offerFor: string,
    targetId: string,
    discountType: string,
    discountValue: number
) => {
    return {
        _id: id,
        offerName: "Offer " + id,
        offerFor,
        productId: offerFor === 'product' ? targetId : null,
        categoryId: offerFor === 'category' ? targetId : null,
        status: true,
        startDate: new Date(Date.now() - 10000),
        endDate: new Date(Date.now() + 100000),
        discountType,
        discountValue
    };
};

import { InfluencerSettingModel } from '../../infrastructure/database/models/InfluencerSettingModel';
import { ReferralSettingModel } from '../../infrastructure/database/models/ReferralSettingModel';
import { LoyaltySettingModel } from '../../infrastructure/database/models/LoyaltySettingModel';

let mockOffers: any[] = [];
OfferModel.find = (() => Promise.resolve(mockOffers)) as any;
InfluencerSettingModel.findOne = (() => Promise.resolve(null)) as any;
ReferralSettingModel.findOne = (() => Promise.resolve(null)) as any;
LoyaltySettingModel.findOne = (() => Promise.resolve(null)) as any;
let mockCombos: any[] = [];
ComboOfferModel.find = (() => ({
    populate: () => Promise.resolve(mockCombos)
})) as any;

const service = new SharedPricingService();

const runAll = async () => {

    await runTest('TEST M1 — Legacy Mode Default', async () => {
        process.env.ENABLE_MULTI_COMBO_PRICING = 'false';
        mockCombos = [
            createCombo('c1', 'flat', 10, null, [{ id: 'p1', qty: 1, price: 100 }]),
            createCombo('c2', 'flat', 20, null, [{ id: 'p2', qty: 1, price: 100 }])
        ];
        mockOffers = [];
        const cart = createCart([{ id: 'p1', qty: 1, price: 100 }, { id: 'p2', qty: 1, price: 100 }]);
        const result = await service.calculate(cart, {});
        
        assertEqual(result.appliedComboOffers.length, 1, 'Legacy should pick only 1 combo (c2 is better)');
        assertEqual(result.pricing.totalDiscount, 20, 'Legacy should have 20 discount');
    });

    await runTest('TEST M2 — Multi Mode Activation', async () => {
        process.env.ENABLE_MULTI_COMBO_PRICING = 'true';
        mockCombos = [
            createCombo('c1', 'flat', 10, null, [{ id: 'p1', qty: 1, price: 100 }]),
            createCombo('c2', 'flat', 20, null, [{ id: 'p2', qty: 1, price: 100 }])
        ];
        mockOffers = [];
        const cart = createCart([{ id: 'p1', qty: 1, price: 100 }, { id: 'p2', qty: 1, price: 100 }]);
        const result = await service.calculate(cart, {});
        
        assertEqual(result.appliedComboOffers.length, 2, 'Multi mode should pick both combos');
        assertEqual(result.pricing.totalDiscount, 30, 'Multi mode should have 30 discount');
        assertEqual(result.pricing.comboDiscount, 30, 'Combo discount should be 30');
    });

    await runTest('TEST M3 — Leftovers get Individual Offers', async () => {
        process.env.ENABLE_MULTI_COMBO_PRICING = 'true';
        mockCombos = [
            // M3 FIX: maxUsagePerOrder: 1 so it leaves 1 for leftover
            createCombo('c1', 'flat', 10, 1, [{ id: 'p1', qty: 1, price: 100 }])
        ];
        mockOffers = [
            createOffer('o1', 'product', 'p1', 'flat', 20)
        ];
        // We have 2 of p1. Combo takes 1, leaving 1 for the product offer.
        const cart = createCart([{ id: 'p1', qty: 2, price: 100 }]);
        const result = await service.calculate(cart, {});
        
        assertEqual(result.appliedComboOffers.length, 1, 'Multi mode should pick combo');
        assertEqual(result.pricing.comboDiscount, 10, 'Combo discount should be 10');
        assertEqual(result.pricing.productDiscount, 20, 'Product discount should be 20 for leftover');
        assertEqual(result.pricing.totalDiscount, 30, 'Total discount should be 30');
    });

    await runTest('TEST M4 — Leftovers with No Combos at all', async () => {
        process.env.ENABLE_MULTI_COMBO_PRICING = 'true';
        mockCombos = [];
        mockOffers = [
            createOffer('o1', 'product', 'p1', 'flat', 20)
        ];
        const cart = createCart([{ id: 'p1', qty: 2, price: 100 }]);
        const result = await service.calculate(cart, {});
        
        assertEqual(result.appliedComboOffers.length, 0, 'No combos');
        assertEqual(result.pricing.comboDiscount, 0, 'Combo discount should be 0');
        assertEqual(result.pricing.productDiscount, 40, 'Product discount should apply to both items (20*2)');
        assertEqual(result.pricing.totalDiscount, 40, 'Total discount should be 40');
    });

    await runTest('TEST M5 — Multi Mode Product splitting in finalProducts', async () => {
        process.env.ENABLE_MULTI_COMBO_PRICING = 'true';
        mockCombos = [
            // maxUsagePerOrder: 1 to ensure a split
            createCombo('c1', 'flat', 10, 1, [{ id: 'p1', qty: 1, price: 100 }])
        ];
        mockOffers = [
            createOffer('o1', 'product', 'p1', 'flat', 20)
        ];
        const cart = createCart([{ id: 'p1', qty: 2, price: 100 }]);
        const result = await service.calculate(cart, {});
        
        // p1 should be split into 2 rows in finalProducts
        const p1Rows = result.products.filter((p: any) => p.product._id === 'p1');
        assertEqual(p1Rows.length, 2, 'Should split into combo row and regular row');
        
        const comboRow = p1Rows.find((r: any) => r.isComboItem === true);
        const normalRow = p1Rows.find((r: any) => r.isComboItem === false);

        assertEqual(comboRow.quantity, 1, 'Combo row qty');
        assertEqual(comboRow.comboAllocations.length, 1, 'Combo row allocations');
        
        assertEqual(normalRow.quantity, 1, 'Normal row qty');
        assertEqual(normalRow.appliedProductOffer.offerName, 'Offer o1', 'Normal row has product offer');
    });

    console.log('[ALL PHASE 11 TESTS PASSED]');
};

runAll();
