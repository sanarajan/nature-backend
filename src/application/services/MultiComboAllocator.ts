export interface AllocatorCartItem {
    productId: string;
    quantity: number;
}

export interface AllocatorComboProduct {
    productId: string;
    requiredQuantity: number;
    price: number;
}

export interface AllocatorComboOffer {
    comboOfferId: string;
    offerName: string;
    products: AllocatorComboProduct[];
    maxUsagePerOrder: number | null | undefined;
    discountType: 'percentage' | 'flat';
    discountValue: number;
}

export interface ComboAllocation {
    comboOfferId: string;
    offerName: string;
    applications: number;
    totalDiscount: number;
    products: {
        productId: string;
        quantityConsumed: number;
    }[];
}

export interface AllocatorResult {
    allocations: ComboAllocation[];
    consumedQuantities: Record<string, number>;
    leftoverQuantities: Record<string, number>;
    totalComboDiscount: number;
}

const roundTo2 = (num: number) => Math.round(num * 100) / 100;

export class MultiComboAllocator {
    public static calculateBestAllocation(
        cartItems: AllocatorCartItem[],
        comboOffers: AllocatorComboOffer[]
    ): AllocatorResult {
        const initialCart: Record<string, number> = {};
        for (const item of cartItems) {
            initialCart[item.productId] = (initialCart[item.productId] || 0) + item.quantity;
        }

        const solve = (comboIdx: number, remainingCart: Record<string, number>) => {
            if (comboIdx >= comboOffers.length) {
                return {
                    totalDiscount: 0,
                    totalApplications: 0,
                    allocations: [] as ComboAllocation[]
                };
            }

            const combo = comboOffers[comboIdx];
            
            // Find max applications based on remainingCart
            let maxK = Infinity;
            if (combo.products.length === 0) {
                maxK = 0;
            } else {
                for (const p of combo.products) {
                    const available = remainingCart[p.productId] || 0;
                    if (p.requiredQuantity > 0) {
                        maxK = Math.min(maxK, Math.floor(available / p.requiredQuantity));
                    } else {
                        maxK = 0; // Invalid required quantity
                    }
                }
            }

            if (combo.maxUsagePerOrder && combo.maxUsagePerOrder > 0) {
                maxK = Math.min(maxK, combo.maxUsagePerOrder);
            }

            if (maxK === Infinity) maxK = 0;

            let bestDiscount = -1;
            let bestPlan: any = null;
            let bestTotalApplications = -1;

            for (let k = 0; k <= maxK; k++) {
                // Apply k times
                const newCart = { ...remainingCart };
                for (const p of combo.products) {
                    newCart[p.productId] -= p.requiredQuantity * k;
                }

                let currentDiscount = 0;
                if (k > 0) {
                    let comboSetMRP = 0;
                    for (const p of combo.products) {
                        comboSetMRP += p.price * p.requiredQuantity;
                    }
                    const comboBaseAmount = roundTo2(comboSetMRP * k);

                    if (combo.discountType === 'percentage') {
                        currentDiscount = roundTo2((comboBaseAmount * (combo.discountValue || 0)) / 100);
                    } else {
                        currentDiscount = roundTo2((combo.discountValue || 0) * k);
                    }
                }

                const subResult = solve(comboIdx + 1, newCart);
                const totalDiscount = roundTo2(currentDiscount + subResult.totalDiscount);
                const totalApps = k + subResult.totalApplications;

                if (totalDiscount > bestDiscount || (totalDiscount === bestDiscount && totalApps > bestTotalApplications)) {
                    bestDiscount = totalDiscount;
                    bestTotalApplications = totalApps;

                    const currentAllocation = k > 0 ? {
                        comboOfferId: combo.comboOfferId,
                        offerName: combo.offerName,
                        applications: k,
                        totalDiscount: currentDiscount,
                        products: combo.products.map(p => ({
                            productId: p.productId,
                            quantityConsumed: p.requiredQuantity * k
                        }))
                    } : null;

                    bestPlan = {
                        totalDiscount,
                        totalApplications: totalApps,
                        allocations: currentAllocation 
                            ? [currentAllocation, ...subResult.allocations] 
                            : subResult.allocations
                    };
                }
            }

            return bestPlan;
        };

        const result = solve(0, initialCart);

        const consumedQuantities: Record<string, number> = {};
        const leftoverQuantities: Record<string, number> = { ...initialCart };

        for (const item of cartItems) {
            consumedQuantities[item.productId] = 0;
        }

        for (const alloc of result.allocations) {
            for (const p of alloc.products) {
                consumedQuantities[p.productId] = (consumedQuantities[p.productId] || 0) + p.quantityConsumed;
                leftoverQuantities[p.productId] -= p.quantityConsumed;
            }
        }

        return {
            allocations: result.allocations,
            consumedQuantities,
            leftoverQuantities,
            totalComboDiscount: result.totalDiscount
        };
    }
}
