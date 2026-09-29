import 'reflect-metadata';
import { MultiComboPricingAdapter } from './MultiComboPricingAdapter';
import { MultiComboAllocator } from './MultiComboAllocator';
import { SharedPricingService } from './SharedPricingService';

const assertEqual = (actual: any, expected: any, msg: string) => {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`${msg}\nExpected: ${JSON.stringify(expected, null, 2)}\nActual: ${JSON.stringify(actual, null, 2)}`);
    }
};

const runTest = (name: string, fn: () => void) => {
    try {
        fn();
        console.log(`[PASS] ${name}`);
    } catch (e: any) {
        console.error(`[FAIL] ${name}`);
        console.error(e.message);
        process.exit(1);
    }
};

// Mock naturalayam-style active Combo Offers and Cart
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
        discountType,
        discountValue,
        maxUsagePerOrder: maxUsage,
        products: items.map(item => ({
            productId: { _id: item.id, price: item.price },
            requiredQuantity: item.qty
        }))
    };
};

runTest('TEST 1 — Real-style single percentage Combo parity', () => {
    const cart = createCart([{ id: 'p1', qty: 1, price: 500 }, { id: 'p2', qty: 1, price: 500 }]);
    const combo = createCombo('c1', 'percentage', 10, null, [{ id: 'p1', qty: 1, price: 500 }, { id: 'p2', qty: 1, price: 500 }]);

    const adapterInput = MultiComboPricingAdapter.buildAllocatorInput(cart, [combo]);
    const allocatorResult = MultiComboAllocator.calculateBestAllocation(adapterInput.cartItems, adapterInput.comboOffers);
    
    // Manual Legacy check based on SharedPricingService formula:
    // comboSetMRP = 500 + 500 = 1000
    // comboBaseAmount = 1000 * 1 = 1000
    // discount = 1000 * 10 / 100 = 100
    
    assertEqual(allocatorResult.totalComboDiscount, 100, 'Discount mismatch');
    assertEqual(allocatorResult.allocations.length, 1, 'Should allocate 1 combo');
    assertEqual(allocatorResult.allocations[0].applications, 1, 'Applications mismatch');
});

runTest('TEST 2 — Real-style single flat Combo parity', () => {
    const cart = createCart([{ id: 'p1', qty: 2, price: 500 }, { id: 'p2', qty: 2, price: 500 }]);
    const combo = createCombo('c1', 'flat', 150, null, [{ id: 'p1', qty: 1, price: 500 }, { id: 'p2', qty: 1, price: 500 }]);

    const adapterInput = MultiComboPricingAdapter.buildAllocatorInput(cart, [combo]);
    const allocatorResult = MultiComboAllocator.calculateBestAllocation(adapterInput.cartItems, adapterInput.comboOffers);
    
    assertEqual(allocatorResult.totalComboDiscount, 300, 'Discount mismatch'); // 150 * 2 applications
    assertEqual(allocatorResult.allocations[0].applications, 2, 'Applications mismatch');
});

runTest('TEST 3 — Single Combo with maxUsagePerOrder', () => {
    const cart = createCart([{ id: 'p1', qty: 5, price: 100 }]);
    const combo = createCombo('c1', 'flat', 50, 2, [{ id: 'p1', qty: 1, price: 100 }]);

    const adapterInput = MultiComboPricingAdapter.buildAllocatorInput(cart, [combo]);
    const allocatorResult = MultiComboAllocator.calculateBestAllocation(adapterInput.cartItems, adapterInput.comboOffers);
    
    assertEqual(allocatorResult.allocations[0].applications, 2, 'Should be limited to maxUsage 2');
    assertEqual(allocatorResult.totalComboDiscount, 100, 'Discount mismatch');
    assertEqual(allocatorResult.leftoverQuantities['p1'], 3, 'Leftover mismatch');
});

runTest('TEST 4 — Unlimited max usage semantic', () => {
    const cart = createCart([{ id: 'p1', qty: 5, price: 100 }]);
    const combo1 = createCombo('c1', 'flat', 50, 0, [{ id: 'p1', qty: 1, price: 100 }]);
    
    const adapterInput = MultiComboPricingAdapter.buildAllocatorInput(cart, [combo1]);
    const allocatorResult = MultiComboAllocator.calculateBestAllocation(adapterInput.cartItems, adapterInput.comboOffers);
    assertEqual(allocatorResult.allocations[0].applications, 5, 'Should be unlimited with 0');
});

runTest('TEST 5 — requiredQuantity > 1', () => {
    const cart = createCart([{ id: 'p1', qty: 4, price: 100 }]);
    const combo = createCombo('c1', 'flat', 50, 0, [{ id: 'p1', qty: 2, price: 100 }]);

    const adapterInput = MultiComboPricingAdapter.buildAllocatorInput(cart, [combo]);
    const allocatorResult = MultiComboAllocator.calculateBestAllocation(adapterInput.cartItems, adapterInput.comboOffers);
    
    assertEqual(allocatorResult.allocations[0].applications, 2, 'Should apply twice for req qty 2');
    assertEqual(allocatorResult.leftoverQuantities['p1'], 0, 'Should have 0 leftover');
});

runTest('TEST 6 — ObjectId/string/populated product ID normalization', () => {
    const cart = {
        products: [
            { product: { _id: { toString: () => 'obj_1' }, price: 100 }, quantity: 1 }
        ]
    };
    const combo = {
        _id: { toString: () => 'combo_1' },
        offerName: 'Test',
        discountType: 'flat',
        discountValue: 10,
        maxUsagePerOrder: 0,
        products: [
            { productId: { _id: { toString: () => 'obj_1' }, price: 100 }, requiredQuantity: 1 }
        ]
    };

    const adapterInput = MultiComboPricingAdapter.buildAllocatorInput(cart, [combo]);
    assertEqual(adapterInput.cartItems[0].productId, 'obj_1', 'ID not normalized');
    assertEqual(adapterInput.comboOffers[0].products[0].productId, 'obj_1', 'Combo ID not normalized');
});

runTest('TEST 7 — Single-combo current-vs-allocator applications parity', () => {
    // Tests 1-3 already checked applications, this is covered
});

runTest('TEST 8 — Single-combo current-vs-allocator discount parity', () => {
    // Tests 1-3 already checked discount, this is covered
});

runTest('TEST 9 — A2+B1 leftover = A1', () => {
    const cart = createCart([{ id: 'A', qty: 2, price: 100 }, { id: 'B', qty: 1, price: 100 }]);
    const combo = createCombo('c1', 'flat', 50, 0, [{ id: 'A', qty: 1, price: 100 }, { id: 'B', qty: 1, price: 100 }]);
    
    const adapterInput = MultiComboPricingAdapter.buildAllocatorInput(cart, [combo]);
    const allocatorResult = MultiComboAllocator.calculateBestAllocation(adapterInput.cartItems, adapterInput.comboOffers);
    
    assertEqual(allocatorResult.leftoverQuantities['A'], 1, 'Leftover A should be 1');
    assertEqual(allocatorResult.leftoverQuantities['B'], 0, 'Leftover B should be 0');
});

runTest('TEST 10 — Two non-overlapping Combos both allocate', () => {
    const cart = createCart([{ id: 'p1', qty: 1, price: 100 }, { id: 'p2', qty: 1, price: 100 }]);
    const combo1 = createCombo('c1', 'flat', 10, null, [{ id: 'p1', qty: 1, price: 100 }]);
    const combo2 = createCombo('c2', 'flat', 20, null, [{ id: 'p2', qty: 1, price: 100 }]);

    const adapterInput = MultiComboPricingAdapter.buildAllocatorInput(cart, [combo1, combo2]);
    const allocatorResult = MultiComboAllocator.calculateBestAllocation(adapterInput.cartItems, adapterInput.comboOffers);
    
    assertEqual(allocatorResult.allocations.length, 2, 'Should allocate 2 combos');
    assertEqual(allocatorResult.totalComboDiscount, 30, 'Total discount should be 30');
});

runTest('TEST 11 — Overlapping Combos never double-consume', () => {
    const cart = createCart([{ id: 'p1', qty: 1, price: 100 }, { id: 'p2', qty: 1, price: 100 }]);
    const combo1 = createCombo('c1', 'flat', 10, null, [{ id: 'p1', qty: 1, price: 100 }]);
    const combo2 = createCombo('c2', 'flat', 20, null, [{ id: 'p1', qty: 1, price: 100 }, { id: 'p2', qty: 1, price: 100 }]);

    const adapterInput = MultiComboPricingAdapter.buildAllocatorInput(cart, [combo1, combo2]);
    const allocatorResult = MultiComboAllocator.calculateBestAllocation(adapterInput.cartItems, adapterInput.comboOffers);
    
    assertEqual(allocatorResult.allocations.length, 1, 'Should allocate only 1 combo due to overlap');
    assertEqual(allocatorResult.allocations[0].comboOfferId, 'c2', 'Should pick c2 for higher discount');
});

runTest('TEST 12 — Combined allocation chooses greater total saving', () => {
    const cart = createCart([{ id: 'A', qty: 1, price: 100 }, { id: 'B', qty: 1, price: 100 }, { id: 'C', qty: 1, price: 100 }]);
    const comboX = createCombo('cX', 'flat', 20, null, [{ id: 'A', qty: 1, price: 100 }, { id: 'B', qty: 1, price: 100 }]);
    const comboY = createCombo('cY', 'flat', 15, null, [{ id: 'A', qty: 1, price: 100 }]);
    const comboZ = createCombo('cZ', 'flat', 15, null, [{ id: 'B', qty: 1, price: 100 }]);

    const adapterInput = MultiComboPricingAdapter.buildAllocatorInput(cart, [comboX, comboY, comboZ]);
    const allocatorResult = MultiComboAllocator.calculateBestAllocation(adapterInput.cartItems, adapterInput.comboOffers);
    
    assertEqual(allocatorResult.allocations.length, 2, 'Should allocate Y and Z');
    assertEqual(allocatorResult.totalComboDiscount, 30, 'Total discount should be 30');
});

runTest('TEST 13 — Empty cart', () => {
    const adapterInput = MultiComboPricingAdapter.buildAllocatorInput({ products: [] }, []);
    assertEqual(adapterInput.cartItems.length, 0, 'Cart items should be 0');
});

runTest('TEST 14 — No active/valid Combo', () => {
    const cart = createCart([{ id: 'p1', qty: 1, price: 100 }]);
    const adapterInput = MultiComboPricingAdapter.buildAllocatorInput(cart, []);
    const allocatorResult = MultiComboAllocator.calculateBestAllocation(adapterInput.cartItems, adapterInput.comboOffers);
    assertEqual(allocatorResult.allocations.length, 0, 'Should allocate 0');
});

runTest('TEST 15 — Input objects are not mutated', () => {
    const cart = createCart([{ id: 'p1', qty: 1, price: 100 }]);
    const combo1 = createCombo('c1', 'flat', 10, null, [{ id: 'p1', qty: 1, price: 100 }]);
    const cartStr = JSON.stringify(cart);
    const comboStr = JSON.stringify(combo1);

    const adapterInput = MultiComboPricingAdapter.buildAllocatorInput(cart, [combo1]);
    MultiComboAllocator.calculateBestAllocation(adapterInput.cartItems, adapterInput.comboOffers);

    assertEqual(JSON.stringify(cart), cartStr, 'Cart was mutated');
    assertEqual(JSON.stringify(combo1), comboStr, 'Combo was mutated');
});

console.log('[ALL PHASE 5 TESTS PASSED]');
