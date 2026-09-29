import * as assert from 'assert';

function buildOrderedProductsMap(calculated: any, resolvedInfluencerId: any, resolvedInfluencerCode: any) {
    const orderedProductsMap: any = {};
    for (const cp of calculated.products) {
        const pId = cp.product._id.toString();
        
        let contextKey = pId;
        if (cp.isComboItem && calculated.appliedComboOffer) {
            contextKey += `_LCOMBO_${calculated.appliedComboOffer._id}`;
        }
        if (cp.comboAllocations && cp.comboAllocations.length > 0) {
            const comboSig = [...cp.comboAllocations].map((a: any) => a.comboOfferId.toString()).sort().join('-');
            contextKey += `_ALLOCS_${comboSig}`;
        }
        if (cp.appliedProductOffer) {
            contextKey += `_POFFER_${cp.appliedProductOffer.offerId}`;
        }

        if (!orderedProductsMap[contextKey]) {
            orderedProductsMap[contextKey] = {
                productId: cp.product._id,
                productName: cp.product.productName,
                category: cp.product.categoryId,
                quantity: 0,
                image: cp.product.images && cp.product.images.length > 0 ? cp.product.images[0] : '',
                price: Number(cp.product.price) || 0,
                totalFinalPrice: 0,
                comboQuantity: 0,
                discounts: {},
                comboAllocations: []
            };
        }
        orderedProductsMap[contextKey].quantity += cp.quantity;
        orderedProductsMap[contextKey].totalFinalPrice += cp.finalUnitPrice * cp.quantity;

        if (cp.isComboItem && calculated.appliedComboOffer) {
            orderedProductsMap[contextKey].comboQuantity += cp.quantity;
            const share = calculated.pricing.comboDistributions?.[pId] || 0;
            orderedProductsMap[contextKey].discounts.comboOffer = {
                offerId: calculated.appliedComboOffer._id,
                offerName: calculated.appliedComboOffer.offerName,
                discountAmount: share
            };
        }

        if (cp.comboAllocations && cp.comboAllocations.length > 0) {
            cp.comboAllocations.forEach((alloc: any) => {
                const existingAlloc = orderedProductsMap[contextKey].comboAllocations.find((a: any) => a.comboOfferId.toString() === alloc.comboOfferId.toString());
                if (existingAlloc) {
                    existingAlloc.quantity += alloc.quantity;
                    existingAlloc.discountAmount += alloc.discountAmount;
                } else {
                    orderedProductsMap[contextKey].comboAllocations.push({
                        comboOfferId: alloc.comboOfferId,
                        comboOfferName: alloc.comboOfferName,
                        quantity: alloc.quantity,
                        discountAmount: alloc.discountAmount
                    });
                }
            });
        }

        if (cp.appliedProductOffer) {
            const originalPrice = Number(cp.product.price) || 0;
            const unitDiscount = originalPrice - cp.finalUnitPrice;
            const amt = Math.round(unitDiscount * cp.quantity);
            orderedProductsMap[contextKey].discounts.productOffer = {
                offerId: cp.appliedProductOffer.offerId,
                offerName: cp.appliedProductOffer.offerName,
                discountAmount: (orderedProductsMap[contextKey].discounts.productOffer?.discountAmount || 0) + amt
            };
        }
    }
    
    return Object.values(orderedProductsMap).map((op: any) => {
        op.finalPrice = op.totalFinalPrice / op.quantity;
        return op;
    });
}

function runTests() {
    console.log('Running TEST 1 — NORMAL PRODUCT ONLY');
    let res = buildOrderedProductsMap({
        products: [
            {
                product: { _id: 'p1', productName: 'A', price: 100 },
                quantity: 2,
                finalUnitPrice: 50,
                isComboItem: false,
                comboAllocations: []
            }
        ]
    }, null, null);
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0].quantity, 2);
    assert.strictEqual(res[0].comboQuantity, 0);

    console.log('Running TEST 2 — COMBO PRODUCT ONLY');
    res = buildOrderedProductsMap({
        appliedComboOffer: { _id: 'c1', offerName: 'Combo 1' },
        pricing: { comboDistributions: { p1: 20 } },
        products: [
            {
                product: { _id: 'p1', productName: 'A', price: 100 },
                quantity: 2,
                finalUnitPrice: 40,
                isComboItem: true,
                comboAllocations: [{ comboOfferId: 'c1', comboOfferName: 'Combo 1', quantity: 2, discountAmount: 20 }]
            }
        ]
    }, null, null);
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0].quantity, 2);
    assert.strictEqual(res[0].comboQuantity, 2);
    assert.strictEqual(res[0].comboAllocations.length, 1);

    console.log('Running TEST 3 — MIXED COMBO + NORMAL SAME PRODUCT');
    res = buildOrderedProductsMap({
        appliedComboOffer: { _id: 'c1', offerName: 'Combo 1' },
        pricing: { comboDistributions: { p1: 20 } },
        products: [
            {
                product: { _id: 'p1', productName: 'A', price: 100 },
                quantity: 2,
                finalUnitPrice: 40,
                isComboItem: true,
                comboAllocations: [{ comboOfferId: 'c1', comboOfferName: 'Combo 1', quantity: 2, discountAmount: 20 }]
            },
            {
                product: { _id: 'p1', productName: 'A', price: 100 },
                quantity: 1,
                finalUnitPrice: 50,
                isComboItem: false,
                comboAllocations: []
            }
        ]
    }, null, null);
    assert.strictEqual(res.length, 2);
    const comboRow = res.find(r => r.comboQuantity > 0);
    const normalRow = res.find(r => r.comboQuantity === 0);
    assert.ok(comboRow);
    assert.ok(normalRow);
    assert.strictEqual(comboRow.quantity, 2);
    assert.strictEqual(normalRow.quantity, 1);
    assert.strictEqual(normalRow.comboAllocations.length, 0);

    console.log('Running TEST 4 — COMBO + PRODUCT OFFER LEFTOVER');
    res = buildOrderedProductsMap({
        appliedComboOffer: { _id: 'c1', offerName: 'Combo 1' },
        pricing: { comboDistributions: { p1: 10 } },
        products: [
            {
                product: { _id: 'p1', productName: 'A', price: 100 },
                quantity: 1,
                finalUnitPrice: 40,
                isComboItem: true,
                comboAllocations: [{ comboOfferId: 'c1', comboOfferName: 'Combo 1', quantity: 1, discountAmount: 10 }]
            },
            {
                product: { _id: 'p1', productName: 'A', price: 100 },
                quantity: 1,
                finalUnitPrice: 45,
                isComboItem: false,
                comboAllocations: [],
                appliedProductOffer: { offerId: 'po1', offerName: 'PO 1' }
            }
        ]
    }, null, null);
    assert.strictEqual(res.length, 2);
    assert.ok(res.find(r => r.discounts.comboOffer));
    assert.ok(res.find(r => r.discounts.productOffer));

    console.log('Running TEST 5 — TWO DIFFERENT COMBOS SAME PRODUCT');
    res = buildOrderedProductsMap({
        pricing: {},
        products: [
            {
                product: { _id: 'p1', productName: 'A', price: 100 },
                quantity: 1,
                finalUnitPrice: 40,
                isComboItem: false,
                comboAllocations: [{ comboOfferId: 'c1', comboOfferName: 'Combo 1', quantity: 1, discountAmount: 10 }]
            },
            {
                product: { _id: 'p1', productName: 'A', price: 100 },
                quantity: 2,
                finalUnitPrice: 40,
                isComboItem: false,
                comboAllocations: [{ comboOfferId: 'c2', comboOfferName: 'Combo 2', quantity: 2, discountAmount: 20 }]
            }
        ]
    }, null, null);
    assert.strictEqual(res.length, 2);

    console.log('Running TEST 6 — MULTIPLE IDENTICAL NORMAL PORTIONS');
    res = buildOrderedProductsMap({
        pricing: {},
        products: [
            {
                product: { _id: 'p1', productName: 'A', price: 100 },
                quantity: 1,
                finalUnitPrice: 50,
                isComboItem: false,
                comboAllocations: []
            },
            {
                product: { _id: 'p1', productName: 'A', price: 100 },
                quantity: 1,
                finalUnitPrice: 50,
                isComboItem: false,
                comboAllocations: []
            }
        ]
    }, null, null);
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0].quantity, 2);

    console.log('All tests passed successfully!');
}

runTests();
