// src/workers/payout.worker.ts
import { Queue, Worker } from 'bullmq';
import { PayoutService } from '@services/payout.service';
import { Container } from 'typedi';
import { PayoutModel } from '@/models/Payout.model';
import { REDIS_HOST, REDIS_PORT } from '@config';
import Razorpay from 'razorpay';
import { OrderModel } from '@/models/Order.model';
import { PaymentModel } from '@/models/Payment.model';
import { Product } from '@/models/Product.model';
import { StoreModel } from '@/models/Store.model';
import axios from 'axios';
import { UserModel } from '@/models/users.model';
import { cartModel } from '@/models/cart.model';

const razorpayX = new Razorpay({
    key_id: "rzp_test_kghAwVX1ISLmoi",
    key_secret: "NnB5pXhUXLranWMEUPuF31L4",

})


export function initializePayoutWorker() {
    console.log("Worker initialized");

    const worker = new Worker('payouts', async job => {
        const { payoutId, amount, fundAccountId, storeData } = job.data;
        const payoutService = Container.get(PayoutService);
        console.log("job.data", job.data)

        try {
            const payoutRecord = await PayoutModel.findById(payoutId);
            if (!payoutRecord) throw new Error("Payout record not found");

            const order = await OrderModel.findOne({ _id: payoutRecord.DatabaseOrderId, storeId: storeData._id });

            if (!order || order.orderStatus === 'cancelled' || order.refundStatus === 'refunded' || order.paymentStatus === 'unpaid') {
                await PayoutModel.findByIdAndUpdate(payoutId, {
                    status: 'failed',
                    error: "Order was cancelled before payout",
                    refundId: order.refundId || null,

                });
                return;
            }

            await PayoutModel.findByIdAndUpdate(payoutId, {
                status: 'processing',
                processingStartedAt: new Date(),
            });

            const payoutResponse = await payoutService.amoutToSeller(
                fundAccountId,
                amount,
                storeData
            );

            await PayoutModel.findByIdAndUpdate(payoutId, {
                status: 'processed',
                razorpayPayoutId: payoutResponse.id,
                utr: payoutResponse.utr,
                processedAt: new Date(),
                error: null,
            });
            order.payoutStatus = 'processed'
            await order.save()
        } catch (error) {
            console.error(`Payout processing failed:`, error);
            await PayoutModel.findByIdAndUpdate(payoutId, {
                status: 'failed',
                error: error.message.substring(0, 500),
                retryCount: job.attemptsMade
            });

            if (job.attemptsMade >= (job.opts?.attempts || 0)) {
                await PayoutModel.findByIdAndUpdate(payoutId, {
                    status: 'failed'
                });
            }
            throw error;
        }
    }, {
        connection: {
            host: REDIS_HOST,
            port: Number(REDIS_PORT),
        },
        limiter: {
            max: 10,
            duration: 1000
        }
    });

    worker.on('completed', job => {
        console.log(`Payout processed for job ${job.id}`);
    });

    worker.on('failed', (job, err) => {
        console.error(`Payout failed for job ${job?.id}:`, err);
    });

    return worker;
}


export function initializeShippingWorker() {
    const worker = new Worker('shipping', async (job) => {
        try {
            const { orderId, productId, trackingNumber, cartId, storeId } = job.data;
            console.log("orderId:", orderId);
            console.log("cartId:", cartId);
            console.log("productId:", productId);
            console.log("storeId:", storeId);
            console.log("Call initializeShippingWorker")
            const store = await StoreModel.findById(storeId);



            switch (job.name) {
                case 'processShipping':
                    await handleShippedStatus(cartId, productId, trackingNumber, store, orderId);
                    await scheduleNextJob('processOutForDelivery', cartId, productId, trackingNumber, 2 * 60 * 1000, orderId);
                    break;

                case 'processOutForDelivery':
                    await handleOutForDeliveryStatus(cartId, productId, trackingNumber, orderId);
                    await scheduleNextJob('processDelivered', cartId, productId, trackingNumber, 3 * 60 * 1000, orderId);
                    break;

                case 'processDelivered':
                    await handleDeliveredStatus(cartId, productId, trackingNumber, orderId);
                    break;
            }
        } catch (error) {
            console.error(`Job ${job.id} failed:`, error);
            throw error;
        }
    }, {
        connection: {
            host: REDIS_HOST,
            port: Number(REDIS_PORT),
        },
        limiter: {
            max: 10,
            duration: 1000
        }
    });


    worker.on('completed', (job) => console.log(`Job for initializeShippingWorker${job.id} completed`));
    worker.on('failed', (job, err) => console.error(`Job ${job.id} failed:`, err));

    return worker;
}


async function handleShippedStatus(cartId: string, productId: string, trackingNumber: string, store: any, orderId: string) {
    await cartModel.findByIdAndUpdate(cartId, {
        $set: {
            'products.$[elem].shippingStatus': 'shipped',
            'products.$[elem].trackingNumber': trackingNumber,
            'products.$[elem].shippedAt': new Date(),
            'products.$[elem].deliveryAgentName': store.fullName,
            'products.$[elem].deliveryAgentPhone': store.mobile,
            'products.$[elem].estimatedDelivery': new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        },

    }

        , { arrayFilters: [{ 'elem.productId': productId }] });
    console.log("handleShippedStatus")
    await OrderModel.findByIdAndUpdate(orderId, { orderStatus: 'shipped' }, { new: true })
}

async function handleOutForDeliveryStatus(cartId: string, productId: string, trackingNumber: string, orderId: string) {
    await cartModel.findByIdAndUpdate(cartId, {
        $set: {
            'products.$[elem].shippingStatus': 'out_for_delivery',
            'products.$[elem].trackingNumber': trackingNumber
        },
    }, { arrayFilters: [{ 'elem.productId': productId }] });
    await OrderModel.findByIdAndUpdate(orderId, { orderStatus: 'out_for_delivery' }, { new: true })

    console.log("handleOutForDeliveryStatus");
}

async function handleDeliveredStatus(cartId: string, productId: string, trackingNumber: string, orderId: string) {
    await cartModel.findByIdAndUpdate(cartId, {
        $set: {
            'products.$[elem].shippingStatus': 'delivered',
            'products.$[elem].deliveredAt': new Date(),
            'products.$[elem].trackingNumber': trackingNumber
        },
    }, { arrayFilters: [{ 'elem.productId': productId }] });
    await OrderModel.findByIdAndUpdate(orderId, { orderStatus: 'delivered' }, { new: true })

    console.log("handleDeliveredStatus")
}

async function scheduleNextJob(jobName: string, cartId: string, productId: string, trackingNumber: string, delay: number, orderId: string) {
    const shippingQueue = new Queue('shipping', {
        connection: {
            host: REDIS_HOST,
            port: Number(REDIS_PORT),
        }
    });
    await shippingQueue.add(jobName, { cartId, productId, trackingNumber, orderId }, { delay });
    console.log("scheduleNextJob")
}



// export function initializeShippingWorker() {
//     console.log("Shipping Worker initialized");

//     const worker = new Worker('shipping', async job => {
//         const { productId, trackingNumber, quantity, shippingAddress, storeId, orderId } = job.data;

//         try {
//             const product = await Product.findById(productId);
//             if (!product) throw new Error("Product not found");

//             const store = await StoreModel.findById(storeId);
//             if (!store) throw new Error("Store not found");

//             const order = await OrderModel.findById(orderId);
//             if (!order) throw new Error("Order not found");

//             const shippingDetails = {
//                 courierPartner: 'Internal Carrier',
//                 estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
//                 trackingNumber: trackingNumber,
//                 shippingAddress: shippingAddress,
//                 quantity: quantity,
//             };

//             await OrderModel.findByIdAndUpdate(orderId, {
//                 $set: {
//                     'products.$[elem].shippingStatus': 'shipped',
//                     'products.$[elem].trackingNumber': trackingNumber,
//                     'products.$[elem].estimatedDelivery': shippingDetails.estimatedDelivery,
//                 }
//             }, {
//                 arrayFilters: [{ 'elem.productId': productId }],
//             });

//             console.log(`Shipping processed for product ${productId} with tracking number ${trackingNumber}`);

//         } catch (error) {
//             console.error(`Shipping processing failed for product ${productId}:`, error);


//             throw error;
//         }
//     }, {
//         connection: {
//             host: REDIS_HOST,
//             port: Number(REDIS_PORT),
//         },
//         limiter: {
//             max: 10,
//             duration: 1000
//         }
//     });

//     worker.on('completed', job => {
//         console.log(`Shipping processed for job ${job.id}`);
//     });

//     worker.on('failed', (job, err) => {
//         console.error(`Shipping failed for job ${job?.id}:`, err);
//     });

//     return worker;
// }



