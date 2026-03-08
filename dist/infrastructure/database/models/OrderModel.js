"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const orderSchema = new mongoose_1.Schema({
    orderId: { type: String, unique: true, required: true },
    invoiceNo: { type: Number },
    paymentMethod: {
        type: String,
        enum: ['COD', 'Credit Card', 'Debit Card', 'Net Banking', 'Online'],
        required: true
    },
    paymentStatus: {
        type: String,
        enum: ['Pending', 'Success', 'Failed', 'Completed'],
    },
    globalOrderStatus: {
        type: String,
        enum: ['PLACED', 'PARTIALLY_SHIPPED', 'SHIPPED', 'PARTIALLY_DELIVERED', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'PARTIALLY_RETURNED', 'RETURNED', 'PARTIALLY_CANCELLED', 'PROCESSING', 'PARTIALLY_PROCESSING'],
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
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    packingCharge: { type: Number },
    totalPrice: { type: Number },
    discount: { type: Number, default: 0 },
    referralCode: { type: String, default: '' },
    referrerId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', default: null },
    coupon: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Coupon', default: null },
    couponName: { type: String, default: null },
    totalAmount: { type: Number },
    orderedProducts: [{
            productId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Product', required: true },
            productName: { type: String, required: true },
            category: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Category', required: true },
            quantity: { type: Number, required: true },
            discountProduct: { type: Number },
            image: { type: String, required: true },
            price: { type: Number, required: true },
            offerPercentage: { type: Number },
            offerPrice: { type: Number },
            discountOffer: { type: Number },
            offerId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Offer', default: null },
            orderStatus: {
                type: String, enum: ['Order Placed', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Pending Cancellation', 'Return', 'Returned'],
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
        }]
}, { timestamps: true });
// Standalone calculation function for maximum reliability
const calculateGlobalStatusLogic = (products) => {
    const totalItems = products.length;
    if (totalItems === 0)
        return 'PLACED';
    const statuses = products.map(p => p.orderStatus);
    const allEqual = (status) => statuses.every(s => s === status);
    const someEqual = (status) => statuses.some(s => s === status);
    // 1️⃣ All same state (strict match)
    if (allEqual('Delivered'))
        return 'DELIVERED';
    if (allEqual('Cancelled'))
        return 'CANCELLED';
    if (allEqual('Returned'))
        return 'RETURNED';
    if (allEqual('Shipped'))
        return 'SHIPPED';
    if (allEqual('Processing'))
        return 'PROCESSING';
    if (allEqual('Order Placed'))
        return 'PLACED';
    // 2️⃣ All terminal but mixed
    const terminalStates = ['Delivered', 'Cancelled', 'Returned'];
    const allTerminal = statuses.every(s => terminalStates.includes(s));
    if (allTerminal) {
        if (someEqual('Delivered'))
            return 'COMPLETED';
        if (someEqual('Returned'))
            return 'RETURNED';
        return 'CANCELLED';
    }
    // 3️⃣ Partial states
    if (someEqual('Returned'))
        return 'PARTIALLY_RETURNED';
    if (someEqual('Delivered'))
        return 'PARTIALLY_DELIVERED';
    if (someEqual('Shipped'))
        return 'PARTIALLY_SHIPPED';
    if (someEqual('Cancelled'))
        return 'PARTIALLY_CANCELLED';
    if (someEqual('Processing'))
        return 'PARTIALLY_PROCESSING';
    return 'PLACED';
};
// Pre-save hook to automatically update globalOrderStatus
orderSchema.pre('save', function (next) {
    try {
        const calculatedStatus = calculateGlobalStatusLogic(this.orderedProducts);
        this.globalOrderStatus = calculatedStatus;
        this.markModified('globalOrderStatus');
    }
    catch (err) {
        console.error('[HOOK_ERROR] Failed to update global status:', err);
    }
    next();
});
orderSchema.statics.calculateGlobalStatus = function (products) {
    return calculateGlobalStatusLogic(products);
};
orderSchema.methods.calculateGlobalOrderStatus = function () {
    return this.constructor.calculateGlobalStatus(this.orderedProducts);
};
exports.OrderModel = mongoose_1.default.model('Order', orderSchema);
