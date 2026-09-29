import { AllocatorCartItem, AllocatorComboOffer, AllocatorComboProduct } from './MultiComboAllocator';

export class MultiComboPricingAdapter {
    public static buildAllocatorInput(cart: any, activeComboOffers: any[]): {
        cartItems: AllocatorCartItem[],
        comboOffers: AllocatorComboOffer[]
    } {
        const cartItems: AllocatorCartItem[] = [];
        
        if (cart && cart.products && Array.isArray(cart.products)) {
            cart.products.forEach((cp: any) => {
                const productId = cp.product?._id?.toString() || cp.productId?.toString();
                if (productId) {
                    const existing = cartItems.find(item => item.productId === productId);
                    if (existing) {
                        existing.quantity += (cp.quantity || 0);
                    } else {
                        cartItems.push({
                            productId,
                            quantity: cp.quantity || 0
                        });
                    }
                }
            });
        }

        const comboOffers: AllocatorComboOffer[] = [];
        
        if (activeComboOffers && Array.isArray(activeComboOffers)) {
            activeComboOffers.forEach((combo: any) => {
                if (!combo.products || !Array.isArray(combo.products)) return;
                
                const reqs: Record<string, AllocatorComboProduct> = {};

                combo.products.forEach((cp: any) => {
                    const prodDoc = cp.productId;
                    const pId = prodDoc?._id?.toString() || cp.productId?.toString();
                    if (!pId) return;

                    const price = Number(prodDoc?.price) || 0;
                    
                    if (reqs[pId]) {
                        reqs[pId].requiredQuantity += cp.requiredQuantity;
                    } else {
                        reqs[pId] = {
                            productId: pId,
                            requiredQuantity: cp.requiredQuantity,
                            price
                        };
                    }
                });

                const products = Object.values(reqs);

                if (products.length > 0) {
                    comboOffers.push({
                        comboOfferId: combo._id?.toString(),
                        offerName: combo.offerName || '',
                        products,
                        maxUsagePerOrder: combo.maxUsagePerOrder,
                        discountType: combo.discountType === 'percentage' ? 'percentage' : 'flat',
                        discountValue: combo.discountValue || 0
                    });
                }
            });
        }

        return { cartItems, comboOffers };
    }
}
