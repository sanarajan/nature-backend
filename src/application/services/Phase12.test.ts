import 'reflect-metadata';
import { SharedPricingService } from './SharedPricingService';
import { ComboOfferModel } from '../../infrastructure/database/models/ComboOfferModel';
import { OfferModel } from '../../infrastructure/database/models/OfferModel';
import { InfluencerSettingModel } from '../../infrastructure/database/models/InfluencerSettingModel';
import { ReferralSettingModel } from '../../infrastructure/database/models/ReferralSettingModel';
import { LoyaltySettingModel } from '../../infrastructure/database/models/LoyaltySettingModel';
import { OrderModel } from '../../infrastructure/database/models/OrderModel';

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

// Simple mocks
let mockOffers: any[] = [];
let mockCombos: any[] = [];
OfferModel.find = (() => Promise.resolve(mockOffers)) as any;
ComboOfferModel.find = (() => ({ populate: () => Promise.resolve(mockCombos) })) as any;
InfluencerSettingModel.findOne = (() => Promise.resolve(null)) as any;
ReferralSettingModel.findOne = (() => Promise.resolve(null)) as any;
LoyaltySettingModel.findOne = (() => Promise.resolve(null)) as any;
OrderModel.findOne = (() => Promise.resolve(null)) as any;

const service = new SharedPricingService();

const createCart = (items: { id: string, qty: number, price: number, categoryId?: string }[]) => {
    return {
        products: items.map(item => ({
            product: { _id: item.id, price: item.price, categoryId: item.categoryId },
            quantity: item.qty
        }))
    };
};

const createCombo = (id: string, discountValue: number, maxUsage: number | null, items: { id: string, qty: number, price: number }[]) => {
    return {
        _id: id,
        offerName: "Combo " + id,
        status: true,
        startDate: new Date(Date.now() - 10000),
        endDate: new Date(Date.now() + 100000),
        discountType: 'flat',
        discountValue,
        maxUsagePerOrder: maxUsage,
        products: items.map(item => ({
            productId: { _id: item.id, price: item.price, toString: () => item.id },
            requiredQuantity: item.qty
        }))
    };
};

const createOffer = (id: string, offerFor: string, targetId: string, discountValue: number) => {
    return {
        _id: id,
        offerName: "Offer " + id,
        offerFor,
        productId: offerFor === 'product' ? targetId : null,
        categoryId: offerFor === 'category' ? targetId : null,
        status: true,
        startDate: new Date(Date.now() - 10000),
        endDate: new Date(Date.now() + 100000),
        discountType: 'flat',
        discountValue
    };
};

const runAll = async () => {
    console.log("--- PHASE 12 END-TO-END VERIFICATION ---");
    
    // START PHASE 12 SPECIFIC FLAG ON
    process.env.ENABLE_MULTI_COMBO_PRICING = 'true';

    await runTest('TEST 1 - ONE COMBO ONLY (Backward compatibility)', async () => {
        mockCombos = [createCombo('c1', 10, null, [{ id: 'A', qty: 1, price: 100 }])];
        mockOffers = [];
        const cart = createCart([{ id: 'A', qty: 1, price: 100 }]);
        const result = await service.calculate(cart, {} as any);
        assertEqual(result.appliedComboOffers.length, 1, 'Contains exactly 1 combo');
        assertEqual(result.appliedComboOffers[0].applications, 1, 'Applications is 1');
        assertEqual(result.pricing.comboDiscount, 10, 'Combo discount correct');
        assertEqual(result.pricing.total, 90, 'Cart total correct (excluding delivery mock)');
    });

    await runTest('TEST 2 - SAME COMBO MULTIPLE TIMES', async () => {
        mockCombos = [createCombo('c1', 10, 5, [{ id: 'A', qty: 1, price: 100 }, { id: 'B', qty: 1, price: 100 }])];
        const cart = createCart([{ id: 'A', qty: 2, price: 100 }, { id: 'B', qty: 2, price: 100 }]);
        const result = await service.calculate(cart, {} as any);
        assertEqual(result.appliedComboOffers.length, 1, 'Only one distinct combo row');
        assertEqual(result.appliedComboOffers[0].applications, 2, 'Applied 2 times');
        assertEqual(result.pricing.comboDiscount, 20, 'Discount is 20');
    });

    await runTest('TEST 3 - MAX USAGE', async () => {
        mockCombos = [createCombo('c1', 10, 2, [{ id: 'A', qty: 1, price: 100 }, { id: 'B', qty: 1, price: 100 }])];
        const cart = createCart([{ id: 'A', qty: 3, price: 100 }, { id: 'B', qty: 3, price: 100 }]);
        const result = await service.calculate(cart, {} as any);
        assertEqual(result.appliedComboOffers[0].applications, 2, 'Applied exactly max 2 times');
        assertEqual(result.pricing.comboDiscount, 20, 'Discount is 20');
        const leftover = result.products.find((p: any) => !p.isComboItem);
        assertEqual(leftover.quantity, 1, 'Leftover quantity is correctly identified');
    });

    await runTest('TEST 4 & 5 - TWO DIFFERENT NON-OVERLAPPING COMBOS & DIFFERENT MAX USAGES', async () => {
        mockCombos = [
            createCombo('c1', 10, 2, [{ id: 'A', qty: 1, price: 100 }, { id: 'B', qty: 1, price: 100 }]),
            createCombo('c2', 15, 1, [{ id: 'C', qty: 1, price: 100 }, { id: 'D', qty: 1, price: 100 }])
        ];
        const cart = createCart([{ id: 'A', qty: 3, price: 100 }, { id: 'B', qty: 3, price: 100 }, { id: 'C', qty: 2, price: 100 }, { id: 'D', qty: 2, price: 100 }]);
        const result = await service.calculate(cart, {} as any);
        assertEqual(result.appliedComboOffers.length, 2, 'Contains both combos');
        assertEqual(result.appliedComboOffers.find((c: any) => c.offerId === 'c1').applications, 2, 'c1 applied 2 times (max 2)');
        assertEqual(result.appliedComboOffers.find((c: any) => c.offerId === 'c2').applications, 1, 'c2 applied 1 time (max 1)');
        assertEqual(result.pricing.comboDiscount, 35, 'Total combo discount 35');
    });

    await runTest('TEST 6 & 7 - LEFTOVER PRODUCT / CATEGORY OFFER', async () => {
        mockCombos = [createCombo('c1', 10, 1, [{ id: 'A', qty: 1, price: 100 }, { id: 'B', qty: 1, price: 100 }])];
        mockOffers = [createOffer('o1', 'product', 'A', 5), createOffer('o2', 'category', 'cat1', 8)];
        const cart = createCart([{ id: 'A', qty: 2, price: 100 }, { id: 'B', qty: 2, price: 100, categoryId: 'cat1' }]);
        const result = await service.calculate(cart, {} as any);
        assertEqual(result.appliedComboOffers.length, 1, 'Combo active');
        assertEqual(result.pricing.comboDiscount, 10, 'Combo discount');
        assertEqual(result.pricing.productDiscount, 13, 'Leftover A(5) + Leftover B(8) = 13');
    });

    await runTest('TEST 8 - DYNAMIC REALLOCATION', async () => {
        mockCombos = [createCombo('c1', 10, 5, [{ id: 'A', qty: 1, price: 100 }, { id: 'B', qty: 1, price: 100 }])];
        mockOffers = [createOffer('o1', 'product', 'A', 5)];
        
        let cart = createCart([{ id: 'A', qty: 2, price: 100 }, { id: 'B', qty: 1, price: 100 }]);
        let result = await service.calculate(cart, {} as any);
        assertEqual(result.pricing.comboDiscount, 10, 'Init Combo: 10');
        assertEqual(result.pricing.productDiscount, 5, 'Init Leftover A: 5');

        cart = createCart([{ id: 'A', qty: 2, price: 100 }, { id: 'B', qty: 2, price: 100 }]);
        result = await service.calculate(cart, {} as any);
        assertEqual(result.pricing.comboDiscount, 20, 'New Combo: 20');
        assertEqual(result.pricing.productDiscount, 0, 'No leftover Product Offer leakage');
    });

    await runTest('TEST 9 & 10 - OVERLAPPING COMBOS & BETTER TOTAL SAVING', async () => {
        mockCombos = [
            createCombo('c1', 30, null, [{ id: 'A', qty: 1, price: 100 }, { id: 'B', qty: 1, price: 100 }, { id: 'C', qty: 1, price: 100 }]),
            createCombo('c2', 20, null, [{ id: 'A', qty: 1, price: 100 }, { id: 'B', qty: 1, price: 100 }]),
            createCombo('c3', 20, null, [{ id: 'C', qty: 1, price: 100 }, { id: 'D', qty: 1, price: 100 }])
        ];
        const cart = createCart([{ id: 'A', qty: 1, price: 100 }, { id: 'B', qty: 1, price: 100 }, { id: 'C', qty: 1, price: 100 }, { id: 'D', qty: 1, price: 100 }]);
        const result = await service.calculate(cart, {} as any);
        assertEqual(result.appliedComboOffers.length, 2, 'Chose optimal path of 2 compatible combos');
        assertEqual(result.pricing.comboDiscount, 40, 'Discount is 40 (20+20) vs 30');
    });

    await runTest('TEST 11 - SAME PRODUCT USED ACROSS TWO COMBOS', async () => {
        mockCombos = [
            createCombo('c1', 10, 1, [{ id: 'A', qty: 1, price: 100 }, { id: 'B', qty: 1, price: 100 }]),
            createCombo('c2', 15, 1, [{ id: 'A', qty: 1, price: 100 }, { id: 'C', qty: 1, price: 100 }])
        ];
        const cart = createCart([{ id: 'A', qty: 3, price: 100 }, { id: 'B', qty: 1, price: 100 }, { id: 'C', qty: 1, price: 100 }]);
        const result = await service.calculate(cart, {} as any);
        
        const aRows = result.products.filter((p: any) => p.product._id === 'A');
        assertEqual(aRows.length, 3, 'Product A is safely split into three distinct context rows');
        assertEqual(result.pricing.comboDiscount, 25, 'Total combo discount 25');
    });

    await runTest('TEST 14 - COUPON CONFLICT', async () => {
        mockCombos = [createCombo('c1', 10, 1, [{ id: 'A', qty: 1, price: 100 }])];
        const cart = createCart([{ id: 'A', qty: 1, price: 100 }]);
        const coupon = {
            _id: 'coup1', status: true, minOrderValue: 0, discountType: 'flat', discountValue: 15,
            cannotBeClubbedWithCombo: true, usageLimit: 100, usageCount: 0
        };
        const result = await service.calculate(cart, { coupon } as any);
        assertEqual(result.pricing.couponDiscount, 0, 'Coupon is strictly blocked by Combo');
    });

    await runTest('TEST 17 & 18 & 19 - ORDER CREATION SNAPSHOT SHAPES', async () => {
        mockCombos = [createCombo('c1', 10, 1, [{ id: 'A', qty: 1, price: 100 }])];
        const cart = createCart([{ id: 'A', qty: 2, price: 100 }]);
        const result = await service.calculate(cart, {} as any);
        
        assertEqual(result.appliedComboOffers.length, 1, 'Array exists');
        assertEqual(result.appliedComboOffer.offerName, 'Combo c1', 'Legacy object exists');
        
        const comboRow = result.products.find((p: any) => p.isComboItem);
        const normalRow = result.products.find((p: any) => !p.isComboItem);
        
        assertEqual(comboRow.comboAllocations[0].comboOfferId, 'c1', 'Combo metadata populated');
        assertEqual(normalRow.comboAllocations.length, 0, 'Normal metadata protected');
    });

    await runTest('TEST 25 - REMOVE QUANTITY / RECALCULATE', async () => {
        mockCombos = [createCombo('c1', 10, 2, [{ id: 'A', qty: 1, price: 100 }, { id: 'B', qty: 1, price: 100 }])];
        let cart = createCart([{ id: 'A', qty: 2, price: 100 }, { id: 'B', qty: 2, price: 100 }]);
        let result = await service.calculate(cart, {} as any);
        assertEqual(result.pricing.comboDiscount, 20, '2 combos applied');
        
        cart = createCart([{ id: 'A', qty: 2, price: 100 }, { id: 'B', qty: 1, price: 100 }]);
        result = await service.calculate(cart, {} as any);
        assertEqual(result.pricing.comboDiscount, 10, '1 combo applied on removal');
        assertEqual(result.appliedComboOffers[0].applications, 1, 'Recalculated cleanly without stale memory');
    });

    await runTest('TEST 26 - EMPTY / NORMAL CART', async () => {
        mockCombos = [createCombo('c1', 10, 1, [{ id: 'A', qty: 1, price: 100 }, { id: 'B', qty: 1, price: 100 }])];
        const cart = createCart([{ id: 'A', qty: 1, price: 100 }, { id: 'C', qty: 1, price: 100 }]);
        const result = await service.calculate(cart, {} as any);
        assertEqual(result.appliedComboOffers.length, 0, 'Array is empty for non-qualifying cart');
        assertEqual(result.appliedComboOffer, null, 'Legacy object is null');
        assertEqual(result.pricing.comboDiscount, 0, 'Discount is 0');
    });

    console.log("--- PHASE 12 FLAG-OFF ROLLBACK TEST ---");
    process.env.ENABLE_MULTI_COMBO_PRICING = 'false';
    await runTest('ROLLBACK VALIDATION', async () => {
        mockCombos = [
            createCombo('c1', 10, null, [{ id: 'A', qty: 1, price: 100 }, { id: 'B', qty: 1, price: 100 }]),
            createCombo('c2', 20, null, [{ id: 'C', qty: 1, price: 100 }, { id: 'D', qty: 1, price: 100 }])
        ];
        const cart = createCart([{ id: 'A', qty: 2, price: 100 }, { id: 'B', qty: 2, price: 100 }, { id: 'C', qty: 1, price: 100 }, { id: 'D', qty: 1, price: 100 }]);
        const result = await service.calculate(cart, {} as any);
        assertEqual(result.appliedComboOffers.length, 1, 'System cleanly rolled back to exactly 1 legacy combo');
        assertEqual(result.pricing.comboDiscount, 20, 'Legacy logic cleanly isolated');
    });

    console.log("[ALL PHASE 12 END-TO-END TESTS PASSED]");
};

runAll();
