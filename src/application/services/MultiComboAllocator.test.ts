import { MultiComboAllocator, AllocatorCartItem, AllocatorComboOffer } from './MultiComboAllocator';

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

const assertEqual = (actual: any, expected: any, msg: string) => {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`${msg}\nExpected: ${JSON.stringify(expected, null, 2)}\nActual: ${JSON.stringify(actual, null, 2)}`);
    }
};

const createProduct = (id: string, reqQty: number, price: number) => ({
    productId: id,
    requiredQuantity: reqQty,
    price
});

runTest('TEST 1 — Single Combo', () => {
    const cart: AllocatorCartItem[] = [
        { productId: 'A', quantity: 1 },
        { productId: 'B', quantity: 1 }
    ];
    const combos: AllocatorComboOffer[] = [
        {
            comboOfferId: 'C1',
            offerName: 'Combo 1',
            products: [createProduct('A', 1, 100), createProduct('B', 1, 100)],
            maxUsagePerOrder: 0,
            discountType: 'flat',
            discountValue: 50
        }
    ];

    const result = MultiComboAllocator.calculateBestAllocation(cart, combos);
    assertEqual(result.allocations.length, 1, 'Should have 1 allocation');
    assertEqual(result.allocations[0].applications, 1, 'Applications should be 1');
    assertEqual(result.leftoverQuantities['A'], 0, 'Leftover A should be 0');
    assertEqual(result.leftoverQuantities['B'], 0, 'Leftover B should be 0');
});

runTest('TEST 2 — Same Combo Multiple Applications', () => {
    const cart: AllocatorCartItem[] = [
        { productId: 'A', quantity: 2 },
        { productId: 'B', quantity: 2 }
    ];
    const combos: AllocatorComboOffer[] = [
        {
            comboOfferId: 'C1',
            offerName: 'Combo 1',
            products: [createProduct('A', 1, 100), createProduct('B', 1, 100)],
            maxUsagePerOrder: 2,
            discountType: 'flat',
            discountValue: 50
        }
    ];

    const result = MultiComboAllocator.calculateBestAllocation(cart, combos);
    assertEqual(result.allocations[0].applications, 2, 'Applications should be 2');
});

runTest('TEST 3 — Max Usage', () => {
    const cart: AllocatorCartItem[] = [
        { productId: 'A', quantity: 5 },
        { productId: 'B', quantity: 5 }
    ];
    const combos: AllocatorComboOffer[] = [
        {
            comboOfferId: 'C1',
            offerName: 'Combo 1',
            products: [createProduct('A', 1, 100), createProduct('B', 1, 100)],
            maxUsagePerOrder: 2,
            discountType: 'flat',
            discountValue: 50
        }
    ];

    const result = MultiComboAllocator.calculateBestAllocation(cart, combos);
    assertEqual(result.allocations[0].applications, 2, 'Applications should be 2 limited by maxUsagePerOrder');
    assertEqual(result.leftoverQuantities['A'], 3, 'Leftover A should be 3');
    assertEqual(result.leftoverQuantities['B'], 3, 'Leftover B should be 3');
});

runTest('TEST 4 — Leftover', () => {
    const cart: AllocatorCartItem[] = [
        { productId: 'A', quantity: 2 },
        { productId: 'B', quantity: 1 }
    ];
    const combos: AllocatorComboOffer[] = [
        {
            comboOfferId: 'C1',
            offerName: 'Combo 1',
            products: [createProduct('A', 1, 100), createProduct('B', 1, 100)],
            maxUsagePerOrder: 0,
            discountType: 'flat',
            discountValue: 50
        }
    ];

    const result = MultiComboAllocator.calculateBestAllocation(cart, combos);
    assertEqual(result.allocations[0].applications, 1, 'Applications should be 1');
    assertEqual(result.leftoverQuantities['A'], 1, 'Leftover A should be 1');
});

runTest('TEST 5 — Multiple Non-Overlapping Combos', () => {
    const cart: AllocatorCartItem[] = [
        { productId: 'A', quantity: 2 },
        { productId: 'B', quantity: 2 },
        { productId: 'C', quantity: 1 },
        { productId: 'D', quantity: 1 }
    ];
    const combos: AllocatorComboOffer[] = [
        {
            comboOfferId: 'C1',
            offerName: 'Combo 1',
            products: [createProduct('A', 1, 100), createProduct('B', 1, 100)],
            maxUsagePerOrder: 0,
            discountType: 'flat',
            discountValue: 50
        },
        {
            comboOfferId: 'C2',
            offerName: 'Combo 2',
            products: [createProduct('C', 1, 100), createProduct('D', 1, 100)],
            maxUsagePerOrder: 0,
            discountType: 'flat',
            discountValue: 70
        }
    ];

    const result = MultiComboAllocator.calculateBestAllocation(cart, combos);
    assertEqual(result.allocations.length, 2, 'Should have 2 allocations');
    const c1 = result.allocations.find(a => a.comboOfferId === 'C1');
    const c2 = result.allocations.find(a => a.comboOfferId === 'C2');
    assertEqual(c1?.applications, 2, 'C1 apps should be 2');
    assertEqual(c2?.applications, 1, 'C2 apps should be 1');
});

runTest('TEST 6 — Overlapping Combos', () => {
    const cart: AllocatorCartItem[] = [
        { productId: 'A', quantity: 1 },
        { productId: 'B', quantity: 1 },
        { productId: 'C', quantity: 1 }
    ];
    const combos: AllocatorComboOffer[] = [
        {
            comboOfferId: 'C1',
            offerName: 'Combo 1',
            products: [createProduct('A', 1, 100), createProduct('B', 1, 100)],
            maxUsagePerOrder: 0,
            discountType: 'flat',
            discountValue: 100
        },
        {
            comboOfferId: 'C2',
            offerName: 'Combo 2',
            products: [createProduct('A', 1, 100), createProduct('C', 1, 100)],
            maxUsagePerOrder: 0,
            discountType: 'flat',
            discountValue: 50
        }
    ];

    const result = MultiComboAllocator.calculateBestAllocation(cart, combos);
    assertEqual(result.allocations.length, 1, 'Should have 1 allocation since A is consumed');
    assertEqual(result.allocations[0].comboOfferId, 'C1', 'Should pick C1 for higher discount');
});

runTest('TEST 7 — Better Combined Saving', () => {
    const cart: AllocatorCartItem[] = [
        { productId: 'A', quantity: 1 },
        { productId: 'B', quantity: 1 },
        { productId: 'C', quantity: 1 },
        { productId: 'D', quantity: 1 }
    ];
    const combos: AllocatorComboOffer[] = [
        {
            comboOfferId: 'CX',
            offerName: 'Combo X',
            products: [createProduct('A', 1, 100), createProduct('B', 1, 100)],
            maxUsagePerOrder: 0,
            discountType: 'flat',
            discountValue: 200
        },
        {
            comboOfferId: 'CY',
            offerName: 'Combo Y',
            products: [createProduct('A', 1, 100), createProduct('C', 1, 100)],
            maxUsagePerOrder: 0,
            discountType: 'flat',
            discountValue: 150
        },
        {
            comboOfferId: 'CZ',
            offerName: 'Combo Z',
            products: [createProduct('B', 1, 100), createProduct('D', 1, 100)],
            maxUsagePerOrder: 0,
            discountType: 'flat',
            discountValue: 150
        }
    ];

    const result = MultiComboAllocator.calculateBestAllocation(cart, combos);
    assertEqual(result.allocations.length, 2, 'Should pick 2 combos');
    assertEqual(result.totalComboDiscount, 300, 'Total discount should be 300 (CY+CZ)');
});

runTest('TEST 8 — Required Quantity Greater Than 1', () => {
    const cart: AllocatorCartItem[] = [
        { productId: 'A', quantity: 4 },
        { productId: 'B', quantity: 2 }
    ];
    const combos: AllocatorComboOffer[] = [
        {
            comboOfferId: 'C1',
            offerName: 'Combo 1',
            products: [createProduct('A', 2, 100), createProduct('B', 1, 100)],
            maxUsagePerOrder: 0,
            discountType: 'flat',
            discountValue: 50
        }
    ];

    const result = MultiComboAllocator.calculateBestAllocation(cart, combos);
    assertEqual(result.allocations[0].applications, 2, 'Should apply 2 times');
    assertEqual(result.leftoverQuantities['A'], 0, 'Leftover A 0');
});

runTest('TEST 9 — Insufficient Quantity', () => {
    const cart: AllocatorCartItem[] = [
        { productId: 'A', quantity: 1 },
        { productId: 'B', quantity: 5 }
    ];
    const combos: AllocatorComboOffer[] = [
        {
            comboOfferId: 'C1',
            offerName: 'Combo 1',
            products: [createProduct('A', 2, 100), createProduct('B', 1, 100)],
            maxUsagePerOrder: 0,
            discountType: 'flat',
            discountValue: 50
        }
    ];

    const result = MultiComboAllocator.calculateBestAllocation(cart, combos);
    assertEqual(result.allocations.length, 0, 'Should have 0 allocations');
});

runTest('TEST 10 — Deterministic Tie', () => {
    const cart: AllocatorCartItem[] = [
        { productId: 'A', quantity: 1 },
        { productId: 'B', quantity: 1 },
        { productId: 'C', quantity: 1 }
    ];
    const combos: AllocatorComboOffer[] = [
        {
            comboOfferId: 'C1',
            offerName: 'Combo 1',
            products: [createProduct('A', 1, 100), createProduct('B', 1, 100)],
            maxUsagePerOrder: 0,
            discountType: 'flat',
            discountValue: 100
        },
        {
            comboOfferId: 'C2',
            offerName: 'Combo 2',
            products: [createProduct('A', 1, 100), createProduct('C', 1, 100)],
            maxUsagePerOrder: 0,
            discountType: 'flat',
            discountValue: 100
        }
    ];

    const res1 = MultiComboAllocator.calculateBestAllocation(cart, combos);
    const res2 = MultiComboAllocator.calculateBestAllocation(cart, combos);
    const res3 = MultiComboAllocator.calculateBestAllocation(cart, combos);
    
    assertEqual(res1.allocations[0].comboOfferId, res2.allocations[0].comboOfferId, 'Must be deterministic');
    assertEqual(res2.allocations[0].comboOfferId, res3.allocations[0].comboOfferId, 'Must be deterministic');
});

runTest('TEST 11 — Empty Cart', () => {
    const cart: AllocatorCartItem[] = [];
    const combos: AllocatorComboOffer[] = [
        {
            comboOfferId: 'C1',
            offerName: 'Combo 1',
            products: [createProduct('A', 1, 100)],
            maxUsagePerOrder: 0,
            discountType: 'flat',
            discountValue: 100
        }
    ];
    const result = MultiComboAllocator.calculateBestAllocation(cart, combos);
    assertEqual(result.allocations.length, 0, 'Should be 0');
});

runTest('TEST 12 — No Active Combos', () => {
    const cart: AllocatorCartItem[] = [{ productId: 'A', quantity: 1 }];
    const combos: AllocatorComboOffer[] = [];
    const result = MultiComboAllocator.calculateBestAllocation(cart, combos);
    assertEqual(result.allocations.length, 0, 'Should be 0');
    assertEqual(result.leftoverQuantities['A'], 1, 'Leftover A 1');
});

console.log('ALL TESTS PASSED.');
