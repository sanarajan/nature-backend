import * as assert from 'assert';

function comparePendingOrder(existingPendingOrder: any, orderedProducts: any[]) {
    // The current flawed Phase 9 implementation
    return existingPendingOrder.orderedProducts.every((ep: any) => {
        const newP = orderedProducts.find((np: any) => 
            np.productId?.toString() === ep.productId?.toString() &&
            np.quantity === ep.quantity &&
            np.finalPrice === ep.finalPrice &&
            (np.comboQuantity || 0) === (ep.comboQuantity || 0)
        );
        return !!newP;
    });
}

function runTests() {
    console.log('TEST 2 — Different Combo A vs Combo B, pending-order comparison');
    const existingOrder = {
        orderedProducts: [
            { productId: 'p1', quantity: 1, finalPrice: 450, comboQuantity: 1, comboAllocations: [{ comboOfferId: 'comboA' }] },
            { productId: 'p1', quantity: 1, finalPrice: 450, comboQuantity: 1, comboAllocations: [{ comboOfferId: 'comboB' }] }
        ]
    };
    
    const newOrder = [
        { productId: 'p1', quantity: 1, finalPrice: 450, comboQuantity: 1, comboAllocations: [{ comboOfferId: 'comboC' }] },
        { productId: 'p1', quantity: 1, finalPrice: 450, comboQuantity: 1, comboAllocations: [{ comboOfferId: 'comboD' }] }
    ];

    const isSame = comparePendingOrder(existingOrder, newOrder);
    // It should ideally be false, but Phase 9 makes it true.
    assert.strictEqual(isSame, true, "Phase 9 incorrectly returns true");
    console.log('Confirmed defect in Phase 9 pending-order matching.');
}
runTests();
