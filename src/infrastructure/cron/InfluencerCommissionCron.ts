import cron from 'node-cron';
import mongoose from 'mongoose';
import { OrderModel } from '../database/models/OrderModel';
import { UserModel } from '../database/models/UserModel';
import { WalletModel } from '../database/models/WalletModel';

export const processPendingCommissions = async () => {
    console.log('[CRON] Starting processPendingCommissions check...');
    try {
        const now = new Date();

        const eligibleOrders = await OrderModel.find({
            $and: [
                {
                    $or: [
                        { influencerId: { $exists: true, $ne: null } },
                        { influencerCode: { $exists: true, $ne: null } },
                        { 'orderedProducts.influencerCommissionAmount': { $gt: 0 } }
                    ]
                },
                {
                    $or: [
                        { influencerCommissionStatus: { $in: ['PENDING', 'APPROVED'] } },
                        { 'orderedProducts.influencerCommissionStatus': { $in: ['PENDING', 'APPROVED'] } }
                    ]
                }
            ],
            globalOrderStatus: { $in: ['DELIVERED', 'COMPLETED', 'Partially Delivered', 'Delivered', 'Completed'] }
        });

        if (eligibleOrders.length === 0) {
            console.log('[CRON] No eligible orders found for commission approval.');
            return;
        }

        let approvedCount = 0;

        for (const order of eligibleOrders) {
            let infId = order.influencerId;
            if (!infId && order.influencerCode) {
                const infUser = await UserModel.findOne({ influencerCode: { $regex: new RegExp(`^${order.influencerCode.trim()}$`, 'i') } });
                if (infUser) {
                    infId = infUser._id;
                    order.influencerId = infId;
                }
            }
            if (!infId) continue;

            const influencer = await UserModel.findById(infId);
            if (!influencer) continue;

            let wallet = await WalletModel.findOne({ userId: influencer._id });
            if (!wallet) {
                wallet = new WalletModel({ userId: influencer._id, balance: 0, history: [] });
            }

            let hasProductSnapshots = false;
            let orderModified = false;
            let influencerModified = false;
            let walletModified = false;

            for (const p of order.orderedProducts) {
                if (p.influencerCommissionAmount !== undefined && p.influencerCommissionAmount !== null && p.influencerCommissionAmount > 0) {
                    hasProductSnapshots = true;
                }

                if (p.influencerCommissionStatus !== undefined && ['PENDING', 'APPROVED'].includes(p.influencerCommissionStatus)) {
                    if (['Cancelled', 'Returned', 'Expired', 'CANCELLED', 'RETURNED', 'EXPIRED'].includes(p.orderStatus)) {
                        if (p.influencerCommissionStatus === 'PENDING') {
                            p.influencerCommissionStatus = 'REJECTED';
                            const itemComm = p.influencerCommissionAmount || 0;
                            if (itemComm > 0) {
                                influencer.influencerPendingBalance = Math.max(0, Number(((influencer.influencerPendingBalance || 0) - itemComm).toFixed(2)));
                                influencerModified = true;
                            }
                            orderModified = true;
                        }
                    } else if (['Delivered', 'DELIVERED', 'COMPLETED', 'Completed', 'Partially Delivered'].includes(p.orderStatus) || ['DELIVERED', 'COMPLETED', 'Delivered', 'Completed', 'Partially Delivered'].includes(order.globalOrderStatus)) {
                        let expiryDate = p.returnExpiryDate || order.returnExpiryDate;
                        if (!expiryDate) {
                            const delivered = p.shippingDetails?.deliveredDate || order.deliveredAt || new Date();
                            expiryDate = new Date(delivered);
                            expiryDate.setDate(expiryDate.getDate() + 7);
                            p.returnExpiryDate = expiryDate;
                            if (!order.returnExpiryDate) order.returnExpiryDate = expiryDate;
                            orderModified = true;
                        }

                        if (expiryDate && new Date(expiryDate) <= now) {
                            // Check 1: Wallet history duplicate protection
                            const existingTx = wallet.history.find(tx => 
                                tx.orderId === order.orderId && 
                                ((tx.productId && (p as any)._id && tx.productId.toString() === (p as any)._id.toString()) || 
                                 (tx.productId && (p as any).productId && tx.productId.toString() === (p as any).productId.toString()) ||
                                 (tx.description && tx.description.includes(`Product #${(p as any)._id || (p as any).productId}`))) && 
                                tx.transactionType === 'commission'
                            );

                            if (existingTx && existingTx._id) {
                                if (p.influencerCommissionStatus !== 'APPROVED' || !p.influencerWalletTransactionId) {
                                    p.influencerWalletTransactionId = existingTx._id;
                                    if (p.influencerCommissionStatus === 'PENDING') {
                                        const itemComm = Number((p.influencerCommissionAmount || 0).toFixed(2));
                                        if (itemComm > 0) {
                                            influencer.influencerPendingBalance = Math.max(0, Number(((influencer.influencerPendingBalance || 0) - itemComm).toFixed(2)));
                                            influencerModified = true;
                                        }
                                    }
                                    p.influencerCommissionStatus = 'APPROVED';
                                    orderModified = true;
                                }
                                continue;
                            }

                            // Check 2: If no transaction exists, credit exact snapshotted item commission safely
                            const itemComm = Number((p.influencerCommissionAmount || 0).toFixed(2));
                            if (itemComm > 0) {
                                const txId = new mongoose.Types.ObjectId();
                                wallet.history.push({
                                    _id: txId,
                                    transactionType: 'commission',
                                    amount: itemComm,
                                    date: new Date(),
                                    description: `Influencer Commission Order #${order.orderId} Product: ${p.productName || 'Item'} (Product #${(p as any)._id || (p as any).productId})`,
                                    orderId: order.orderId,
                                    productId: ((p as any)._id || (p as any).productId) as any
                                });
                                wallet.balance = Number(((wallet.balance || 0) + itemComm).toFixed(2));
                                walletModified = true;

                                influencer.influencerWalletBalance = Number(((influencer.influencerWalletBalance || 0) + itemComm).toFixed(2));
                                influencer.influencerTotalEarned = Number(((influencer.influencerTotalEarned || 0) + itemComm).toFixed(2));
                                if (p.influencerCommissionStatus === 'PENDING') {
                                    influencer.influencerPendingBalance = Math.max(0, Number(((influencer.influencerPendingBalance || 0) - itemComm).toFixed(2)));
                                }
                                influencerModified = true;

                                p.influencerWalletTransactionId = txId;
                                approvedCount++;
                            }
                            if (p.influencerCommissionStatus !== 'APPROVED') {
                                p.influencerCommissionStatus = 'APPROVED';
                                orderModified = true;
                            }
                        }
                    }
                }
            }

            // Fallback for old orders without product-level snapshots OR order-level commissions where hasProductSnapshots is false
            if (!hasProductSnapshots && order.influencerCommissionStatus !== undefined && ['PENDING', 'APPROVED'].includes(order.influencerCommissionStatus)) {
                if (['DELIVERED', 'COMPLETED', 'Delivered', 'Completed', 'Partially Delivered'].includes(order.globalOrderStatus)) {
                    let expiryDate = order.returnExpiryDate;
                    if (!expiryDate) {
                        const delivered = order.deliveredAt || new Date();
                        expiryDate = new Date(delivered);
                        expiryDate.setDate(expiryDate.getDate() + 7);
                        order.returnExpiryDate = expiryDate;
                        orderModified = true;
                    }

                    if (expiryDate && new Date(expiryDate) <= now) {
                        const existingTx = wallet.history.find(tx => 
                            tx.orderId === order.orderId && 
                            tx.transactionType === 'commission'
                        );

                        if (existingTx && existingTx._id) {
                            if (order.influencerCommissionStatus !== 'APPROVED') {
                                if (order.influencerCommissionStatus === 'PENDING') {
                                    const orderComm = Number((order.influencerCommissionAmount || 0).toFixed(2));
                                    if (orderComm > 0) {
                                        influencer.influencerPendingBalance = Math.max(0, Number(((influencer.influencerPendingBalance || 0) - orderComm).toFixed(2)));
                                        influencerModified = true;
                                    }
                                }
                                order.influencerCommissionStatus = 'APPROVED';
                                order.orderedProducts.forEach((p: any) => {
                                    p.influencerCommissionStatus = 'APPROVED';
                                });
                                orderModified = true;
                            }
                        } else {
                            const orderComm = Number((order.influencerCommissionAmount || 0).toFixed(2));
                            if (orderComm > 0) {
                                const txId = new mongoose.Types.ObjectId();
                                wallet.history.push({
                                    _id: txId,
                                    transactionType: 'commission',
                                    amount: orderComm,
                                    date: new Date(),
                                    description: `Influencer Commission Order #${order.orderId}`,
                                    orderId: order.orderId
                                });
                                wallet.balance = Number(((wallet.balance || 0) + orderComm).toFixed(2));
                                walletModified = true;

                                influencer.influencerWalletBalance = Number(((influencer.influencerWalletBalance || 0) + orderComm).toFixed(2));
                                influencer.influencerTotalEarned = Number(((influencer.influencerTotalEarned || 0) + orderComm).toFixed(2));
                                if (order.influencerCommissionStatus === 'PENDING') {
                                    influencer.influencerPendingBalance = Math.max(0, Number(((influencer.influencerPendingBalance || 0) - orderComm).toFixed(2)));
                                }
                                influencerModified = true;
                                approvedCount++;
                            }
                            if (order.influencerCommissionStatus !== 'APPROVED') {
                                order.influencerCommissionStatus = 'APPROVED';
                                order.orderedProducts.forEach((p: any) => {
                                    p.influencerCommissionStatus = 'APPROVED';
                                });
                                orderModified = true;
                            }
                        }
                    }
                }
            }

            // Sync order-level status when product snapshots are present
            if (hasProductSnapshots && orderModified) {
                let allRejectedOrCancelled = true;
                let anyApproved = false;
                let anyPending = false;
                let hasInfProducts = false;

                order.orderedProducts.forEach((p: any) => {
                    if (p.influencerCommissionAmount && p.influencerCommissionAmount > 0) {
                        hasInfProducts = true;
                        if (p.influencerCommissionStatus === 'APPROVED') anyApproved = true;
                        else if (p.influencerCommissionStatus === 'PENDING') anyPending = true;
                        if (p.influencerCommissionStatus !== 'REJECTED' && p.influencerCommissionStatus !== 'CANCELLED') {
                            allRejectedOrCancelled = false;
                        }
                    }
                });

                if (hasInfProducts && !anyPending) {
                    if (allRejectedOrCancelled) {
                        order.influencerCommissionStatus = 'REJECTED';
                    } else if (anyApproved) {
                        order.influencerCommissionStatus = 'APPROVED';
                    }
                }
            }

            await Promise.all([
                walletModified ? wallet.save() : Promise.resolve(),
                influencerModified ? influencer.save() : Promise.resolve(),
                orderModified ? order.save() : Promise.resolve()
            ]);
        }

        console.log(`[CRON] processPendingCommissions completed. Approved ${approvedCount} product commissions.`);
    } catch (error) {
        console.error('[CRON ERROR] processPendingCommissions failed:', error);
    }
};

export const startInfluencerCommissionCron = () => {
    // Run daily at midnight
    cron.schedule('0 0 * * *', async () => {
        console.log('[CRON] Starting Influencer Commission Approval Job');
        await processPendingCommissions();
    });
};
