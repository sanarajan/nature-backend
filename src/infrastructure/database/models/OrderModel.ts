import mongoose, { Schema, Document } from 'mongoose';

export interface IAddress {
    house: string;
    place: string;
    city: string;
    district: string;
    state: string;
    pincode: number;
}

export interface IOrderedProduct {
    productId: mongoose.Types.ObjectId;
    productName: string;
    category: mongoose.Types.ObjectId;
    quantity: number;
    image: string;
    price: number; // Original MRP
    finalPrice: number; // Price after all discounts
    offerPrice?: number; // Deprecated: For backward compatibility
    offerPercentage?: number; // Deprecated
    discountOffer?: number; // Deprecated
    discounts: {
        productOffer?: {
            offerId: mongoose.Types.ObjectId;
            offerName: string;
            discountAmount: number;
        };
        categoryOffer?: {
            offerId: mongoose.Types.ObjectId;
            offerName: string;
            discountAmount: number;
        };
        comboOffer?: {
            offerId: mongoose.Types.ObjectId;
            offerName: string;
            discountAmount: number;
        };
        influencerDiscount?: {
            influencerId?: mongoose.Types.ObjectId;
            influencerCode?: string;
            discountAmount: number;
        };
    };
    orderStatus: 'Pending' | 'Order Placed' | 'Processing' | 'Shipped' | 'Out for Delivery' | 'Delivered' | 'Cancelled' | 'Cancellation Request' | 'Return Request' | 'Return Approved' | 'Return' | 'Returned' | 'Expired';
    shippingDetails?: {
        agencyName: string;
        trackingNumber: string;
        agencyUrl?: string;
        shippedDate: Date;
        expectedDeliveryDate?: Date;
        deliveredDate?: Date;
        returnedDate?: Date;
    };
    deliveryUpdates?: {
        previousExpectedDate?: Date;
        newExpectedDate: Date;
        reason: string;
        updatedBy: string;
        updatedDate: Date;
    }[];
    cancellation?: {
        reason?: string;
        cancelDate?: Date;
        isAccepted?: boolean;
        isRejected?: boolean;
        adminNotes?: string;
        rejectionReason?: string;
    };
    returnRequest?: {
        reason?: string;
        remarks?: string;
        images?: string[];
        requestDate?: Date;
        isAccepted?: boolean;
        isRejected?: boolean;
        adminNotes?: string;
        rejectionReason?: string;
    };
    cancelledBy?: string;
    influencerDiscount?: number;
    influencerDiscountAmount?: number;
    influencerCommissionRate?: number;
    influencerCommissionAmount?: number;
    influencerCommissionStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
    influencerWalletTransactionId?: mongoose.Types.ObjectId;
    returnExpiryDate?: Date;
}

export interface IOrderDocument extends Document {
    orderId: string;
    invoiceNo?: number;
    paymentMethod: 'COD' | 'Credit Card' | 'Debit Card' | 'Net Banking' | 'Online';
    paymentStatus?: 'Pending' | 'Success' | 'Failed' | 'Completed' | 'Refund_Pending' | 'Refunded' | 'Cancelled' | 'Returned' | 'Expired';
    globalOrderStatus: 'PENDING' | 'PLACED' | 'PARTIALLY_SHIPPED' | 'SHIPPED' | 'PARTIALLY_DELIVERED' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED' | 'PARTIALLY_RETURNED' | 'RETURNED' | 'PARTIALLY_CANCELLED' | 'PROCESSING' | 'PARTIALLY_PROCESSING' | 'CANCELLATION_REQUEST' | 'RETURN_REQUEST' | 'Expired' | 'Order Placed' | 'Processed' | 'Shipped' | 'Out for Delivery' | 'Delivered' | 'Partially Delivered' | 'Partially Fulfilled' | 'Cancelled' | 'Partially Returned' | 'Returned' | 'Closed' | 'Return Request Pending' | 'Return Approved' | 'Cancel Request Pending' | 'Action Required';
    razorpayPaymentId?: string;
    razorpayOrderId?: string;
    razorpaySignature?: string;
    address: IAddress;
    deliveryCharge: number;
    userId: mongoose.Types.ObjectId;
    packingCharge?: number;
    coupon?: mongoose.Types.ObjectId;
    couponName?: string;
    referralCode?: string;
    referrerId?: mongoose.Types.ObjectId;
    comboOffer?: mongoose.Types.ObjectId;
    comboOfferName?: string;
    totalMRP: number;
    totalDiscount: number;
    totalAmount: number;
    hasComboOffer?: boolean;
    hasProductOffer?: boolean;
    appliedOffersSummary?: string;
    orderedProducts: IOrderedProduct[];
    statusHistory: Array<{ status: string, timestamp: Date, updatedBy: string }>;
    cancelledAmount: number;
    returnedAmount: number;
    refundedAmount: number;
    
    // Influencer Attribution
    influencerId?: mongoose.Types.ObjectId;
    influencerCode?: string;
    influencerSource?: 'LINK' | 'CODE';
    influencerCommissionRate?: number;
    influencerDiscountAmount?: number;
    influencerCommissionAmount?: number;
    influencerCommissionStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';
    
    // Loyalty Rewards
    naturePointsUsed?: number;
    naturePointsDiscount?: number;
    redeemedBatches?: {
        batchId: mongoose.Types.ObjectId;
        pointsDeducted: number;
    }[];
    
    // Delivery and Return Tracking
    deliveredAt?: Date;
    returnExpiryDate?: Date;
    
    createdAt: Date;
    updatedAt: Date;
    calculateGlobalOrderStatus(): 'PENDING' | 'PLACED' | 'PARTIALLY_SHIPPED' | 'SHIPPED' | 'PARTIALLY_DELIVERED' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED' | 'PARTIALLY_RETURNED' | 'RETURNED' | 'PARTIALLY_CANCELLED' | 'PROCESSING' | 'PARTIALLY_PROCESSING' | 'CANCELLATION_REQUEST' | 'RETURN_REQUEST' | 'Expired' | 'Order Placed' | 'Processed' | 'Shipped' | 'Out for Delivery' | 'Delivered' | 'Partially Delivered' | 'Partially Fulfilled' | 'Cancelled' | 'Partially Returned' | 'Returned' | 'Closed' | 'Return Request Pending' | 'Return Approved' | 'Cancel Request Pending' | 'Action Required';
}

export interface IOrderModel extends mongoose.Model<IOrderDocument> {
    calculateGlobalStatus(products: IOrderedProduct[]): 'PENDING' | 'PLACED' | 'PARTIALLY_SHIPPED' | 'SHIPPED' | 'PARTIALLY_DELIVERED' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED' | 'PARTIALLY_RETURNED' | 'RETURNED' | 'PARTIALLY_CANCELLED' | 'PROCESSING' | 'PARTIALLY_PROCESSING' | 'CANCELLATION_REQUEST' | 'RETURN_REQUEST' | 'Expired' | 'Order Placed' | 'Processed' | 'Shipped' | 'Out for Delivery' | 'Delivered' | 'Partially Delivered' | 'Partially Fulfilled' | 'Cancelled' | 'Partially Returned' | 'Returned' | 'Closed' | 'Return Request Pending' | 'Return Approved' | 'Cancel Request Pending' | 'Action Required';
}

const orderSchema = new Schema<IOrderDocument>({
    orderId: { type: String, unique: true, required: true },
    invoiceNo: { type: Number },
    paymentMethod: {
        type: String,
        enum: ['COD', 'Credit Card', 'Debit Card', 'Net Banking', 'Online'],
        required: true
    },
    paymentStatus: {
        type: String,
        enum: ['Pending', 'Success', 'Failed', 'Completed', 'Refunded', 'Refund_Pending', 'Cancelled', 'Returned', 'Expired'],
    },
    globalOrderStatus: {
        type: String,
        enum: ['PENDING', 'PLACED', 'PARTIALLY_SHIPPED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'PARTIALLY_DELIVERED', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'PARTIALLY_RETURNED', 'RETURNED', 'PARTIALLY_CANCELLED', 'PROCESSING', 'PARTIALLY_PROCESSING', 'CANCELLATION_REQUEST', 'RETURN_REQUEST', 'Expired', 'Order Placed', 'Processed', 'Shipped', 'Out for Delivery', 'Delivered', 'Partially Delivered', 'Partially Fulfilled', 'Cancelled', 'Partially Returned', 'Returned', 'Closed', 'Return Request Pending', 'Return Approved', 'Cancel Request Pending', 'Action Required'],
        default: 'Order Placed'
    },
    razorpayPaymentId: { type: String },
    razorpayOrderId: { type: String },
    razorpaySignature: { type: String },
    address: {
        house: { type: String, required: true },
        place: { type: String, required: true },
        city: { type: String, required: true },
        district: { type: String, required: true },
        state: { type: String, required: true },
        pincode: { type: Number, required: true }
    },
    deliveryCharge: { type: Number, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    packingCharge: { type: Number },
    comboOffer: { type: Schema.Types.ObjectId, ref: 'ComboOffer', default: null },
    comboOfferName: { type: String, default: null },
    referralCode: { type: String, default: '' },
    referrerId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    coupon: { type: Schema.Types.ObjectId, ref: 'Coupon', default: null },
    couponName: { type: String, default: null },
    totalMRP: { type: Number },
    totalDiscount: { type: Number, default: 0 },
    totalAmount: { type: Number },
    hasComboOffer: { type: Boolean, default: false },
    hasProductOffer: { type: Boolean, default: false },
    appliedOffersSummary: { type: String, default: '' },
    orderedProducts: [{
        productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
        productName: { type: String, required: true },
        category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
        quantity: { type: Number, required: true },
        image: { type: String, required: true },
        price: { type: Number, required: true },
        finalPrice: { type: Number },
        discounts: {
            productOffer: {
                offerId: { type: Schema.Types.ObjectId, ref: 'Offer', default: null },
                offerName: { type: String, default: null },
                discountAmount: { type: Number, default: 0 }
            },
            categoryOffer: {
                offerId: { type: Schema.Types.ObjectId, ref: 'Offer', default: null },
                offerName: { type: String, default: null },
                discountAmount: { type: Number, default: 0 }
            },
            comboOffer: {
                offerId: { type: Schema.Types.ObjectId, ref: 'ComboOffer', default: null },
                offerName: { type: String, default: null },
                discountAmount: { type: Number, default: 0 }
            },
            influencerDiscount: {
                influencerId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
                influencerCode: { type: String, default: null },
                discountAmount: { type: Number, default: 0 }
            }
        },
        influencerDiscount: { type: Number, default: 0 },
        influencerDiscountAmount: { type: Number, default: 0 },
        influencerCommissionRate: { type: Number },
        influencerCommissionAmount: { type: Number },
        influencerCommissionStatus: { 
            type: String, 
            enum: ['PENDING', 'APPROVED', 'REJECTED'] 
        },
        influencerWalletTransactionId: { type: Schema.Types.ObjectId, ref: 'Wallet' },
        returnExpiryDate: { type: Date },
        orderStatus: {
            type: String, enum: ['Pending', 'Order Placed', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled', 'Cancellation Request', 'Return Request', 'Return Approved', 'Return', 'Returned', 'Expired'],
            default: 'Order Placed'
        },
        shippingDetails: {
            agencyName: { type: String },
            trackingNumber: { type: String },
            agencyUrl: { type: String },
            shippedDate: { type: Date },
            expectedDeliveryDate: { type: Date },
            deliveredDate: { type: Date },
            returnedDate: { type: Date }
        },
        deliveryUpdates: [{
            previousExpectedDate: { type: Date },
            newExpectedDate: { type: Date, required: true },
            reason: { type: String, required: true },
            updatedBy: { type: String, required: true },
            updatedDate: { type: Date, default: Date.now }
        }],
        cancellation: {
            reason: { type: String, default: null },
            cancelDate: { type: Date, default: null },
            isAccepted: { type: Boolean, default: false },
            isRejected: { type: Boolean, default: false },
            adminNotes: { type: String, default: null },
            rejectionReason: { type: String, default: null }
        },
        returnRequest: {
            reason: { type: String, default: null },
            remarks: { type: String, default: null },
            images: [{ type: String }],
            requestDate: { type: Date, default: null },
            isAccepted: { type: Boolean, default: false },
            isRejected: { type: Boolean, default: false },
            adminNotes: { type: String, default: null },
            rejectionReason: { type: String, default: null }
        },
        cancelledBy: { type: String }
    }],
    statusHistory: [{
        status: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        updatedBy: { type: String, default: 'System' }
    }],
    cancelledAmount: { type: Number, default: 0 },
    returnedAmount: { type: Number, default: 0 },
    refundedAmount: { type: Number, default: 0 },

    // Influencer Attribution
    influencerId: { type: Schema.Types.ObjectId, ref: 'User' },
    influencerCode: { type: String },
    influencerSource: { type: String, enum: ['LINK', 'CODE'] },
    influencerCommissionRate: { type: Number },
    influencerDiscountAmount: { type: Number, default: 0 },
    influencerCommissionAmount: { type: Number },
    influencerCommissionStatus: { 
        type: String, 
        enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'EXPIRED']
    },

    // Loyalty Rewards
    naturePointsUsed: { type: Number, default: 0 },
    naturePointsDiscount: { type: Number, default: 0 },
    redeemedBatches: [{
        batchId: { type: Schema.Types.ObjectId, ref: 'NaturePointBatch', required: true },
        pointsDeducted: { type: Number, required: true }
    }],
    
    // Delivery and Return Tracking
    deliveredAt: { type: Date },
    returnExpiryDate: { type: Date }

}, { timestamps: true });

// Standalone calculation function for maximum reliability
const calculateGlobalStatusLogic = (products: IOrderedProduct[]) => {
    const totalItems = products.length;
    if (totalItems === 0) return 'Order Placed';

    const statuses = products.map(p => p.orderStatus);

    const hasCancelReq = statuses.includes('Cancellation Request');
    const hasReturnReq = statuses.includes('Return Request');
    const hasReturnApproved = statuses.includes('Return Approved');

    // Priority Rules
    if (hasCancelReq && hasReturnReq) return 'Action Required';
    if (hasCancelReq) return 'Cancel Request Pending';
    if (hasReturnReq) return 'Return Request Pending';
    if (hasReturnApproved) return 'Return Approved';

    const allEqual = (status: string) => statuses.every(s => s === status);
    const someEqual = (status: string) => statuses.some(s => s === status);

    // Cases 1-4, 8, 10
    if (allEqual('Order Placed') || allEqual('Pending')) return 'Order Placed';
    if (allEqual('Processing')) return 'Processed';
    if (allEqual('Shipped')) return 'Shipped';
    if (allEqual('Out for Delivery')) return 'Out for Delivery';
    if (allEqual('Delivered')) return 'Delivered';
    if (allEqual('Cancelled')) return 'Cancelled';
    if (allEqual('Return Approved')) return 'Return Approved';
    if (allEqual('Returned') || allEqual('Return')) return 'Returned';

    // Case 12: All products are either Returned or Cancelled
    const isTerminal = (s: string) => s === 'Returned' || s === 'Return' || s === 'Cancelled';
    if (statuses.every(isTerminal)) return 'Closed';

    // Cases 5, 6, 9, 13 (Mixes with Delivered or Out for Delivery)
    if (someEqual('Delivered') || someEqual('Out for Delivery')) {
        // Case 9: Some Returned, Remaining Delivered
        const isReturnedOrDelivered = (s: string) => s === 'Returned' || s === 'Return' || s === 'Delivered';
        if (statuses.every(isReturnedOrDelivered) && statuses.some(s => s === 'Returned' || s === 'Return')) {
            return 'Partially Returned';
        }
        // Cases 5, 6, 13
        return 'Partially Delivered';
    }

    // Cases 7, 11 (Mixes without Delivered, not all terminal)
    return 'Partially Fulfilled';
};

// Pre-save hook to automatically update globalOrderStatus, cancelledAmount, and refundAmount
orderSchema.pre('save', function (next) {
    try {
        const calculatedStatus = calculateGlobalStatusLogic(this.orderedProducts);
        this.globalOrderStatus = calculatedStatus as any;
        this.markModified('globalOrderStatus');

        let currentCancelledAmount = 0;
        let currentReturnedAmount = 0;
        this.orderedProducts.forEach(p => {
            if (p.orderStatus === 'Cancelled') {
                // FALLBACK for backward compatibility
                currentCancelledAmount += (p.finalPrice ?? p.offerPrice ?? p.price) * p.quantity;
            } else if (p.orderStatus === 'Returned') {
                currentReturnedAmount += (p.finalPrice ?? p.offerPrice ?? p.price) * p.quantity;
            }
        });
        this.cancelledAmount = currentCancelledAmount;
        this.returnedAmount = currentReturnedAmount;
        this.markModified('cancelledAmount');
        this.markModified('returnedAmount');

        // Set returnExpiryDate and deliveredAt if status is DELIVERED/Delivered and not previously set
        if (['DELIVERED', 'Delivered', 'COMPLETED', 'Completed'].includes(this.globalOrderStatus)) {
            if (!this.deliveredAt) {
                this.deliveredAt = new Date();
            }
            if (!this.returnExpiryDate) {
                const returnDays = 7; // Configurable window (default 7 days)
                const expiry = new Date(this.deliveredAt);
                expiry.setDate(expiry.getDate() + returnDays);
                this.returnExpiryDate = expiry;
            }
        }

        // Product-level return expiry date and commission status sync
        this.orderedProducts.forEach(p => {
            if (['Delivered', 'DELIVERED', 'COMPLETED', 'Completed'].includes(p.orderStatus) || ['DELIVERED', 'Delivered', 'COMPLETED', 'Completed'].includes(this.globalOrderStatus)) {
                if (!p.returnExpiryDate) {
                    const delivered = p.shippingDetails?.deliveredDate || this.deliveredAt || new Date();
                    const expiry = new Date(delivered);
                    expiry.setDate(expiry.getDate() + 7);
                    p.returnExpiryDate = expiry;
                }
            }
        });

        if (this.influencerId || this.influencerCode || (this.orderedProducts && this.orderedProducts.some(p => p.influencerCommissionAmount && p.influencerCommissionAmount > 0))) {
            let allRejectedOrCancelled = true;
            let anyApproved = false;
            let anyPending = false;
            let hasInfluencerProducts = false;

            this.orderedProducts.forEach(p => {
                if (p.influencerCommissionAmount && p.influencerCommissionAmount > 0) {
                    hasInfluencerProducts = true;
                    if (['Cancelled', 'Returned', 'Expired'].includes(p.orderStatus) && p.influencerCommissionStatus === 'PENDING') {
                        p.influencerCommissionStatus = 'REJECTED';
                    }
                    if (p.influencerCommissionStatus === 'APPROVED') anyApproved = true;
                    else if (p.influencerCommissionStatus === 'PENDING') anyPending = true;

                    if ((p.influencerCommissionStatus as string) !== 'REJECTED' && (p.influencerCommissionStatus as string) !== 'CANCELLED') {
                        allRejectedOrCancelled = false;
                    }
                }
            });

            if (hasInfluencerProducts) {
                if (allRejectedOrCancelled) {
                    this.influencerCommissionStatus = 'REJECTED';
                } else if (!anyPending && anyApproved) {
                    this.influencerCommissionStatus = 'APPROVED';
                } else if (anyPending) {
                    this.influencerCommissionStatus = 'PENDING';
                }
            } else if (this.influencerCommissionAmount && this.influencerCommissionAmount > 0) {
                if (['Cancelled', 'CANCELLED', 'Returned', 'RETURNED', 'Expired', 'EXPIRED'].includes(this.globalOrderStatus) && this.influencerCommissionStatus === 'PENDING') {
                    this.influencerCommissionStatus = 'REJECTED';
                } else if (!this.influencerCommissionStatus) {
                    this.influencerCommissionStatus = 'PENDING';
                }
            }
        }
    } catch (err) {
        console.error('[HOOK_ERROR] Failed to update global status or amounts:', err);
    }
    next();
});

orderSchema.statics.calculateGlobalStatus = function (products: IOrderedProduct[]) {
    return calculateGlobalStatusLogic(products);
};

orderSchema.methods.calculateGlobalOrderStatus = function () {
    return (this.constructor as any).calculateGlobalStatus(this.orderedProducts);
};

export const OrderModel = mongoose.model<IOrderDocument, IOrderModel>('Order', orderSchema);
