import 'reflect-metadata';
import { SharedPricingService } from './SharedPricingService';
import { ComboOfferModel } from '../../infrastructure/database/models/ComboOfferModel';
import { OfferModel } from '../../infrastructure/database/models/OfferModel';
import { InfluencerSettingModel } from '../../infrastructure/database/models/InfluencerSettingModel';
import { ReferralSettingModel } from '../../infrastructure/database/models/ReferralSettingModel';
import { LoyaltySettingModel } from '../../infrastructure/database/models/LoyaltySettingModel';

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

const createCart = (items: { id: string, qty: number, price: number, categoryId?: string }[]) => {
    return {
        products: items.map(item => ({
            product: { _id: item.id, price: item.price, categoryId: item.categoryId },
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

    await runTest('TEST 1: Flag OFF absent', async () => {
        delete process.env.ENABLE_MULTI_COMBO_PRICING;
        mockCombos = [
            createCombo('c1', 'flat', 10, null, [{ id: 'A', qty: 1, price: 100 }]),
            createCombo('c2', 'flat', 20, null, [{ id: 'B', qty: 1, price: 100 }])
        ];
        const cart = createCart([{ id: 'A', qty: 1, price: 100 }, { id: 'B', qty: 1, price: 100 }]);
        const result = await service.calculate(cart, {});
        
        assertEqual(result.appliedComboOffers.length, 1, 'Flag absent should act as legacy, picking 1 combo');
        assertEqual(result.pricing.totalDiscount, 20, 'Should pick best combo (c2)');
    });

    await runTest('TEST 2: Flag OFF false', async () => {
        process.env.ENABLE_MULTI_COMBO_PRICING = 'false';
        mockCombos = [
            createCombo('c1', 'flat', 10, null, [{ id: 'A', qty: 1, price: 100 }]),
            createCombo('c2', 'flat', 20, null, [{ id: 'B', qty: 1, price: 100 }])
        ];
        const cart = createCart([{ id: 'A', qty: 1, price: 100 }, { id: 'B', qty: 1, price: 100 }]);
        const result = await service.calculate(cart, {});
        
        assertEqual(result.appliedComboOffers.length, 1, 'Flag false should act as legacy, picking 1 combo');
        assertEqual(result.pricing.totalDiscount, 20, 'Should pick best combo (c2)');
    });

    await runTest('TEST 3: Single Combo Parity (Flag ON)', async () => {
        process.env.ENABLE_MULTI_COMBO_PRICING = 'true';
        mockCombos = [
            createCombo('c1', 'flat', 10, null, [{ id: 'A', qty: 1, price: 100 }])
        ];
        mockOffers = [];
        const cart = createCart([{ id: 'A', qty: 2, price: 100 }]);
        const result = await service.calculate(cart, {});
        
        assertEqual(result.appliedComboOffers[0].applications, 2, 'Applications should be 2');
        assertEqual(result.pricing.comboDiscount, 20, 'Combo discount should be 20');
        assertEqual(result.pricing.totalDiscount, 20, 'Total discount should be 20');
        assertEqual(result.pricing.total, 180, 'Total should be 180');
    });

    await runTest('TEST 4: Leftover Product Offer', async () => {
        process.env.ENABLE_MULTI_COMBO_PRICING = 'true';
        mockCombos = [
            createCombo('c1', 'flat', 10, 1, [{ id: 'A', qty: 1, price: 100 }, { id: 'B', qty: 1, price: 100 }])
        ];
        mockOffers = [
            createOffer('o1', 'product', 'A', 'flat', 15)
        ];
        const cart = createCart([{ id: 'A', qty: 2, price: 100 }, { id: 'B', qty: 1, price: 100 }]);
        const result = await service.calculate(cart, {});
        
        assertEqual(result.appliedComboOffers.length, 1, 'Should pick 1 combo');
        assertEqual(result.pricing.comboDiscount, 10, 'Combo discount is 10');
        assertEqual(result.pricing.productDiscount, 15, 'Leftover A gets product discount of 15');
        assertEqual(result.pricing.totalDiscount, 25, 'Total discount is 25');
        
        const aRows = result.products.filter((p: any) => p.product._id === 'A');
        assertEqual(aRows.length, 2, 'A should be split into 2 rows');
        
        const aCombo = aRows.find((p: any) => p.isComboItem);
        const aLeftover = aRows.find((p: any) => !p.isComboItem);
        
        assertEqual(aCombo.quantity, 1, 'Combo A qty is 1');
        assertEqual(aCombo.appliedProductOffer, null, 'Combo A has no product offer');
        
        assertEqual(aLeftover.quantity, 1, 'Leftover A qty is 1');
        assertEqual(aLeftover.appliedProductOffer.offerName, 'Offer o1', 'Leftover A has product offer');
    });

    await runTest('TEST 5: Leftover Category Offer', async () => {
        process.env.ENABLE_MULTI_COMBO_PRICING = 'true';
        mockCombos = [
            createCombo('c1', 'flat', 10, 1, [{ id: 'A', qty: 1, price: 100 }, { id: 'B', qty: 1, price: 100 }])
        ];
        mockOffers = [
            createOffer('o2', 'category', 'cat1', 'flat', 12)
        ];
        const cart = createCart([{ id: 'A', qty: 2, price: 100, categoryId: 'cat1' }, { id: 'B', qty: 1, price: 100 }]);
        const result = await service.calculate(cart, {});
        
        assertEqual(result.pricing.comboDiscount, 10, 'Combo discount is 10');
        assertEqual(result.pricing.productDiscount, 12, 'Leftover A gets category discount of 12');
        assertEqual(result.pricing.totalDiscount, 22, 'Total discount is 22');
    });

    await runTest('TEST 6: Dynamic A2+B1 -> A2+B2', async () => {
        process.env.ENABLE_MULTI_COMBO_PRICING = 'true';
        mockCombos = [
            createCombo('c1', 'flat', 10, 2, [{ id: 'A', qty: 1, price: 100 }, { id: 'B', qty: 1, price: 100 }])
        ];
        mockOffers = [
            createOffer('o1', 'product', 'A', 'flat', 15)
        ];
        
        // Cart 1: A2+B1
        let cart = createCart([{ id: 'A', qty: 2, price: 100 }, { id: 'B', qty: 1, price: 100 }]);
        let result = await service.calculate(cart, {});
        assertEqual(result.pricing.comboDiscount, 10, 'Cart1: 1 Combo');
        assertEqual(result.pricing.productDiscount, 15, 'Cart1: 1 Leftover A gets 15');
        
        // Cart 2: A2+B2 (Recalculate)
        cart = createCart([{ id: 'A', qty: 2, price: 100 }, { id: 'B', qty: 2, price: 100 }]);
        result = await service.calculate(cart, {});
        assertEqual(result.pricing.comboDiscount, 20, 'Cart2: 2 Combos');
        assertEqual(result.pricing.productDiscount, 0, 'Cart2: 0 Leftover A, so no product discount');
        assertEqual(result.pricing.totalDiscount, 20, 'Cart2: Total discount 20');
    });

    await runTest('TEST 7: Max usage + leftover test', async () => {
        process.env.ENABLE_MULTI_COMBO_PRICING = 'true';
        mockCombos = [
            createCombo('c1', 'flat', 10, 2, [{ id: 'A', qty: 1, price: 100 }, { id: 'B', qty: 1, price: 100 }])
        ];
        mockOffers = [
            createOffer('o1', 'product', 'A', 'flat', 5),
            createOffer('o2', 'product', 'B', 'flat', 5)
        ];
        
        const cart = createCart([{ id: 'A', qty: 3, price: 100 }, { id: 'B', qty: 3, price: 100 }]);
        const result = await service.calculate(cart, {});
        
        assertEqual(result.pricing.comboDiscount, 20, 'Combo discount (max 2) is 20');
        assertEqual(result.pricing.productDiscount, 10, 'Leftover 1A + 1B = 10 discount');
        assertEqual(result.pricing.totalDiscount, 30, 'Total discount is 30');
    });

    await runTest('TEST 8: Multiple non-overlapping Combo', async () => {
        process.env.ENABLE_MULTI_COMBO_PRICING = 'true';
        mockCombos = [
            createCombo('c1', 'flat', 10, 2, [{ id: 'A', qty: 1, price: 100 }, { id: 'B', qty: 1, price: 100 }]),
            createCombo('c2', 'flat', 20, 1, [{ id: 'C', qty: 1, price: 100 }, { id: 'D', qty: 1, price: 100 }])
        ];
        mockOffers = [];
        
        const cart = createCart([{ id: 'A', qty: 2, price: 100 }, { id: 'B', qty: 2, price: 100 }, { id: 'C', qty: 1, price: 100 }, { id: 'D', qty: 1, price: 100 }]);
        const result = await service.calculate(cart, {});
        
        assertEqual(result.appliedComboOffers.length, 2, 'Should pick both combos');
        assertEqual(result.appliedComboOffers.find((c: any) => c.offerId === 'c1').applications, 2, 'c1 applied 2 times');
        assertEqual(result.appliedComboOffers.find((c: any) => c.offerId === 'c2').applications, 1, 'c2 applied 1 time');
        assertEqual(result.pricing.comboDiscount, 40, 'Total combo discount 40 (2*10 + 1*20)');
    });

    await runTest('TEST 9: Overlap', async () => {
        process.env.ENABLE_MULTI_COMBO_PRICING = 'true';
        mockCombos = [
            createCombo('c1', 'flat', 10, null, [{ id: 'A', qty: 1, price: 100 }, { id: 'B', qty: 1, price: 100 }]),
            createCombo('c2', 'flat', 20, null, [{ id: 'A', qty: 1, price: 100 }, { id: 'C', qty: 1, price: 100 }])
        ];
        const cart = createCart([{ id: 'A', qty: 1, price: 100 }, { id: 'B', qty: 1, price: 100 }, { id: 'C', qty: 1, price: 100 }]);
        const result = await service.calculate(cart, {});
        
        assertEqual(result.appliedComboOffers.length, 1, 'Should pick only 1 combo due to A overlap');
        assertEqual(result.appliedComboOffers[0].offerId, 'c2', 'Should pick c2 because it saves 20');
        assertEqual(result.pricing.comboDiscount, 20, 'Total combo discount 20');
    });

    await runTest('TEST 10: Better total saving', async () => {
        process.env.ENABLE_MULTI_COMBO_PRICING = 'true';
        mockCombos = [
            createCombo('c1', 'flat', 30, null, [{ id: 'A', qty: 1, price: 100 }, { id: 'B', qty: 1, price: 100 }, { id: 'C', qty: 1, price: 100 }]),
            createCombo('c2', 'flat', 20, null, [{ id: 'A', qty: 1, price: 100 }, { id: 'B', qty: 1, price: 100 }]),
            createCombo('c3', 'flat', 20, null, [{ id: 'C', qty: 1, price: 100 }, { id: 'D', qty: 1, price: 100 }])
        ];
        const cart = createCart([{ id: 'A', qty: 1, price: 100 }, { id: 'B', qty: 1, price: 100 }, { id: 'C', qty: 1, price: 100 }, { id: 'D', qty: 1, price: 100 }]);
        const result = await service.calculate(cart, {});
        
        assertEqual(result.appliedComboOffers.length, 2, 'Should pick c2 and c3 for 40 saving instead of c1 for 30 saving');
        assertEqual(result.pricing.comboDiscount, 40, 'Total combo discount 40');
    });

    await runTest('TEST 11: Discount distribution and Total conservation', async () => {
        process.env.ENABLE_MULTI_COMBO_PRICING = 'true';
        mockCombos = [
            createCombo('c1', 'flat', 33, 1, [{ id: 'A', qty: 1, price: 100 }, { id: 'B', qty: 1, price: 50 }]) // 150 total, 33 discount
        ];
        const cart = createCart([{ id: 'A', qty: 1, price: 100 }, { id: 'B', qty: 1, price: 50 }]);
        const result = await service.calculate(cart, {});
        
        const aRow = result.products.find((p: any) => p.product._id === 'A');
        const bRow = result.products.find((p: any) => p.product._id === 'B');
        
        const aAlloc = aRow.comboAllocations[0].discountAmount;
        const bAlloc = bRow.comboAllocations[0].discountAmount;
        
        assertEqual(aAlloc + bAlloc, 33, 'SUM of allocations must exactly equal 33');
        assertEqual(result.appliedComboOffers[0].discountAmount, 33, 'appliedComboOffers discountAmount must be 33');
        assertEqual(result.pricing.comboDiscount, 33, 'Total combo discount must be 33');
    });

    await runTest('TEST 12: Quantity conservation', async () => {
        process.env.ENABLE_MULTI_COMBO_PRICING = 'true';
        mockCombos = [
            createCombo('c1', 'flat', 10, 1, [{ id: 'A', qty: 1, price: 100 }])
        ];
        mockOffers = [
            createOffer('o1', 'product', 'A', 'flat', 5)
        ];
        const cart = createCart([{ id: 'A', qty: 5, price: 100 }]);
        const result = await service.calculate(cart, {});
        
        let totalQtyA = 0;
        result.products.forEach((p: any) => {
            if (p.product._id === 'A') {
                totalQtyA += p.quantity;
            }
        });
        
        assertEqual(totalQtyA, 5, 'Total quantity across rows must be exactly 5');
    });

    await runTest('TEST 13: Same product in two different Combos', async () => {
        process.env.ENABLE_MULTI_COMBO_PRICING = 'true';
        mockCombos = [
            createCombo('c1', 'flat', 10, 1, [{ id: 'A', qty: 1, price: 100 }, { id: 'B', qty: 1, price: 100 }]),
            createCombo('c2', 'flat', 10, 1, [{ id: 'A', qty: 1, price: 100 }, { id: 'C', qty: 1, price: 100 }])
        ];
        mockOffers = [
            createOffer('o1', 'product', 'A', 'flat', 5)
        ];
        const cart = createCart([{ id: 'A', qty: 3, price: 100 }, { id: 'B', qty: 1, price: 100 }, { id: 'C', qty: 1, price: 100 }]);
        const result = await service.calculate(cart, {});
        
        const aRows = result.products.filter((p: any) => p.product._id === 'A');
        assertEqual(aRows.length, 3, 'A should be split into 3 rows (Combo1, Combo2, Leftover)');
        
        const c1Row = aRows.find((p: any) => p.isComboItem && p.comboAllocations.some((a: any) => a.comboOfferId === 'c1'));
        const c2Row = aRows.find((p: any) => p.isComboItem && p.comboAllocations.some((a: any) => a.comboOfferId === 'c2'));
        const leftoverRow = aRows.find((p: any) => !p.isComboItem);
        
        assertEqual(!!c1Row, true, 'c1Row exists');
        assertEqual(!!c2Row, true, 'c2Row exists');
        assertEqual(!!leftoverRow, true, 'leftoverRow exists');
        assertEqual(c1Row.quantity, 1, 'c1Row qty 1');
        assertEqual(c2Row.quantity, 1, 'c2Row qty 1');
        assertEqual(leftoverRow.quantity, 1, 'leftoverRow qty 1');
        assertEqual(leftoverRow.appliedProductOffer.offerName, 'Offer o1', 'Leftover has product offer');
    });

    await runTest('TEST 14: appliedComboOffers legacy and array compatibility', async () => {
        process.env.ENABLE_MULTI_COMBO_PRICING = 'true';
        mockCombos = [
            createCombo('c1', 'flat', 10, 1, [{ id: 'A', qty: 1, price: 100 }, { id: 'B', qty: 1, price: 100 }]),
            createCombo('c2', 'flat', 20, 1, [{ id: 'C', qty: 1, price: 100 }, { id: 'D', qty: 1, price: 100 }])
        ];
        const cart = createCart([{ id: 'A', qty: 1, price: 100 }, { id: 'B', qty: 1, price: 100 }, { id: 'C', qty: 1, price: 100 }, { id: 'D', qty: 1, price: 100 }]);
        const result = await service.calculate(cart, {});
        
        assertEqual(result.appliedComboOffers.length, 2, 'Array has 2 elements');
        assertEqual(result.appliedComboOffer.offerName, 'Combo c2', 'Legacy scalar has best individual combo (c2)');
    });

    await runTest('TEST 15: Coupon, Influencer, NaturePoints, Shipping, Tax, Grand Total Regression', async () => {
        process.env.ENABLE_MULTI_COMBO_PRICING = 'true';
        mockCombos = [
            createCombo('c1', 'flat', 10, 1, [{ id: 'A', qty: 1, price: 100 }])
        ];
        const cart = createCart([{ id: 'A', qty: 1, price: 100 }]);
        
        const coupon = {
            _id: 'coup1',
            status: true,
            minOrderValue: 0,
            discountType: 'flat',
            discountValue: 15,
            cannotBeClubbedWithCombo: true,
            usageLimit: 100,
            usageCount: 0
        };

        const result = await service.calculate(cart, { coupon } as any);
        
        assertEqual(result.appliedDiscounts.combo, true, 'Combo active');
        assertEqual(result.pricing.couponDiscount, 0, 'Coupon should be blocked by Combo due to cannotBeClubbedWithCombo');
        assertEqual(result.appliedDiscounts.coupon, false, 'Coupon applied flag false');
        assertEqual(result.pricing.deliveryCharge, 0, 'Shipping 0 applied (no addressId)');
        assertEqual(result.pricing.total, 90, 'Grand total = 100 - 10 (combo) + 0 (shipping)');
    });

    await runTest('TEST 16: Order Mapping Compatibility', async () => {
        process.env.ENABLE_MULTI_COMBO_PRICING = 'true';
        mockCombos = [
            createCombo('c1', 'flat', 10, 1, [{ id: 'A', qty: 1, price: 100 }, { id: 'B', qty: 1, price: 100 }])
        ];
        mockOffers = [
            createOffer('o1', 'product', 'A', 'flat', 5)
        ];
        const cart = createCart([{ id: 'A', qty: 2, price: 100 }, { id: 'B', qty: 1, price: 100 }]);
        const result = await service.calculate(cart, {});
        
        const aCombo = result.products.find((p: any) => p.product._id === 'A' && p.isComboItem);
        const aNormal = result.products.find((p: any) => p.product._id === 'A' && !p.isComboItem);
        const bCombo = result.products.find((p: any) => p.product._id === 'B' && p.isComboItem);
        
        assertEqual(aCombo.comboAllocations[0].comboOfferId, 'c1', 'Order map: aCombo has c1');
        assertEqual(aNormal.comboAllocations.length, 0, 'Order map: aNormal has no combo');
        assertEqual(bCombo.comboAllocations[0].comboOfferId, 'c1', 'Order map: bCombo has c1');
    });

    console.log('[ALL PHASE 11B TESTS PASSED]');
};

runAll();
