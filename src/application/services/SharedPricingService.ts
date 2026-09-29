import { injectable } from 'tsyringe';
import { AppError } from '../../shared/utils/AppError';
import { STATUS_CODES } from '../../shared/constants/statusCodes';
import { ReferralSettingModel } from '../../infrastructure/database/models/ReferralSettingModel';
import { InfluencerSettingModel } from '../../infrastructure/database/models/InfluencerSettingModel';
import { UserModel } from '../../infrastructure/database/models/UserModel';
import { CouponModel } from '../../infrastructure/database/models/CouponModel';
import { OfferModel } from '../../infrastructure/database/models/OfferModel';
import { ComboOfferModel } from '../../infrastructure/database/models/ComboOfferModel';
import { ShippingChargeModel } from '../../infrastructure/database/models/ShippingChargeModel';
import { AddressModel } from '../../infrastructure/database/models/AddressModel';
import { LoyaltySettingModel } from '../../infrastructure/database/models/LoyaltySettingModel';
import { OrderModel } from '../../infrastructure/database/models/OrderModel';
import { SpinHistoryModel } from '../../infrastructure/database/models/SpinHistoryModel';
import { UserLoyaltyUseCases } from '../usecases/user/UserLoyaltyUseCases';
import { MultiComboPricingAdapter } from './MultiComboPricingAdapter';
import { MultiComboAllocator } from './MultiComboAllocator';


const roundTo2 = (num: number) => Math.round(num * 100) / 100;

interface PricingOptions {
    userId?: string;
    influencerRef?: string;
    couponCode?: string;
    referralCode?: string;
    addressId?: string;
    useNaturePoints?: boolean;
}

@injectable()
export class SharedPricingService {
    public async calculate(cart: any, options: PricingOptions = {}) {
        const { userId, influencerRef, couponCode, referralCode, addressId, useNaturePoints = false } = options;

        if (!cart || !cart.products || cart.products.length === 0) {
            throw new AppError('Cart is empty', STATUS_CODES.BAD_REQUEST);
        }

        const now = new Date();

        // Fetch all active Combo Offers
        const activeComboOffers = await ComboOfferModel.find({
            status: true,
            startDate: { $lte: now },
            endDate: { $gte: now }
        }).populate('products.productId');

        // Fetch all active Product/Category Offers
        const activeOffers = await OfferModel.find({
            status: true,
            startDate: { $lte: now },
            endDate: { $gte: now }
        });

        let appliedComboOfferId: any = null;
        let appliedComboOfferName: string = '';
        let hasComboOffer = false;

        let bestCombo: any = null;
        let bestComboDiscount = 0;
        let applications = 0;
        let totalMRP = 0;
        let grandTotalDiscount = 0;
        let hasProductOfferFlag = false;
        let appliedComboOffersList: any[] = [];
        const finalProducts: any[] = [];
        let comboDistributions: Record<string, number> = {};

        const isMultiMode = process.env.ENABLE_MULTI_COMBO_PRICING === 'true';

        if (isMultiMode) {
            let multiComboResult: any = null;
            try {
                const adapterInput = MultiComboPricingAdapter.buildAllocatorInput(cart, activeComboOffers);
                multiComboResult = MultiComboAllocator.calculateBestAllocation(adapterInput.cartItems, adapterInput.comboOffers);
            } catch (err) {
                console.error('Multi-combo engine error:', err);
                throw err;
            }

            cart.products.filter((item: any) => item.product).forEach((item: any) => {
                const originalPrice = Number(item.product?.price) || 0;
                const totalQty = item.quantity || 1;
                totalMRP += (originalPrice * totalQty);
            });

            const multiAllocationsByProduct: Record<string, Array<any>> = {};
            let totalMultiComboDiscount = 0;

            multiComboResult.allocations.forEach((alloc: any) => {
                const comboOffer = activeComboOffers.find((c: any) => c._id.toString() === alloc.comboOfferId);
                if (!comboOffer) return;

                appliedComboOffersList.push({
                    offerId: comboOffer._id,
                    offerName: comboOffer.offerName,
                    applications: alloc.applications,
                    discountAmount: alloc.totalDiscount
                });
                
                totalMultiComboDiscount += alloc.totalDiscount;

                let remainingComboDiscount = alloc.totalDiscount;
                const itemsToDistribute: any[] = [];
                let actualUsedMRPTotal = 0;

                comboOffer.products.forEach((cp: any) => {
                    const pIdString = cp.productId?._id?.toString() || cp.productId?.toString();
                    if (!pIdString) return;
                    
                    const usedQty = cp.requiredQuantity * alloc.applications;
                    if (usedQty > 0) {
                        const cartItem = cart.products.find((i: any) => i.product?._id?.toString() === pIdString);
                        const price = Number(cartItem?.product?.price) || 0;
                        const usedMRP = Math.round((price * usedQty) * 100) / 100;
                        actualUsedMRPTotal += usedMRP;
                        itemsToDistribute.push({ pId: pIdString, usedMRP, usedQty, cp });
                    }
                });

                itemsToDistribute.forEach((item, idx) => {
                    let share = 0;
                    if (idx === itemsToDistribute.length - 1) {
                        share = Math.round(remainingComboDiscount * 100) / 100;
                    } else {
                        share = Math.round(((item.usedMRP / actualUsedMRPTotal) * alloc.totalDiscount) * 100) / 100;
                        remainingComboDiscount = Math.round((remainingComboDiscount - share) * 100) / 100;
                    }

                    if (!multiAllocationsByProduct[item.pId]) {
                        multiAllocationsByProduct[item.pId] = [];
                    }
                    multiAllocationsByProduct[item.pId].push({
                        comboOfferId: comboOffer._id,
                        comboOfferName: comboOffer.offerName,
                        quantity: item.usedQty,
                        discountAmount: share
                    });
                    
                    comboDistributions[item.pId] = (comboDistributions[item.pId] || 0) + share;
                });
            });

            if (appliedComboOffersList.length > 0) {
                const sorted = [...appliedComboOffersList].sort((a, b) => b.discountAmount - a.discountAmount);
                const primary = sorted[0];
                bestCombo = activeComboOffers.find((c: any) => c._id.toString() === primary.offerId.toString());
                bestComboDiscount = totalMultiComboDiscount;
                hasComboOffer = true;
                appliedComboOfferId = bestCombo._id;
                appliedComboOfferName = bestCombo.offerName;
            }

            cart.products.filter((item: any) => item.product).forEach((item: any) => {
                const p = item.product as any;
                const originalPrice = Number(p?.price) || 0;
                const totalQty = item.quantity || 1;
                const pIdString = p?._id?.toString();

                let qtyInCombo = 0;
                const allocs = multiAllocationsByProduct[pIdString] || [];
                
                allocs.forEach((alloc: any) => {
                    qtyInCombo += alloc.quantity;
                    grandTotalDiscount += alloc.discountAmount;

                    finalProducts.push({
                        product: p,
                        quantity: alloc.quantity,
                        isComboItem: true,
                        finalUnitPrice: originalPrice,
                        appliedProductOffer: null,
                        comboAllocations: [alloc]
                    });
                });

                const qtyEligibleForIndividualOffer = totalQty - qtyInCombo;

                if (qtyEligibleForIndividualOffer > 0) {
                    let bestProductOffer: any = null;
                    let bestCategoryOffer: any = null;
                    
                    const applicableOffers = activeOffers.filter((offer: any) =>
                        (offer.offerFor === 'product' && offer.productId?.toString() === p._id?.toString()) ||
                        (offer.offerFor === 'category' && offer.categoryId?.toString() === p.categoryId?.toString())
                    );

                    applicableOffers.forEach((offer: any) => {
                        let discountAmt = 0;
                        if (offer.discountType === 'percentage') {
                            discountAmt = (originalPrice * (offer.discountValue || 0)) / 100;
                        } else {
                            discountAmt = offer.discountValue || 0;
                        }

                        if (offer.offerFor === 'product') {
                            if (!bestProductOffer || discountAmt > (bestProductOffer.amt || 0)) {
                                bestProductOffer = { offer, amt: discountAmt };
                            }
                        } else {
                            if (!bestCategoryOffer || discountAmt > (bestCategoryOffer.amt || 0)) {
                                bestCategoryOffer = { offer, amt: discountAmt };
                            }
                        }
                    });

                    let unitDiscount = 0;
                    let appliedOfferMeta = null;

                    if (bestProductOffer) {
                        unitDiscount = Math.round(bestProductOffer.amt);
                        const amt = unitDiscount * qtyEligibleForIndividualOffer;
                        grandTotalDiscount += amt;
                        hasProductOfferFlag = true;

                        appliedOfferMeta = {
                            offerId: bestProductOffer.offer._id,
                            offerName: bestProductOffer.offer.offerName,
                            discountType: bestProductOffer.offer.discountType,
                            discountValue: bestProductOffer.offer.discountValue,
                            finalUnitPrice: Math.max(0, originalPrice - unitDiscount)
                        };
                    } else if (bestCategoryOffer) {
                        unitDiscount = Math.round(bestCategoryOffer.amt);
                        const amt = unitDiscount * qtyEligibleForIndividualOffer;
                        grandTotalDiscount += amt;
                        hasProductOfferFlag = true;

                        appliedOfferMeta = {
                            offerId: bestCategoryOffer.offer._id,
                            offerName: bestCategoryOffer.offer.offerName,
                            discountType: bestCategoryOffer.offer.discountType,
                            discountValue: bestCategoryOffer.offer.discountValue,
                            finalUnitPrice: Math.max(0, originalPrice - unitDiscount)
                        };
                    }

                    finalProducts.push({
                        product: p,
                        quantity: qtyEligibleForIndividualOffer,
                        isComboItem: false,
                        finalUnitPrice: Math.max(0, originalPrice - unitDiscount),
                        appliedProductOffer: appliedOfferMeta,
                        comboAllocations: []
                    });
                }
            });

        } else {
            // LEGACY LOGIC
            for (const combo of activeComboOffers) {
                let isComboMet = true;
                let comboSetMRP = 0;

                if (!combo.products || !Array.isArray(combo.products)) continue;

                const requirements: Record<string, number> = {};
                for (const cp of combo.products) {
                    const prodDoc: any = cp.productId;
                    const pId = prodDoc?._id?.toString() || cp.productId?.toString();
                    if (!pId) continue;
                    requirements[pId] = (requirements[pId] || 0) + cp.requiredQuantity;
                    
                    const price = Number(prodDoc?.price) || 0;
                    comboSetMRP += price * cp.requiredQuantity;
                }

                const requiredPIds = Object.keys(requirements);
                if (requiredPIds.length === 0) continue;

                for (const pId of requiredPIds) {
                    const cartItem = cart.products.find((cp: any) => cp.product?._id?.toString() === pId);
                    if (!cartItem || cartItem.quantity < requirements[pId]) {
                        isComboMet = false;
                        break;
                    }
                }

                if (isComboMet) {
                    let possibleApps = Infinity;
                    for (const pId of requiredPIds) {
                        const cartItem = cart.products.find((i: any) => i.product?._id?.toString() === pId);
                        if (!cartItem) continue;
                        const appsForThisProd = Math.floor(cartItem.quantity / requirements[pId]);
                        possibleApps = Math.min(possibleApps, appsForThisProd);
                    }

                    if (possibleApps > 0 && possibleApps !== Infinity) {
                        let combosToApply = possibleApps;
                        if (combo.maxUsagePerOrder && combo.maxUsagePerOrder > 0) {
                            combosToApply = Math.min(possibleApps, combo.maxUsagePerOrder);
                        }

                        let discount = 0;
                        const comboBaseAmount = Math.round((comboSetMRP * combosToApply) * 100) / 100;

                        if (combo.discountType === 'percentage') {
                            discount = Math.round(((comboBaseAmount * (combo.discountValue || 0)) / 100) * 100) / 100;
                        } else {
                            discount = Math.round(((combo.discountValue || 0) * combosToApply) * 100) / 100;
                        }

                        if (discount > bestComboDiscount) {
                            bestComboDiscount = discount;
                            bestCombo = combo;
                            applications = combosToApply;
                            hasComboOffer = true;
                        }
                    }
                }
            }

            if (bestCombo) {
                appliedComboOfferId = bestCombo._id;
                appliedComboOfferName = bestCombo.offerName;
            }

            if (bestCombo && applications > 0) {
                let remainingComboDiscount = bestComboDiscount;
                const itemsToDistribute: any[] = [];
                let actualUsedMRPTotal = 0;

                cart.products.forEach((item: any) => {
                    const pIdString = item.product?._id?.toString();
                    if (!pIdString) return;

                    const reqPerSet = bestCombo.products.reduce((acc: number, cp: any) => {
                        const cpId = cp.productId?._id?.toString() || cp.productId?.toString();
                        return cpId === pIdString ? acc + cp.requiredQuantity : acc;
                    }, 0);

                    if (reqPerSet > 0) {
                        const usedQty = reqPerSet * applications;
                        const price = Number(item.product?.price) || 0;
                        const usedMRP = Math.round((price * usedQty) * 100) / 100;
                        actualUsedMRPTotal += usedMRP;
                        itemsToDistribute.push({ pId: pIdString, usedMRP });
                    }
                });

                itemsToDistribute.forEach((item, idx) => {
                    if (idx === itemsToDistribute.length - 1) {
                        comboDistributions[item.pId] = Math.round((remainingComboDiscount) * 100) / 100;
                    } else {
                        const share = Math.round(((item.usedMRP / actualUsedMRPTotal) * bestComboDiscount) * 100) / 100;
                        comboDistributions[item.pId] = share;
                        remainingComboDiscount = Math.round((remainingComboDiscount - share) * 100) / 100;
                    }
                });
            }

            const comboProductIds = new Set(
                bestCombo?.products.map((p: any) =>
                    p.productId?._id?.toString() || p.productId?.toString()
                )
            );

            cart.products.filter((item: any) => item.product).forEach((item: any) => {
                const p = item.product as any;
                const originalPrice = Number(p?.price) || 0;
                const totalQty = item.quantity || 1;
                totalMRP += (originalPrice * totalQty);
                const pIdString = p?._id?.toString();

                let qtyInCombo = 0;
                if (bestCombo) {
                    const reqPerSet = bestCombo.products.reduce((acc: number, cp: any) => {
                        const cpId = cp.productId?._id?.toString() || cp.productId?.toString();
                        return cpId === pIdString ? acc + cp.requiredQuantity : acc;
                    }, 0);
                    qtyInCombo = reqPerSet * applications;
                }

                const qtyEligibleForIndividualOffer = totalQty - qtyInCombo;
                let productTotalDiscount = 0;

                if (qtyInCombo > 0) {
                    const share = comboDistributions[pIdString] || 0;
                    productTotalDiscount += share;

                    finalProducts.push({
                        product: p,
                        quantity: qtyInCombo,
                        isComboItem: true,
                        finalUnitPrice: originalPrice,
                        appliedProductOffer: null,
                        comboAllocations: [
                            {
                                comboOfferId: bestCombo._id,
                                comboOfferName: bestCombo.offerName,
                                quantity: qtyInCombo,
                                discountAmount: share
                            }
                        ]
                    });
                }

                if (qtyEligibleForIndividualOffer > 0) {
                    let bestProductOffer: any = null;
                    let bestCategoryOffer: any = null;
                    
                    if (!comboProductIds.has(pIdString)) {
                        const applicableOffers = activeOffers.filter((offer: any) =>
                            (offer.offerFor === 'product' && offer.productId?.toString() === p._id?.toString()) ||
                            (offer.offerFor === 'category' && offer.categoryId?.toString() === p.categoryId?.toString())
                        );

                        applicableOffers.forEach((offer: any) => {
                            let discountAmt = 0;
                            if (offer.discountType === 'percentage') {
                                discountAmt = (originalPrice * (offer.discountValue || 0)) / 100;
                            } else {
                                discountAmt = offer.discountValue || 0;
                            }

                            if (offer.offerFor === 'product') {
                                if (!bestProductOffer || discountAmt > (bestProductOffer.amt || 0)) {
                                    bestProductOffer = { offer, amt: discountAmt };
                                }
                            } else {
                                if (!bestCategoryOffer || discountAmt > (bestCategoryOffer.amt || 0)) {
                                    bestCategoryOffer = { offer, amt: discountAmt };
                                }
                            }
                        });
                    }

                    let unitDiscount = 0;
                    let appliedOfferMeta = null;

                    if (bestProductOffer) {
                        unitDiscount = Math.round(bestProductOffer.amt);
                        const amt = unitDiscount * qtyEligibleForIndividualOffer;
                        productTotalDiscount += amt;
                        hasProductOfferFlag = true;

                        appliedOfferMeta = {
                            offerId: bestProductOffer.offer._id,
                            offerName: bestProductOffer.offer.offerName,
                            discountType: bestProductOffer.offer.discountType,
                            discountValue: bestProductOffer.offer.discountValue,
                            finalUnitPrice: Math.max(0, originalPrice - unitDiscount)
                        };
                    } else if (bestCategoryOffer) {
                        unitDiscount = Math.round(bestCategoryOffer.amt);
                        const amt = unitDiscount * qtyEligibleForIndividualOffer;
                        productTotalDiscount += amt;
                        hasProductOfferFlag = true;

                        appliedOfferMeta = {
                            offerId: bestCategoryOffer.offer._id,
                            offerName: bestCategoryOffer.offer.offerName,
                            discountType: bestCategoryOffer.offer.discountType,
                            discountValue: bestCategoryOffer.offer.discountValue,
                            finalUnitPrice: Math.max(0, originalPrice - unitDiscount)
                        };
                    }

                    finalProducts.push({
                        product: p,
                        quantity: qtyEligibleForIndividualOffer,
                        isComboItem: false,
                        finalUnitPrice: Math.max(0, originalPrice - unitDiscount),
                        appliedProductOffer: appliedOfferMeta,
                        comboAllocations: []
                    });
                }

                grandTotalDiscount += productTotalDiscount;
            });
        }

        // Suppress coupon errors if not passing a code or if just fetching cart totals.
        if ((hasComboOffer || hasProductOfferFlag) && (couponCode || referralCode)) {
            throw new AppError("Coupon or referral cannot be applied when an active offer exists.", STATUS_CODES.BAD_REQUEST);
        }

        let finalDiscountAmount = grandTotalDiscount;
        let appliedReferralCode = '';
        let appliedCouponId: any = null;

        let appliedInfluencer: any = null;
        let activeInfluencerCode: string | null = null;
        const influencerSettings = await InfluencerSettingModel.findOne({ isActive: true });
        const isInfluencerEnabled = influencerSettings ? influencerSettings.influencerEnabled : true;

        if (isInfluencerEnabled) {
            const codeToCheck = (couponCode || influencerRef || '').trim();
            if (codeToCheck) {
                const inf = await UserModel.findOne({
                    influencerCode: { $regex: new RegExp(`^${codeToCheck}$`, 'i') },
                    influencerStatus: { $in: ['Active', 'ACTIVE'] },
                    isInfluencer: true,
                    influencerRequestStatus: 'APPROVED'
                });
                if (inf && (!userId || inf._id.toString() !== userId)) {
                    appliedInfluencer = inf;
                    activeInfluencerCode = inf.influencerCode || null;
                }
            }
            if (!appliedInfluencer && influencerRef && (!couponCode || couponCode !== influencerRef)) {
                const infCookie = await UserModel.findOne({
                    influencerCode: { $regex: new RegExp(`^${influencerRef.trim()}$`, 'i') },
                    influencerStatus: { $in: ['Active', 'ACTIVE'] },
                    isInfluencer: true,
                    influencerRequestStatus: 'APPROVED'
                });
                if (infCookie && (!userId || infCookie._id.toString() !== userId)) {
                    appliedInfluencer = infCookie;
                    activeInfluencerCode = infCookie.influencerCode || null;
                }
            }
        }

        if (!hasComboOffer && !hasProductOfferFlag) {
            if (referralCode && userId) {
                const referrer = await UserModel.findOne({ referralId: referralCode });
                if (referrer && referrer._id.toString() !== userId) {
                    const settings = await ReferralSettingModel.findOne({ isActive: true });
                    const discountPercent = settings?.offerPercentage || 20;
                    finalDiscountAmount = (totalMRP * discountPercent) / 100;
                    appliedReferralCode = referralCode;
                } else if (couponCode === '') {
                    throw new AppError(`Invalid referral code`, STATUS_CODES.BAD_REQUEST);
                }
            } else if (couponCode && (!activeInfluencerCode || couponCode.toUpperCase() !== activeInfluencerCode.toUpperCase())) {
                let isWheelCoupon = false;
                let userCouponId = null;

                if (couponCode.toUpperCase().startsWith('SPIN')) {
                    const anySpinHistory = await SpinHistoryModel.findOne({ 
                        couponCode: { $regex: new RegExp(`^${couponCode}$`, 'i') } 
                    });
                    
                    if (anySpinHistory) {
                        isWheelCoupon = true;
                        const userSpinHistory = await SpinHistoryModel.findOne({
                            couponCode: { $regex: new RegExp(`^${couponCode}$`, 'i') },
                            user: userId
                        });
                        
                        if (!userSpinHistory) {
                            throw new AppError(`Invalid or expired coupon "${couponCode}"`, STATUS_CODES.BAD_REQUEST);
                        }
                        userCouponId = userSpinHistory.couponId;
                    }
                }

                let coupon = null;
                if (isWheelCoupon && userCouponId) {
                    const fetchedCoupon = await CouponModel.findById(userCouponId);
                    if (fetchedCoupon && fetchedCoupon.status && new Date(fetchedCoupon.startDate) <= now && new Date(fetchedCoupon.endDate) >= now) {
                        coupon = fetchedCoupon;
                    }
                } else {
                    coupon = await CouponModel.findOne({
                        couponName: { $regex: new RegExp(`^${couponCode}$`, 'i') },
                        status: true,
                        startDate: { $lte: now },
                        endDate: { $gte: now }
                    });
                }

                if (!isWheelCoupon && coupon && userId) {
                    const previousUsage = await OrderModel.findOne({
                        userId: userId,
                        coupon: coupon._id,
                        globalOrderStatus: { $nin: ['PENDING', 'Expired', 'Failed', 'CANCELLED', 'CANCELLATION_REQUEST', 'Cancelled'] }
                    });

                    if (previousUsage) {
                        throw new AppError('Coupon already used', STATUS_CODES.BAD_REQUEST);
                    }
                }

                if (coupon) {
                    if (totalMRP >= coupon.minPurchase) {
                        if (coupon.discountType === 'Percentage') {
                            finalDiscountAmount = (totalMRP * (coupon.discountPercentage || 0)) / 100;
                        } else {
                            finalDiscountAmount = coupon.discountValue || 0;
                        }
                        appliedCouponId = coupon._id;
                    } else {
                        throw new AppError(`Minimum purchase of ₹${coupon.minPurchase} required for coupon "${couponCode}"`, STATUS_CODES.BAD_REQUEST);
                    }
                } else { 
                    let existingCoupon = null;
                    if (isWheelCoupon && userCouponId) {
                        existingCoupon = await CouponModel.findById(userCouponId);
                    } else {
                        existingCoupon = await CouponModel.findOne({
                            couponName: { $regex: new RegExp(`^${couponCode}$`, 'i') }
                        });
                    }

                    if (existingCoupon && !existingCoupon.status) {
                        throw new AppError('Coupon already used', STATUS_CODES.BAD_REQUEST);
                    }
                    throw new AppError(`Invalid or expired coupon "${couponCode}"`, STATUS_CODES.BAD_REQUEST);
                }
            }
        }

        let deliveryCharge = 0;
        let addressDoc = null;
        if (addressId) {
            addressDoc = await AddressModel.findById(addressId);
            if (!addressDoc) {
                throw new AppError('Shipping address not found', STATUS_CODES.NOT_FOUND);
            }
            deliveryCharge = 50;
            const stateCharge = await ShippingChargeModel.findOne({
                state: { $regex: new RegExp(`^${addressDoc.state}$`, 'i') },
                isActive: true
            });

            if (stateCharge) {
                deliveryCharge = stateCharge.charge;
            }
        }

        let influencerDiscountAmount = 0;
        const influencerDiscountPercent = influencerSettings?.influencerDiscountPercent || 20;

        let isInfluencerDiscountEligible = true;
        let influencerDaysRemaining = 0;

        if (appliedInfluencer && userId && isInfluencerEnabled) {
            const lastDiscountedOrder = await OrderModel.findOne({
                userId: userId,
                influencerDiscountAmount: { $gt: 0 },
                paymentStatus: { $ne: 'Failed' },
                globalOrderStatus: { $nin: ['CANCELLED', 'Cancelled', 'Expired'] }
            }).sort({ createdAt: -1 });

            if (lastDiscountedOrder) {
                const lastOrderTime = new Date(lastDiscountedOrder.createdAt).getTime();
                const diffMs = now.getTime() - lastOrderTime;
                const diffDays = diffMs / (1000 * 60 * 60 * 24);

                if (diffDays < 90) {
                    isInfluencerDiscountEligible = false;
                    influencerDaysRemaining = Math.max(1, Math.ceil(90 - diffDays));
                }
            }
        }

        if (appliedInfluencer && isInfluencerEnabled && isInfluencerDiscountEligible && !appliedCouponId && !appliedReferralCode) {
            
            let hasProductSpecificDiscount = false;
            finalProducts.forEach((item: any) => {
                const prodInfluencerDiscount = Number(item.product?.influencerDiscount) || 0;
                if (prodInfluencerDiscount > 0) {
                    hasProductSpecificDiscount = true;
                }
            });

            if (hasProductSpecificDiscount) {
                finalProducts.forEach((item: any) => {
                    const prodInfluencerDiscount = Number(item.product?.influencerDiscount) || 0;
                    const discountType = (item.product as any)?.influencerDiscountType?.toLowerCase() || 'fixed';
                    
                    if (prodInfluencerDiscount > 0 && item.finalUnitPrice > 0) {
                        let unitDisc = 0;
                        if (discountType === 'percentage' || discountType === 'percent') {
                            unitDisc = (item.finalUnitPrice * prodInfluencerDiscount) / 100;
                        } else {
                            unitDisc = Math.min(item.finalUnitPrice, prodInfluencerDiscount);
                        }
                        
                        const itemDiscTotal = unitDisc * item.quantity;
                        item.finalUnitPrice = Math.max(0, item.finalUnitPrice - unitDisc);
                        item.influencerDiscountAmount = itemDiscTotal;
                        influencerDiscountAmount += itemDiscTotal;
                    } else {
                        item.influencerDiscountAmount = 0;
                    }
                });
            } else {
                finalProducts.forEach((item: any) => {
                    if (item.finalUnitPrice > 0) {
                        const unitDisc = (item.finalUnitPrice * influencerDiscountPercent) / 100;
                        const itemDiscTotal = unitDisc * item.quantity;
                        item.finalUnitPrice = Math.max(0, item.finalUnitPrice - unitDisc);
                        item.influencerDiscountAmount = itemDiscTotal;
                        influencerDiscountAmount += itemDiscTotal;
                    } else {
                        item.influencerDiscountAmount = 0;
                    }
                });
            }

            if (influencerDiscountAmount > 0) {
                finalDiscountAmount += influencerDiscountAmount;
            }
        } else {
            finalProducts.forEach((item: any) => {
                item.influencerDiscountAmount = 0;
            });
        }

        let naturePointsDiscount = 0;
        let naturePointsUsed = 0;
        let naturePointsEligibility = {
            isEligible: false,
            isLoyaltyEnabled: true,
            isRedemptionEnabled: true,
            minOrderAmountToRedeem: 0,
            minPointsRequiredToRedeem: 0,
            availablePoints: 0,
            disabledReason: ''
        };

        if (userId) {
            const loyaltyUseCases = new UserLoyaltyUseCases();
            const availablePoints = await loyaltyUseCases.getAvailablePoints(userId);
            const settings = await LoyaltySettingModel.findOne();

            naturePointsEligibility.availablePoints = availablePoints || 0;
            if (settings) {
                naturePointsEligibility.isLoyaltyEnabled = settings.isLoyaltyEnabled;
                naturePointsEligibility.isRedemptionEnabled = settings.isRedemptionEnabled ?? true;
                naturePointsEligibility.minOrderAmountToRedeem = settings.minOrderAmountToRedeem || 0;
                naturePointsEligibility.minPointsRequiredToRedeem = settings.minPointsRequiredToRedeem || 0;
            }

            if (!naturePointsEligibility.isLoyaltyEnabled) {
                naturePointsEligibility.disabledReason = 'Nature Points program is currently disabled.';
            } else if (!naturePointsEligibility.isRedemptionEnabled) {
                naturePointsEligibility.disabledReason = 'Nature Points redemption is currently disabled.';
            } else if (totalMRP < naturePointsEligibility.minOrderAmountToRedeem) {
                naturePointsEligibility.disabledReason = `Orders below ₹${naturePointsEligibility.minOrderAmountToRedeem} cannot redeem Nature Points.`;
            } else if (naturePointsEligibility.availablePoints < naturePointsEligibility.minPointsRequiredToRedeem) {
                naturePointsEligibility.disabledReason = `Minimum ${naturePointsEligibility.minPointsRequiredToRedeem} Nature Points required to redeem.`;
            } else if (naturePointsEligibility.availablePoints <= 0) {
                naturePointsEligibility.disabledReason = 'You have 0 available Nature Points.';
            } else {
                naturePointsEligibility.isEligible = true;
            }

            if (useNaturePoints && naturePointsEligibility.isEligible && settings) {
                const maxRedeemable = Math.min(availablePoints, settings.maxRedeemablePerOrder);
                const discountValue = maxRedeemable * settings.pointValueInRupees;
                
                const maxAllowedDiscount = totalMRP - finalDiscountAmount;
                if (discountValue > maxAllowedDiscount) {
                    naturePointsDiscount = maxAllowedDiscount;
                    naturePointsUsed = Math.ceil(maxAllowedDiscount / settings.pointValueInRupees);
                } else {
                    naturePointsDiscount = discountValue;
                    naturePointsUsed = maxRedeemable;
                }
                finalDiscountAmount += naturePointsDiscount;
            }
        }

        const totalAmount = totalMRP + deliveryCharge - finalDiscountAmount;

        const result: any = {
            ...cart.toObject ? cart.toObject() : cart,
            products: finalProducts,
            pricing: {
                subtotalMRP: totalMRP,
                comboDiscount: bestComboDiscount,
                productDiscount: grandTotalDiscount - bestComboDiscount,
                couponDiscount: appliedCouponId ? (finalDiscountAmount - grandTotalDiscount - influencerDiscountAmount) : 0,
                referralDiscount: appliedReferralCode ? (finalDiscountAmount - grandTotalDiscount - influencerDiscountAmount) : 0,
                influencerDiscount: influencerDiscountAmount,
                influencerDiscountAmount,
                influencerCode: appliedInfluencer ? activeInfluencerCode : null,
                influencerApplied: appliedInfluencer ? {
                    _id: appliedInfluencer._id,
                    influencerCode: activeInfluencerCode,
                    isEligible: isInfluencerDiscountEligible,
                    daysRemaining: influencerDaysRemaining
                } : null,
                influencerEligibility: appliedInfluencer ? {
                    isEligible: isInfluencerDiscountEligible,
                    daysRemaining: influencerDaysRemaining
                } : null,
                discountType: influencerDiscountAmount > 0 ? "Influencer" : (hasComboOffer ? "Combo" : (hasProductOfferFlag ? "Product" : (appliedCouponId ? "Coupon" : (appliedReferralCode ? "Referral" : "")))),
                totalDiscount: finalDiscountAmount,
                naturePointsDiscount,
                naturePointsUsed,
                naturePointsEligibility,
                deliveryCharge,
                total: totalAmount,
                originalPrice: totalMRP,
                finalPrice: totalAmount,
                comboDistributions
            },
            appliedDiscounts: {
                combo: hasComboOffer,
                productOrCategory: hasProductOfferFlag,
                coupon: !!appliedCouponId,
                referral: !!appliedReferralCode,
                influencer: influencerDiscountAmount > 0 || !!appliedInfluencer
            },
            influencerDiscount: influencerDiscountAmount,
            influencerApplied: appliedInfluencer ? {
                _id: appliedInfluencer._id,
                influencerCode: activeInfluencerCode,
                isEligible: isInfluencerDiscountEligible,
                daysRemaining: influencerDaysRemaining
            } : null,
            influencerEligibility: appliedInfluencer ? {
                isEligible: isInfluencerDiscountEligible,
                daysRemaining: influencerDaysRemaining
            } : null,
            influencerCode: appliedInfluencer ? activeInfluencerCode : null,
            naturePointsDiscount,
            naturePointsUsed,
            discountType: influencerDiscountAmount > 0 ? "Influencer" : (hasComboOffer ? "Combo" : (hasProductOfferFlag ? "Product" : (appliedCouponId ? "Coupon" : (appliedReferralCode ? "Referral" : "")))),
            total: totalAmount,
            subtotal: totalMRP
        };

        if (isMultiMode) {
            result.appliedComboOffers = appliedComboOffersList;
            if (bestCombo) {
                result.appliedComboOffer = {
                    _id: bestCombo._id,
                    offerName: bestCombo.offerName,
                    discountValue: bestComboDiscount,
                    products: bestCombo.products
                };
            } else {
                result.appliedComboOffer = null;
            }
        } else {
            result.appliedComboOffers = [];
            if (bestCombo) {
                result.appliedComboOffer = {
                    _id: bestCombo._id,
                    offerName: bestCombo.offerName,
                    discountValue: bestComboDiscount,
                    products: bestCombo.products
                };
                result.appliedComboOffers = [
                    {
                        offerId: bestCombo._id,
                        offerName: bestCombo.offerName,
                        applications: applications,
                        discountAmount: bestComboDiscount
                    }
                ];
            }
        }

        return result;
    }
}
