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
    discountProduct?: number;
    image: string;
    price: number;
    offerPercentage?: number;
    offerPrice?: number;
    discountOffer?: number;
    offerId?: mongoose.Types.ObjectId;
    orderStatus: 'Pending' | 'Order Placed' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled' | 'Cancellation Request' | 'Return Request' | 'Return' | 'Returned';
    shippingDetails?: {
        agencyName: string;
        trackingNumber: string;
        agencyUrl: string;
        shippedDate: Date;
    };
    cancellation?: {
        reason?: string;
        cancelDate?: Date;
    };
    cancelledBy?: string;
}

export interface IOrderDocument extends Document {
    orderId: string;
    invoiceNo?: number;
    paymentMethod: 'COD' | 'Credit Card' | 'Debit Card' | 'Net Banking' | 'Online';
    paymentStatus?: 'Pending' | 'Success' | 'Failed' | 'Completed' | 'Refund_Pending' | 'Refunded' | 'Cancelled' | 'Returned';
    globalOrderStatus: 'PENDING' | 'PLACED' | 'PARTIALLY_PROCESSING' | 'PROCESSING' | 'PARTIALLY_SHIPPED' | 'SHIPPED' | 'PARTIALLY_DELIVERED' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED' | 'PARTIALLY_RETURNED' | 'RETURNED' | 'PARTIALLY_CANCELLED' | 'CANCELLATION_REQUEST' | 'RETURN_REQUEST';
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
    discount?: number;
    totalDiscount?: number;
    totalMRP?: number;
    totalPrice?: number;
    totalAmount?: number;
    orderedProducts: IOrderedProduct[];
    statusHistory: Array<{ status: string, timestamp: Date, updatedBy: string }>;
    cancelledAmount: number;
    returnedAmount: number;
    refundedAmount: number;
    createdAt: Date;
    updatedAt: Date;
    calculateGlobalOrderStatus(): 'PENDING' | 'PLACED' | 'PARTIALLY_SHIPPED' | 'SHIPPED' | 'PARTIALLY_DELIVERED' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED' | 'PARTIALLY_RETURNED' | 'RETURNED' | 'PARTIALLY_CANCELLED' | 'PROCESSING' | 'PARTIALLY_PROCESSING' | 'CANCELLATION_REQUEST' | 'RETURN_REQUEST';
}

export interface IOrderModel extends mongoose.Model<IOrderDocument> {
    calculateGlobalStatus(products: IOrderedProduct[]): 'PENDING' | 'PLACED' | 'PARTIALLY_SHIPPED' | 'SHIPPED' | 'PARTIALLY_DELIVERED' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED' | 'PARTIALLY_RETURNED' | 'RETURNED' | 'PARTIALLY_CANCELLED' | 'PROCESSING' | 'PARTIALLY_PROCESSING' | 'CANCELLATION_REQUEST' | 'RETURN_REQUEST';
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
        enum: ['Pending', 'Success', 'Failed', 'Completed', 'Refunded', 'Refund_Pending', 'Cancelled', 'Returned'],
    },
    globalOrderStatus: {
        type: String,
        enum: ['PENDING', 'PLACED', 'PARTIALLY_SHIPPED', 'SHIPPED', 'PARTIALLY_DELIVERED', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'PARTIALLY_RETURNED', 'RETURNED', 'PARTIALLY_CANCELLED', 'PROCESSING', 'PARTIALLY_PROCESSING', 'CANCELLATION_REQUEST', 'RETURN_REQUEST'],
        default: 'PLACED'
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
    totalPrice: { type: Number },
    discount: { type: Number, default: 0 },
    referralCode: { type: String, default: '' },
    referrerId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    coupon: { type: Schema.Types.ObjectId, ref: 'Coupon', default: null },
    couponName: { type: String, default: null },
    totalAmount: { type: Number },
    orderedProducts: [{
        productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
        productName: { type: String, required: true },
        category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
        quantity: { type: Number, required: true },
        discountProduct: { type: Number },
        image: { type: String, required: true },
        price: { type: Number, required: true },
        offerPercentage: { type: Number },
        offerPrice: { type: Number },
        discountOffer: { type: Number },
        offerId: { type: Schema.Types.ObjectId, ref: 'Offer', default: null },
        orderStatus: {
            type: String, enum: ['Pending', 'Order Placed', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Cancellation Request', 'Return Request', 'Return', 'Returned'],
            default: 'Order Placed'
        },
        shippingDetails: {
            agencyName: { type: String },
            trackingNumber: { type: String },
            agencyUrl: { type: String },
            shippedDate: { type: Date }
        },
        cancellation: {
            reason: { type: String, default: null },
            cancelDate: { type: Date, default: null }
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
    refundedAmount: { type: Number, default: 0 }
}, { timestamps: true });

// Standalone calculation function for maximum reliability
const calculateGlobalStatusLogic = (products: IOrderedProduct[]) => {
    const totalItems = products.length;
    if (totalItems === 0) return 'PLACED';

    const statuses = products.map(p => p.orderStatus);

    if (statuses.some(s => s === 'Cancellation Request')) return 'CANCELLATION_REQUEST';
    if (statuses.some(s => s === 'Return Request')) return 'RETURN_REQUEST';
    if (statuses.some(s => s === 'Pending')) return 'PENDING';

    const allEqual = (status: string) =>
        statuses.every(s => s === status);

    const someEqual = (status: string) =>
        statuses.some(s => s === status);

    // 1️⃣ All same state (strict match)
    if (allEqual('Delivered')) return 'DELIVERED';
    if (allEqual('Cancelled')) return 'CANCELLED';
    if (allEqual('Returned')) return 'RETURNED';
    if (allEqual('Return')) return 'RETURNED';
    if (allEqual('Shipped')) { console.log("all shipped"); return 'SHIPPED' };
    if (allEqual('Processing')) return 'PROCESSING';
    if (allEqual('Order Placed')) return 'PLACED';

    // 2️⃣ All terminal but mixed
    const terminalStates = ['Delivered', 'Cancelled', 'Returned', 'Return'];
    const allTerminal = statuses.every(s => terminalStates.includes(s));

    if (allTerminal) {
        if (someEqual('Delivered')) return 'COMPLETED';
        if (someEqual('Returned') || someEqual('Return')) return 'RETURNED';
        return 'CANCELLED';
    }

    // 3️⃣ Partial states
    if (someEqual('Return')) return 'PARTIALLY_RETURNED';
    if (someEqual('Returned')) return 'PARTIALLY_RETURNED';
    if (someEqual('Return Request')) return 'RETURN_REQUEST'; // Added
    if (someEqual('Delivered')) return 'PARTIALLY_DELIVERED';
    if (someEqual('Shipped')) return 'PARTIALLY_SHIPPED';
    if (someEqual('Cancelled')) return 'PARTIALLY_CANCELLED';
    if (someEqual('Cancellation Request')) return 'CANCELLATION_REQUEST'; // Added
    if (someEqual('Processing')) return 'PARTIALLY_PROCESSING';

    return 'PLACED';
};

// Pre-save hook to automatically update globalOrderStatus, cancelledAmount, and refundAmount
orderSchema.pre('save', function (next) {
    try {
        const calculatedStatus = calculateGlobalStatusLogic(this.orderedProducts);
        this.globalOrderStatus = calculatedStatus as any;
        this.markModified('globalOrderStatus');

        // Calculate cancelledAmount and returnedAmount
        let currentCancelledAmount = 0;
        let currentReturnedAmount = 0;
        this.orderedProducts.forEach(p => {
            if (p.orderStatus === 'Cancelled') {
                currentCancelledAmount += (p.offerPrice || p.price) * p.quantity;
            } else if (p.orderStatus === 'Returned') {
                currentReturnedAmount += (p.offerPrice || p.price) * p.quantity;
            }
        });
        this.cancelledAmount = currentCancelledAmount;
        this.returnedAmount = currentReturnedAmount;
        this.markModified('cancelledAmount');
        this.markModified('returnedAmount');
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
