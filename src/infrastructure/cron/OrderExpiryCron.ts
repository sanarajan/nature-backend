import cron from 'node-cron';
import { OrderModel } from '../database/models/OrderModel';
import Razorpay from 'razorpay';

export const expireEligiblePendingOrders = async (): Promise<number> => {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const eligibleOrders = await OrderModel.find({
        paymentMethod: { $ne: 'COD' },
        globalOrderStatus: 'PENDING',
        paymentStatus: { $in: ['Pending', 'Failed'] },
        createdAt: { $lte: cutoff }
    });

    if (eligibleOrders.length === 0) {
        return 0;
    }

    let razorpayClient: Razorpay | null = null;
    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
        try {
            razorpayClient = new Razorpay({
                key_id: process.env.RAZORPAY_KEY_ID,
                key_secret: process.env.RAZORPAY_KEY_SECRET
            });
        } catch (err) {
            console.error('[CRON] Failed to initialize Razorpay client in OrderExpiryCron:', err);
        }
    }

    let expiredCount = 0;

    for (const order of eligibleOrders) {
        try {
            // Payment race condition protection: Check Razorpay before marking expired
            if (razorpayClient && order.razorpayOrderId) {
                try {
                    const payments: any = await razorpayClient.orders.fetchPayments(order.razorpayOrderId);
                    if (payments && payments.items && payments.items.length > 0) {
                        const capturedPayment = payments.items.find((p: any) => p.status === 'captured');
                        if (capturedPayment) {
                            console.log(`[CRON] Order ${order.orderId} was paid on Razorpay (Payment: ${capturedPayment.id}). Reconciling instead of expiring.`);
                            order.paymentStatus = 'Completed';
                            order.globalOrderStatus = 'Order Placed';
                            order.razorpayPaymentId = capturedPayment.id;
                            order.orderedProducts.forEach((p: any) => {
                                if (p.orderStatus === 'Pending' || p.orderStatus === 'Failed') {
                                    p.orderStatus = 'Order Placed';
                                }
                            });
                            order.statusHistory.push({
                                status: 'Payment Reconciled via OrderExpiryCron',
                                timestamp: new Date(),
                                updatedBy: 'System'
                            });
                            await order.save();
                            continue;
                        }
                    }
                } catch (rzpErr) {
                    console.error(`[CRON] Error checking Razorpay payment status for order ${order.orderId}:`, rzpErr);
                }
            }

            // Concurrency-safe atomic transition to Expired
            const updated = await OrderModel.findOneAndUpdate(
                {
                    _id: order._id,
                    globalOrderStatus: 'PENDING',
                    paymentStatus: { $in: ['Pending', 'Failed'] }
                },
                {
                    $set: {
                        globalOrderStatus: 'Expired',
                        paymentStatus: 'Expired',
                        'orderedProducts.$[].orderStatus': 'Expired'
                    },
                    $push: {
                        statusHistory: {
                            status: 'Order Expired (24 hours unpaid)',
                            timestamp: new Date(),
                            updatedBy: 'System'
                        }
                    }
                },
                { new: true }
            );

            if (updated) {
                expiredCount++;
                console.log(`[CRON] Expired unpaid pending order ${order.orderId}`);
            }
        } catch (err) {
            console.error(`[CRON ERROR] Failed to expire order ${order.orderId}:`, err);
        }
    }

    return expiredCount;
};

export const startOrderExpiryCron = () => {
    // Run every 15 minutes to check and expire unpaid pending online orders older than 24 hours
    cron.schedule('*/15 * * * *', async () => {
        console.log('[CRON] Starting 24-Hour Online Pending Order Expiry Job');
        try {
            const count = await expireEligiblePendingOrders();
            console.log(`[CRON] Order Expiry Job finished. Expired ${count} orders.`);
        } catch (error) {
            console.error('[CRON ERROR] Order Expiry Job failed:', error);
        }
    });

    console.log('[CRON] Order Expiry Job registered successfully (every 15 minutes).');
};
