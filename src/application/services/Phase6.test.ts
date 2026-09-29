import 'reflect-metadata';
import { SharedPricingService } from './SharedPricingService';
import { ComboOfferModel } from '../../infrastructure/database/models/ComboOfferModel';
import { OfferModel } from '../../infrastructure/database/models/OfferModel';
import { MultiComboAllocator } from './MultiComboAllocator';

const assertEqual = (actual: any, expected: any, msg: string) => {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`${msg}\nExpected: ${JSON.stringify(expected, null, 2)}\nActual: ${JSON.stringify(actual, null, 2)}`);
    }
};

let capturedShadowResult: any = null;
const originalCalculateBestAllocation = MultiComboAllocator.calculateBestAllocation;

MultiComboAllocator.calculateBestAllocation = (cartItems, comboOffers) => {
    capturedShadowResult = originalCalculateBestAllocation(cartItems, comboOffers);
    return capturedShadowResult;
};

const runTest = async (name: string, fn: () => Promise<void>) => {
    try {
        capturedShadowResult = null;
        await fn();
        console.log(`[PASS] ${name}`);
    } catch (e: any) {
        console.error(`[FAIL] ${name}`);
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
        offerName: `Combo ${id}`,
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

import { InfluencerSettingModel } from '../../infrastructure/database/models/InfluencerSettingModel';
import { ReferralSettingModel } from '../../infrastructure/database/models/ReferralSettingModel';
import { LoyaltySettingModel } from '../../infrastructure/database/models/LoyaltySettingModel';

// Mock DB
OfferModel.find = (() => Promise.resolve([])) as any;
InfluencerSettingModel.findOne = (() => Promise.resolve(null)) as any;
ReferralSettingModel.findOne = (() => Promise.resolve(null)) as any;
LoyaltySettingModel.findOne = (() => Promise.resolve(null)) as any;
let mockCombos: any[] = [];
ComboOfferModel.find = (() => ({
    populate: () => Promise.resolve(mockCombos)
})) as any;

const service = new SharedPricingService();

const runAll = async () => {

    await runTest('TEST 1 — No Combo', async () => {
        mockCombos = [];
        const cart = createCart([{ id: 'p1', qty: 1, price: 100 }]);
        const result = await service.calculate(cart, {});
        
        assertEqual(result.appliedDiscounts.combo, false, 'Live should have no combo');
        assertEqual(capturedShadowResult.allocations.length, 0, 'Shadow should have 0 allocations');
    });

    await runTest('TEST 2 — One Percentage Combo', async () => {
        mockCombos = [createCombo('c1', 'percentage', 10, null, [{ id: 'p1', qty: 1, price: 100 }])];
        const cart = createCart([{ id: 'p1', qty: 2, price: 100 }]);
        const result = await service.calculate(cart, {});
        
        assertEqual(result.pricing.totalDiscount, 20, 'Live discount mismatch');
        assertEqual(result.appliedComboOffers[0].applications, 2, 'Live applications mismatch');

        assertEqual(capturedShadowResult.totalComboDiscount, 20, 'Shadow discount mismatch');
        assertEqual(capturedShadowResult.allocations[0].applications, 2, 'Shadow applications mismatch');
    });

    await runTest('TEST 3 — One Flat Combo', async () => {
        mockCombos = [createCombo('c1', 'flat', 15, null, [{ id: 'p1', qty: 1, price: 100 }])];
        const cart = createCart([{ id: 'p1', qty: 2, price: 100 }]);
        const result = await service.calculate(cart, {});
        
        assertEqual(result.pricing.totalDiscount, 30, 'Live discount mismatch');
        assertEqual(capturedShadowResult.totalComboDiscount, 30, 'Shadow discount mismatch');
    });

    await runTest('TEST 4 — Same Combo maxUsagePerOrder', async () => {
        mockCombos = [createCombo('c1', 'flat', 15, 1, [{ id: 'p1', qty: 1, price: 100 }])];
        const cart = createCart([{ id: 'p1', qty: 2, price: 100 }]);
        const result = await service.calculate(cart, {});
        
        assertEqual(result.pricing.totalDiscount, 15, 'Live discount mismatch');
        assertEqual(capturedShadowResult.totalComboDiscount, 15, 'Shadow discount mismatch');
    });

    await runTest('TEST 5 — Multiple non-overlapping Combos', async () => {
        mockCombos = [
            createCombo('c1', 'flat', 10, null, [{ id: 'p1', qty: 1, price: 100 }]),
            createCombo('c2', 'flat', 20, null, [{ id: 'p2', qty: 1, price: 100 }])
        ];
        const cart = createCart([{ id: 'p1', qty: 1, price: 100 }, { id: 'p2', qty: 1, price: 100 }]);
        const result = await service.calculate(cart, {});
        
        assertEqual(result.appliedComboOffers.length, 1, 'Live should pick only 1 combo (c2 is better)');
        assertEqual(result.pricing.totalDiscount, 20, 'Live should have 20 discount');

        assertEqual(capturedShadowResult.allocations.length, 2, 'Shadow should pick both');
        assertEqual(capturedShadowResult.totalComboDiscount, 30, 'Shadow should have 30 discount');
    });

    await runTest('TEST 6 — Overlapping Combos', async () => {
        mockCombos = [
            createCombo('c1', 'flat', 10, null, [{ id: 'p1', qty: 1, price: 100 }]),
            createCombo('c2', 'flat', 20, null, [{ id: 'p1', qty: 1, price: 100 }, { id: 'p2', qty: 1, price: 100 }])
        ];
        const cart = createCart([{ id: 'p1', qty: 1, price: 100 }, { id: 'p2', qty: 1, price: 100 }]);
        const result = await service.calculate(cart, {});
        
        assertEqual(capturedShadowResult.allocations.length, 1, 'Shadow should not double consume');
        assertEqual(capturedShadowResult.allocations[0].comboOfferId, 'c2', 'Shadow should pick c2');
        assertEqual(result.pricing.totalDiscount, 20, 'Live should pick c2');
    });

    await runTest('TEST 7 — Better combined saving', async () => {
        mockCombos = [
            createCombo('cX', 'flat', 20, null, [{ id: 'A', qty: 1, price: 100 }, { id: 'B', qty: 1, price: 100 }]),
            createCombo('cY', 'flat', 15, null, [{ id: 'A', qty: 1, price: 100 }]),
            createCombo('cZ', 'flat', 15, null, [{ id: 'B', qty: 1, price: 100 }])
        ];
        const cart = createCart([{ id: 'A', qty: 1, price: 100 }, { id: 'B', qty: 1, price: 100 }, { id: 'C', qty: 1, price: 100 }]);
        const result = await service.calculate(cart, {});
        
        assertEqual(result.appliedComboOffers.length, 1, 'Live is just 1');
        assertEqual(result.pricing.totalDiscount, 20, 'Live is 20');

        assertEqual(capturedShadowResult.allocations.length, 2, 'Shadow should pick Y and Z');
        assertEqual(capturedShadowResult.totalComboDiscount, 30, 'Shadow is 30');
    });

    await runTest('TEST 8 — Leftover quantities', async () => {
        mockCombos = [createCombo('c1', 'flat', 10, null, [{ id: 'p1', qty: 1, price: 100 }])];
        const cart = createCart([{ id: 'p1', qty: 2, price: 100 }, { id: 'p2', qty: 1, price: 100 }]);
        await service.calculate(cart, {});
        
        assertEqual(capturedShadowResult.leftoverQuantities['p1'], 0, 'Leftover p1 should be 0 (used 2)');
        assertEqual(capturedShadowResult.leftoverQuantities['p2'], 1, 'Leftover p2 should be 1');
    });

    await runTest('TEST 9-14 — Live response unchanged', async () => {
        mockCombos = [
            createCombo('c1', 'flat', 10, null, [{ id: 'p1', qty: 1, price: 100 }]),
            createCombo('c2', 'flat', 20, null, [{ id: 'p2', qty: 1, price: 100 }])
        ];
        const cart = createCart([{ id: 'p1', qty: 1, price: 100 }, { id: 'p2', qty: 1, price: 100 }]);
        const result = await service.calculate(cart, {});
        
        // Ensure no shadow properties are on result
        if ('shadowMultiComboResult' in result) {
            throw new Error('Shadow result leaked into public response');
        }

        assertEqual(result.appliedComboOffer.offerName, 'Combo c2', 'TEST 10 - appliedComboOffer changed');
        assertEqual(result.appliedComboOffers.length, 1, 'TEST 11 - appliedComboOffers length changed');
        
        const p2 = result.products.find((p: any) => p.product._id === 'p2');
        assertEqual(p2.comboAllocations.length, 1, 'TEST 12 - comboAllocations length changed');

        assertEqual(result.appliedDiscounts.productOrCategory, false, 'TEST 13 - Product offer changed');
        assertEqual(result.appliedDiscounts.coupon, false, 'TEST 14 - Coupon output changed');
    });

    await runTest('TEST 16 — Reasonable performance fixture', async () => {
        // 15 products in cart, 5 combos
        const cartItems = [];
        for (let i = 1; i <= 15; i++) {
            cartItems.push({ id: `p${i}`, qty: 2, price: 100 });
        }
        const cart = createCart(cartItems);

        mockCombos = [
            createCombo('c1', 'flat', 15, null, [{ id: 'p1', qty: 1, price: 100 }, { id: 'p2', qty: 1, price: 100 }]),
            createCombo('c2', 'flat', 20, null, [{ id: 'p3', qty: 1, price: 100 }, { id: 'p4', qty: 1, price: 100 }]),
            createCombo('c3', 'flat', 25, null, [{ id: 'p5', qty: 1, price: 100 }, { id: 'p6', qty: 1, price: 100 }]),
            createCombo('c4', 'flat', 30, null, [{ id: 'p7', qty: 1, price: 100 }, { id: 'p8', qty: 1, price: 100 }]),
            createCombo('c5', 'flat', 35, null, [{ id: 'p9', qty: 1, price: 100 }, { id: 'p10', qty: 1, price: 100 }])
        ];

        const start = Date.now();
        await service.calculate(cart, {});
        const elapsed = Date.now() - start;

        console.log(`Performance test took ${elapsed}ms`);
        if (elapsed > 1000) {
            throw new Error('Performance test took too long (>1000ms)');
        }
        assertEqual(capturedShadowResult.allocations.length, 5, 'Should allocate all 5 non-overlapping combos');
    });

    console.log('[ALL PHASE 6 TESTS PASSED]');
};

runAll();
