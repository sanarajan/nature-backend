import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { CartModel, ICartDocument } from '../../infrastructure/database/models/CartModel';
import { ComboOfferModel } from '../../infrastructure/database/models/ComboOfferModel';
import { OfferModel } from '../../infrastructure/database/models/OfferModel';
import { ProductModel } from '../../infrastructure/database/models/ProductModel';

const roundTo2 = (num: number) => Math.round(num * 100) / 100;

/**
 * Common function to calculate discounts and offers for a cart
 * Returns a plain object with calculated fields
 */
export const calculateCartSubtotals = async (cart: any) => {
    const tempRaw: any = cart && cart.toObject ? cart.toObject() : (cart || { products: [] });
    const now = new Date();

    const getPId = (p: any) => {
        if (!p) return "";
        const id = p._id || p.id || p;
        return id.toString();
    };

    // 0. Proactively Merge Duplicates by ID immediately
    const mergedMap: any = {};
    const inputItems: any[] = Array.isArray(tempRaw.products) ? tempRaw.products : [];
    
    inputItems.forEach((it: any) => {
        const pId = getPId(it.product);
        if (!pId) return;

        if (!mergedMap[pId]) {
            // Initializing with original data
            mergedMap[pId] = { ...it, quantity: Number(it.quantity) || 0 };
        } else {
            // Merging additional quantity
            mergedMap[pId].quantity += (Number(it.quantity) || 0);
        }
    });
    const cartProductsRaw = Object.values(mergedMap);

    // 1. Combo Matching Logic
    const activeComboOffers: any[] = await ComboOfferModel.find({
        status: true,
        isDeleted: { $ne: true },
        startDate: { $lte: now },
        endDate: { $gte: now }
    }).populate('products.productId').lean();

    let bestComboOffer: any = null;
    let maxComboDiscount = 0;
    let comboCount = 0;

    for (const combo of activeComboOffers) {
        let isMatched = true;
        let comboSetMRP = 0;
        const comboProducts: any[] = Array.isArray(combo.products) ? combo.products : [];
        if (comboProducts.length === 0) continue;

        const reqs: any = {};
        for (const cp of comboProducts) {
            const pId = getPId(cp.productId);
            if (!pId) continue;
            const rq = Number(cp.requiredQuantity) || 1;
            reqs[pId] = (reqs[pId] || 0) + rq;
            const price = Number((cp.productId as any)?.price) || 0;
            comboSetMRP += price * rq;
        }

        const rPIds = Object.keys(reqs);
        for (const pId of rPIds) {
            const ci: any = cartProductsRaw.find((x: any) => getPId(x.product) === pId);
            if (!ci || Number(ci.quantity) < reqs[pId]) {
                isMatched = false;
                break;
            }
        }

        if (isMatched) {
            let possible = Infinity;
            for (const pId of rPIds) {
                const ci: any = cartProductsRaw.find((x: any) => getPId(x.product) === pId);
                const canDo = Math.floor(Number(ci.quantity) / reqs[pId]);
                if (canDo < possible) possible = canDo;
            }

            if (possible > 0 && possible !== Infinity) {
                let apply = possible;
                const mU = Number(combo.maxUsagePerOrder) || 0;
                if (mU > 0 && possible > mU) apply = mU;

                const base = roundTo2(comboSetMRP * apply);
                const disc = combo.discountType === 'percentage' ? roundTo2((base * combo.discountValue) / 100) : roundTo2(combo.discountValue * apply);

                if (disc > maxComboDiscount) {
                    maxComboDiscount = disc;
                    bestComboOffer = combo;
                    comboCount = apply;
                }
            }
        }
    }

    const activeOffers: any[] = await OfferModel.find({
        status: true,
        isDeleted: { $ne: true },
        startDate: { $lte: now },
        endDate: { $gte: now }
    }).lean();

    // 2. Strict Combo Blocking Logic
    const comboUsageMap: { [pId: string]: number } = {};
    if (bestComboOffer && comboCount > 0) {
        const comboProducts: any[] = Array.isArray(bestComboOffer.products) ? bestComboOffer.products : [];
        for (const cp of comboProducts) {
            const pId = getPId(cp.productId);
            const rq = Number(cp.requiredQuantity) || 1;
            comboUsageMap[pId] = (comboUsageMap[pId] || 0) + (rq * comboCount);
        }
    }

    const finalProducts: any[] = [];
    
    cartProductsRaw.forEach((item: any) => {
        const prod: any = item.product;
        if (!prod) return;

        const pId = getPId(prod);
        const totalQty = Number(item.quantity) || 1;
        const usedQty = comboUsageMap[pId] || 0;
        const remainingQty = Math.max(0, totalQty - usedQty);
        const origPrice = Number(prod.price) || 0;

        // Calculate Best Product/Category Offer
        const cId = getPId(prod.categoryId);
        let bestIndv = 0;
        let bestO: any = null;

        activeOffers.forEach((o: any) => {
            let d = 0;
            const dv = Number(o.discountValue) || 0;
            const oPId = getPId(o.productId);
            const oCId = getPId(o.categoryId);

            if (o.offerFor === 'product' && oPId === pId) {
                d = o.discountType === 'percentage' ? (origPrice * dv) / 100 : dv;
            } else if (o.offerFor === 'category' && oCId === cId) {
                d = o.discountType === 'percentage' ? (origPrice * dv) / 100 : dv;
            }
            if (d > bestIndv) {
                bestIndv = d;
                bestO = o;
            }
        });

        // 1. Create Combo Split Row
        if (usedQty > 0) {
            finalProducts.push({
                product: {
                    _id: prod._id,
                    productName: prod.productName,
                    price: origPrice,
                    categoryId: prod.categoryId,
                    subcategoryId: prod.subcategoryId,
                    images: prod.images
                },
                quantity: Math.min(usedQty, totalQty), // Ensure we don't exceed total
                isComboItem: true,
                finalUnitPrice: origPrice,
                appliedProductOffer: null
            });
        }

        // 2. Create Remaining Split Row
        if (remainingQty > 0) {
            let appliedProductOffer: any = null;
            let finalUnitPrice = origPrice;

            if (bestO && bestIndv > 0) {
                finalUnitPrice = roundTo2(origPrice - bestIndv);
                appliedProductOffer = {
                    offerId: bestO._id,
                    offerName: bestO.offerName,
                    discountType: bestO.discountType,
                    discountValue: Number(bestO.discountValue) || 0,
                    finalUnitPrice: finalUnitPrice
                };
            }

            finalProducts.push({
                product: {
                    _id: prod._id,
                    productName: prod.productName,
                    price: origPrice,
                    categoryId: prod.categoryId,
                    subcategoryId: prod.subcategoryId,
                    images: prod.images
                },
                quantity: remainingQty,
                isComboItem: false,
                finalUnitPrice: finalUnitPrice,
                appliedProductOffer
            });
        }
    });

    // 3. Centralized Pricing Calculation
    const subtotalMRP = finalProducts.reduce((acc, it) => acc + (it.product.price * it.quantity), 0);
    const productDiscount = finalProducts.reduce((acc, it) => {
        if (it.appliedProductOffer) {
            const unitD = it.product.price - it.appliedProductOffer.finalUnitPrice;
            return acc + (unitD * it.quantity);
        }
        return acc;
    }, 0);
    const comboDiscount = roundTo2(maxComboDiscount);
    const total = roundTo2(subtotalMRP - productDiscount - comboDiscount);

    const calculatedCart: any = {
        ...tempRaw,
        products: finalProducts,
        pricing: {
            subtotalMRP,
            productDiscount,
            comboDiscount,
            total
        }
    };

    if (bestComboOffer) {
        calculatedCart.appliedComboOffer = {
            _id: bestComboOffer._id,
            offerName: bestComboOffer.offerName,
            discountValue: comboDiscount,
            products: bestComboOffer.products
        };
    }

    return calculatedCart;
};

export const getCart = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        let cart = await CartModel.findOne({ user: userId, isActive: true })
            .populate({
                path: 'products.product',
                populate: [
                    { path: 'categoryId', select: 'categoryName _id' },
                    { path: 'subcategoryId', select: 'subcategoryName _id' }
                ]
            });
        if (!cart) {
            cart = await CartModel.create({ user: userId, products: [], isActive: true });
        }
        const calculatedCart = await calculateCartSubtotals(cart);
        res.status(200).json({ success: true, data: calculatedCart });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message || 'Error fetching cart' });
    }
};

export const toggleCartItem = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { productId, quantity = 1 } = req.body;
        if (!productId) return res.status(400).json({ success: false, message: 'Product ID is required' });

        let cart = await CartModel.findOne({ user: userId, isActive: true });
        if (!cart) cart = new CartModel({ user: userId, products: [], isActive: true });

        // Robust ID matching to prevent duplicates
        const productIndex = cart.products.findIndex(p => {
            const pId = (p.product?._id || p.product).toString();
            return pId === productId;
        });

        if (productIndex > -1) {
            cart.products[productIndex].quantity += Number(quantity);
        } else {
            cart.products.push({ product: new mongoose.Types.ObjectId(productId), quantity: Number(quantity) });
        }

        await cart.save();
        await cart.populate({
            path: 'products.product',
            populate: [
                { path: 'categoryId', select: 'categoryName _id' },
                { path: 'subcategoryId', select: 'subcategoryName _id' }
            ]
        });
        const calculatedCart = await calculateCartSubtotals(cart);
        res.status(200).json({ success: true, message: 'Cart updated', data: calculatedCart });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message || 'Error updating cart' });
    }
};

export const updateCartItemQuantity = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { productId, quantity } = req.body;
        if (!productId || quantity === undefined) return res.status(400).json({ success: false, message: 'Invalid product details' });

        const cart = await CartModel.findOne({ user: userId, isActive: true });
        if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });

        const productIndex = cart.products.findIndex(p => {
            const pId = (p.product?._id || p.product).toString();
            return pId === productId;
        });

        if (productIndex > -1) {
            cart.products[productIndex].quantity = Number(quantity);
            await cart.save();
            await cart.populate({
                path: 'products.product',
                populate: [
                    { path: 'categoryId', select: 'categoryName _id' },
                    { path: 'subcategoryId', select: 'subcategoryName _id' }
                ]
            });
            const calculatedCart = await calculateCartSubtotals(cart);
            res.status(200).json({ success: true, message: 'Quantity updated', data: calculatedCart });
        } else {
            res.status(404).json({ success: false, message: 'Product not in cart' });
        }
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message || 'Error updating item quantity' });
    }
};

export const removeCartItem = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { productId } = req.params;
        const cart = await CartModel.findOne({ user: userId, isActive: true });
        if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });
        cart.products = cart.products.filter(p => p.product.toString() !== productId);
        await cart.save();
        await cart.populate({
            path: 'products.product',
            populate: [
                { path: 'categoryId', select: 'categoryName _id' },
                { path: 'subcategoryId', select: 'subcategoryName _id' }
            ]
        });
        const calculatedCart = await calculateCartSubtotals(cart);
        res.status(200).json({ success: true, message: 'Product removed from cart', data: calculatedCart });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message || 'Error removing item from cart' });
    }
};

export const syncOfflineCart = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { cartItems } = req.body; 
        if (!cartItems || !Array.isArray(cartItems)) return res.status(400).json({ success: false, message: 'Invalid cart items format' });
        let cart = await CartModel.findOne({ user: userId, isActive: true });
        if (!cart) cart = new CartModel({ user: userId, products: [], isActive: true });
        const validObjectId = /^[0-9a-fA-F]{24}$/;
        for (const item of cartItems) {
            const pId = (item.product?._id || item.product)?.toString();
            if (!pId || !validObjectId.test(pId)) continue; 
            const qty = Math.max(1, Number(item.quantity) || 1);
            
            const index = cart.products.findIndex(p => {
                const existingId = (p.product?._id || p.product).toString();
                return existingId === pId;
            });

            if (index > -1) {
                cart.products[index].quantity += qty;
            } else {
                cart.products.push({ product: new mongoose.Types.ObjectId(pId), quantity: qty });
            }
        }
        await cart.save();
        await cart.populate({
            path: 'products.product',
            populate: [
                { path: 'categoryId', select: 'categoryName _id' },
                { path: 'subcategoryId', select: 'subcategoryName _id' }
            ]
        });
        const calculatedCart = await calculateCartSubtotals(cart);
        res.status(200).json({ success: true, message: 'Cart synced successfully', data: calculatedCart });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message || 'Error syncing cart' });
    }
};



export const calculateCartTotals = async (req: any, res: any) => {
    try {
        const { products } = req.body;
        if (!products || !Array.isArray(products)) {
            return res.status(400).json({ success: false, message: "Invalid cart data" });
        }

        const productIds = products.map(p => (p.product?._id || p.product)?.toString()).filter(id => id && mongoose.isValidObjectId(id));
        
        // Use lean() so we get plain objects immediately
        const productDocs = await ProductModel.find({ _id: { $in: productIds } })
            .populate("categoryId", "categoryName _id")
            .populate("subcategoryId", "subcategoryName _id")
            .lean();

        const cartItemsForCalc = products.map(p => {
            const pId = (p.product?._id || p.product)?.toString();
            return { 
                product: productDocs.find(d => d._id.toString() === pId), 
                quantity: Number(p.quantity) || 1 
            };
        });

        // The calculation engine needs an object with products and a toObject method
        const cartData = {
            products: cartItemsForCalc,
            toObject: function() { return this; }
        };

        const result = await calculateCartSubtotals(cartData as any);
        res.status(200).json({ success: true, data: result });
    } catch (err: any) { 
        console.error("[CalculateTotals] Error:", err);
        res.status(500).json({ success: false, message: err.message }); 
    }
};

