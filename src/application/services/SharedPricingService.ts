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
import { UserLoyaltyUseCases } from '../usecases/user/UserLoyaltyUseCases';

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
                    const comboBaseAmount = roundTo2(comboSetMRP * combosToApply);

                    if (combo.discountType === 'percentage') {
                        discount = roundTo2((comboBaseAmount * (combo.discountValue || 0)) / 100);
                    } else {
                        discount = roundTo2((combo.discountValue || 0) * combosToApply);
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

        const comboDistributions: Record<string, number> = {};
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
                    const usedMRP = roundTo2(price * usedQty);
                    actualUsedMRPTotal += usedMRP;
                    itemsToDistribute.push({ pId: pIdString, usedMRP });
                }
            });

            itemsToDistribute.forEach((item, idx) => {
                if (idx === itemsToDistribute.length - 1) {
                    comboDistributions[item.pId] = roundTo2(remainingComboDiscount);
                } else {
                    const share = roundTo2((item.usedMRP / actualUsedMRPTotal) * bestComboDiscount);
                    comboDistributions[item.pId] = share;
                    remainingComboDiscount = roundTo2(remainingComboDiscount - share);
                }
            });
        }

        let totalMRP = 0;
        let grandTotalDiscount = 0;
        let hasProductOfferFlag = false;

        const comboProductIds = new Set(
            bestCombo?.products.map((p: any) =>
                p.productId?._id?.toString() || p.productId?.toString()
            )
        );

        const finalProducts: any[] = [];

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

                // Push combo portion to finalProducts
                finalProducts.push({
                    product: p,
                    quantity: qtyInCombo,
                    isComboItem: true,
                    finalUnitPrice: originalPrice,
                    appliedProductOffer: null
                });
            }

            if (qtyEligibleForIndividualOffer > 0) {
                let bestProductOffer: any = null;
                let bestCategoryOffer: any = null;
                
                if (!comboProductIds.has(pIdString)) {
                    const applicableOffers = activeOffers.filter(offer =>
                        (offer.offerFor === 'product' && offer.productId?.toString() === p._id?.toString()) ||
                        (offer.offerFor === 'category' && offer.categoryId?.toString() === p.categoryId?.toString())
                    );

                    applicableOffers.forEach(offer => {
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

                // Push non-combo portion
                finalProducts.push({
                    product: p,
                    quantity: qtyEligibleForIndividualOffer,
                    isComboItem: false,
                    finalUnitPrice: Math.max(0, originalPrice - unitDiscount),
                    appliedProductOffer: appliedOfferMeta
                });
            }

            grandTotalDiscount += productTotalDiscount;
        });

        // Suppress coupon errors if not passing a code or if just fetching cart totals.
        // We only throw if an invalid coupon is supplied AND there is no other active offer blocking it.
        if ((hasComboOffer || hasProductOfferFlag) && (couponCode || referralCode)) {
            // Throw if user explicitly tried to use it, but if it's just a passive cart fetch we'll clear it instead of throwing
            // Wait, we throw so the frontend clears the coupon
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
                const coupon = await CouponModel.findOne({
                    couponName: { $regex: new RegExp(`^${couponCode}$`, 'i') },
                    status: true,
                    startDate: { $lte: now },
                    endDate: { $gte: now }
                });

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

        if (appliedInfluencer && isInfluencerEnabled) {
            finalProducts.forEach(item => {
                const prodInfluencerDiscount = Number(item.product?.influencerDiscount) || 0;
                if (prodInfluencerDiscount > 0 && item.finalUnitPrice > 0) {
                    const unitDisc = Math.min(item.finalUnitPrice, prodInfluencerDiscount);
                    const itemDiscTotal = unitDisc * item.quantity;
                    item.finalUnitPrice = Math.max(0, item.finalUnitPrice - unitDisc);
                    item.influencerDiscountAmount = itemDiscTotal;
                    influencerDiscountAmount += itemDiscTotal;
                } else {
                    item.influencerDiscountAmount = 0;
                }
            });
            if (influencerDiscountAmount > 0) {
                finalDiscountAmount += influencerDiscountAmount;
            }
        } else {
            finalProducts.forEach(item => {
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
                
                // Ensure we don't discount more than the total MRP (excluding delivery charge)
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
                    influencerCode: activeInfluencerCode
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
            // Requested explicit fields in the root
            influencerDiscount: influencerDiscountAmount,
            influencerApplied: appliedInfluencer ? {
                _id: appliedInfluencer._id,
                influencerCode: activeInfluencerCode
            } : null,
            influencerCode: appliedInfluencer ? activeInfluencerCode : null,
            naturePointsDiscount,
            naturePointsUsed,
            discountType: influencerDiscountAmount > 0 ? "Influencer" : (hasComboOffer ? "Combo" : (hasProductOfferFlag ? "Product" : (appliedCouponId ? "Coupon" : (appliedReferralCode ? "Referral" : "")))),
            total: totalAmount,
            subtotal: totalMRP
        };

        // Added Temporary Logs
        console.log(`----------------------------------`);
        console.log(`Influencer Cookie : ${influencerRef || 'None'}`);
        console.log(`Influencer Code : ${influencerRef || 'None'}`);
        console.log(`Influencer Found : ${!!(influencerRef && isInfluencerEnabled)}`);
        console.log(`Cart Products : ${cart.products.length}`);
        console.log(`Combo Applied : ${hasComboOffer}`);
        console.log(`Product Offer Applied : ${hasProductOfferFlag}`);
        console.log(`Category Offer Applied : ${hasProductOfferFlag}`); // Treating product and category offer as same boolean here based on our implementation
        console.log(`Coupon Applied : ${!!appliedCouponId}`);
        console.log(`Referral Applied : ${!!appliedReferralCode}`);
        console.log(`Offer Exists : ${hasComboOffer || hasProductOfferFlag || !!appliedCouponId || !!appliedReferralCode}`);
        console.log(`Entered Influencer Block : ${influencerDiscountAmount > 0}`);
        console.log(`Influencer % : ${influencerDiscountPercent}`);
        console.log(`Influencer Discount : ${influencerDiscountAmount}`);
        console.log(`Final Total : ${totalAmount}`);
        console.log(`----------------------------------`);

        if (bestCombo) {
            result.appliedComboOffer = {
                _id: bestCombo._id,
                offerName: bestCombo.offerName,
                discountValue: bestComboDiscount,
                products: bestCombo.products
            };
        }

        return result;
    }
}
