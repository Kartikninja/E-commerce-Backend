import { NextFunction, Request, Response } from 'express';
import { PaymentService } from '@services/Paymnet.Service';
import { Container } from 'typedi';
import { Payment } from '@interfaces/Payment.interface';
import crypto from 'crypto'
import { UserSubscriptionModel } from '@/models/UserSubscriptionSchema.model';
import { UserSubscriptionService } from '@/services/UserSubscription.service';
import { OrderModel } from '@/models/Order.model';
import { ProductVariant } from '@/models/ProductVariant.model';
import { HttpException } from '@/exceptions/httpException';
import Razorpay from 'razorpay';
import { PaymentModel } from '@/models/Payment.model';
import { SubscriptionModel } from '@/models/Subscription.model';
import { Product } from '@/models/Product.model';
import { StoreModel } from '@/models/Store.model';
import { header } from 'express-validator';
import mongoose from 'mongoose';
import { PayoutModel } from '@/models/Payout.model';
import { StoreDocument } from '@/interfaces/Store.interface';
import { RAZORPAY_API_SECRET, WEBHOOK_SECRET, RAZORPAY_API_KEY, RAZORPAYX_API_KEY, RAZORPAYX_API_SECRET, RAZORPAYX_WEBHOOK_SECRET, REDIS_HOST, REDIS_PORT } from '@config'
import { Queue } from 'bullmq';
import { PayoutService } from '@/services/payout.service';
import { payoutQueue, shippingQueue } from '@/workers/Queue';
import { cartModel } from '@/models/cart.model';




export const razorpayInstance = new Razorpay({
    key_secret: RAZORPAY_API_SECRET,
    key_id: RAZORPAY_API_KEY
})

export class PaymentController {

    constructor() {
        this.verifyPayment = this.verifyPayment.bind(this)
    }
    private paymentService = Container.get(PaymentService);
    private userSubscriptionService = Container.get(UserSubscriptionService)
    private payout = Container.get(PayoutService)


    public async createRazorpayPayment(req: Request, res: Response): Promise<Response> {
        const { amount, userId, paymentMethod, modelName } = req.body;

        try {
            const newPayment = await this.paymentService.createRazorpayOrder(amount, userId, paymentMethod, modelName);
            return res.status(201).json(newPayment);
        } catch (error) {
            return res.status(error.status || 500).json({ message: error.message });
        }
    }



    public getAllPaymnet = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const getAll = await this.paymentService.getAllPaymnet()
            res.status(201).json(getAll)
        } catch (err) {
            next(err)
        }
    }

    // if (payment.status === 'captured') {
    //     if (order.status !== 'paid') {
    //         throw new HttpException(400, 'Payment captured but order not marked as paid');

    //     }
    //     const result = await this.handleSuccessfulPayment(
    //         razorpayOrderId,
    //         razorpayPaymentId
    //     );

    //     return res.status(result.status).json(result);
    // }

    // if (payment.status === 'failed') {
    //     await PaymentModel.findOneAndUpdate(
    //         { orderId: razorpayOrderId },
    //         { status: 'failed' }
    //     );
    //     await OrderModel.findByIdAndUpdate(
    //         { orderId: razorpayOrderId },
    //         { orderStatus: 'cancelled', paymentStatus: 'unpaid', payoutStatus: 'failed' },
    //         { new: true }
    //     )
    //     return res.status(400).json({ message: 'Payment failed' });
    // }

    // return res.status(202).json({
    //     message: `Payment processing - current status: ${payment.status}`,
    //     status: payment.status
    // });



    // const existingPayment = await PaymentModel.findOne({ orderId: razorpayOrderId })
    // existingPayment.amount = Number(payment.amount) / 100
    // existingPayment.email = payment.email
    // existingPayment.paymentId = payment.id
    // existingPayment.contact = String(payment.contact)
    // existingPayment.vpa = payment.vpa || null
    // existingPayment.wallet = payment.wallet || null
    // existingPayment.amountRefunded = payment.amount_refunded || null
    // existingPayment.refundStatus = String(payment.amount_refunded)
    // existingPayment.fee = payment.fee
    // existingPayment.tax = payment.tax
    // existingPayment.errorCode = payment.error_code
    // existingPayment.errorDescription = payment.error_description
    // existingPayment.acquirerData = {
    //     rrn: payment.acquirer_data?.rrn || null,
    //     upiTransactionId: payment.acquirer_data?.upi_transaction_id || null,
    // };



    // await existingPayment.save();

    // if (!razorpayOrderId || !razorpayPaymentId) {
    //     throw new HttpException(400, 'Missing payment identifiers');
    // }


    public async verifyPayment(req: Request, res: Response, next: NextFunction): Promise<Response> {
        const signature = req.headers['x-razorpay-signature'] as string;
        const payload = req.body;

        try {
            let razorpayOrderId: string;
            let razorpayPaymentId: string;
            let generatedSignature: string;

            if (payload?.event) {
                const rawBody = (req as any).rawBody;
                generatedSignature = crypto
                    .createHmac('sha256', process.env.WEBHOOK_SECRET)
                    .update(rawBody)
                    .digest('hex');
            } else {
                const body = payload.razorpayOrderId + "|" + payload.razorpayPaymentId;
                generatedSignature = crypto
                    .createHmac('sha256', process.env.RAZORPAY_API_SECRET)
                    .update(body)
                    .digest('hex');
            }

            console.log("payload", payload)
            console.log("req.headers", req.headers)

            console.log("payload.event", payload.event)

            if (!signature || generatedSignature !== signature) {
                throw new HttpException(400, 'Invalid/missing signature');
            }



            let payment
            let order


            if (payload.event) {


                switch (payload.event) {
                    case 'order.paid':
                        razorpayOrderId = payload.razorpayOrderId || payload.payload?.payment?.entity?.order_id;
                        razorpayPaymentId = payload.razorpayPaymentId || payload.payload?.payment?.entity?.id;


                        payment = await razorpayInstance.payments.fetch(razorpayPaymentId);
                        order = await razorpayInstance.orders.fetch(razorpayOrderId)


                        if (order.status !== 'paid') {
                            throw new HttpException(400, 'Payment captured but order not marked as paid');

                        }
                        const result = await this.handleSuccessfulPayment(
                            razorpayOrderId,
                            razorpayPaymentId
                        );

                        return res.status(result.status).json(result);

                    case 'payment.failed':
                        razorpayOrderId = payload.razorpayOrderId || payload.payload?.payment?.entity?.order_id;
                        razorpayPaymentId = payload.razorpayPaymentId || payload.payload?.payment?.entity?.id;


                        payment = await razorpayInstance.payments.fetch(razorpayPaymentId);
                        order = await razorpayInstance.orders.fetch(razorpayOrderId)


                        await PaymentModel.findOneAndUpdate(
                            { orderId: razorpayOrderId },
                            { status: 'failed' }
                        );
                        await OrderModel.findByIdAndUpdate(
                            { orderId: razorpayOrderId },
                            { orderStatus: 'cancelled', paymentStatus: 'unpaid', payoutStatus: 'failed' },
                            { new: true }
                        )
                        return res.status(400).json({ message: 'Payment failed' });


                    case 'subscription.cancelled':
                        console.log('Case->subscription.cancelled')
                        await this.handleSubscriptionCancellation(payload);
                        return res.status(200).json({ message: "Subscription cancellation processed" });

                    case 'refund.processed':
                        console.log(`Case->${payload.event}`);
                        await this.handleRefundEvent(payload);
                        return res.status(200).json({ message: "Refund processed" });

                    default:
                        console.log(`this is default event ${payload.event}`)
                        return res.status(202).json({ message: "Unhandled event" });


                }
            } else {
                const { razorpayOrderId, razorpayPaymentId } = payload
                const result = await this.handleSuccessfulPayment(razorpayOrderId, razorpayPaymentId)
                return res.status(result.status).json(result);

            }



        } catch (error) {
            console.error('Payment verification error:', error);
            return res.status(500).json({ message: 'Payment processing failed' });
        }
    }


    public handleSuccessfulPayment = async (
        orderId: string,
        paymentId: string,
    ): Promise<{
        status: number; message: string; data?: any; error?: string
    }> => {

        const existingPayment = await PaymentModel.findOne({ orderId });
        if (existingPayment?.status === 'paid') {


            return {
                status: 200,
                message: 'Order payment completed',
            };
        }
        const paymentRecord = await PaymentModel.findOneAndUpdate({ orderId, status: { $ne: 'paid' } }, { paymentId, status: 'paid' }, { new: true });
        if (!paymentRecord?.modelName) {
            throw new HttpException(400, "Model name not found");
        }
        const paymentDetails = await razorpayInstance.payments.fetch(paymentId)
        const entity = paymentDetails

        await PaymentModel.findOneAndUpdate(
            { orderId: orderId },
            {

                email: entity.email,
                contact: entity.contact,
                vpa: entity.vpa,
                wallet: entity.wallet,
                bank: entity.bank,
                fee: entity.fee,
                tax: entity.tax,
                errorCode: entity.error_code,
                errorDescription: entity.error_description,
                acquirerData: {
                    rrn: entity.acquirer_data?.rrn,
                    upiTransactionId: entity.acquirer_data?.upi_transaction_id
                },
                amountRefunded: entity.amount_refunded,
                refundStatus: entity.refund_status || 'none'
            },
            { new: true }
        );


        const modelNameFromPayload = paymentRecord.modelName;


        let Payout
        let updatedOrder
        if (modelNameFromPayload === 'Order') {

            try {

                updatedOrder = await OrderModel.findOneAndUpdate(
                    { orderId: orderId, paymentStatus: { $ne: 'paid' } },
                    {
                        paymentId: paymentId,
                        paymentStatus: 'paid',
                        orderStatus: 'confirmed',
                        payoutStatus: 'pending'
                    },
                    { new: true }
                ).populate<{ storeId: StoreDocument }>('storeId');
                if (!updatedOrder) {
                    throw new HttpException(404, 'Order not found');
                }

                const commissionRate = 0.10;
                const commissionAmount = updatedOrder.totalPrice * commissionRate;
                const amountToSeller = updatedOrder.totalPrice - commissionAmount;

                updatedOrder.commissionAmount = commissionAmount;
                updatedOrder.amountToSeller = amountToSeller;

                Payout = await PayoutModel.create({
                    payoutAmount: amountToSeller,
                    currency: 'INR',
                    commission: commissionAmount,
                    razorpayFundAccountId: (updatedOrder.storeId as unknown as StoreDocument).razorpayFundAccountId,
                    storeId: (updatedOrder.storeId as unknown as StoreDocument)._id,
                    orderId: updatedOrder.orderId,
                    status: 'pending',
                    purpose: 'payout',
                    DatabaseOrderId: updatedOrder._id
                });


                const cart = await cartModel.findById(updatedOrder.CartId).populate('products.productVariantId');


                const variantStockUpdates = cart.products
                    .filter(product => product.productVariantId)
                    .map(product => ({
                        updateOne: {
                            filter: { _id: product.productVariantId },
                            update: { $inc: { stockLeft: -product.quantity } }
                        }
                    }));
                console.log("variantStockUpdates", variantStockUpdates)
                if (variantStockUpdates.length) {
                    await ProductVariant.bulkWrite(variantStockUpdates);
                }

                const finalOrder = await OrderModel.findByIdAndUpdate(
                    updatedOrder._id,
                    {
                        commissionAmount,
                        amountToSeller, payoutStatus: 'pending'
                    },
                    { new: true }
                );
                if (updatedOrder.paymentStatus === 'paid' && updatedOrder.orderStatus !== 'cancelled') {
                    console.log("updatedOrder.storeId", updatedOrder.storeId)
                    await payoutQueue.add(
                        'processPayout',
                        {
                            payoutId: Payout._id.toString(),
                            amount: amountToSeller,
                            fundAccountId: updatedOrder.storeId.razorpayFundAccountId,
                            storeData: updatedOrder.storeId
                        },
                        {
                            delay: 4 * 60 * 1000,
                            attempts: 3,
                            backoff: {
                                type: 'exponential',
                                delay: 5000,
                            },
                        }
                    )




                } else {
                    console.log("Payout not added to queue: Payment not confirmed or order canceled");
                }

                if (updatedOrder.paymentStatus === 'paid') {
                    for (const product of cart.products) {
                        const trackingNumber = this.generateTrackingNumber();
                        console.log("trackingNumber", trackingNumber)

                        await shippingQueue.add('processShipping', {
                            productId: product.productId,
                            trackingNumber: trackingNumber,
                            quantity: product.quantity,
                            shippingAddress: updatedOrder.shippingAddress,
                            storeId: updatedOrder.storeId,
                            orderId: updatedOrder._id,
                            cartId: cart._id
                        }, {
                            delay: 1 * 60 * 1000,
                            attempts: 3,
                            backoff: {
                                type: 'exponential',
                                delay: 5000,
                            },
                        })
                    }
                }




                return {
                    status: 200,
                    message: 'Order payment completed',
                    data: finalOrder

                }
            } catch (error) {

                console.log("==== Error in handlePayment Function =====")
                if (Payout) {
                    await PayoutModel.findByIdAndUpdate(
                        Payout._id,
                        {
                            status: 'failed',
                            error: error.message?.substring(0, 500)
                        }
                    );
                    await OrderModel.findByIdAndUpdate(
                        updatedOrder._id,
                        { orderStatus: 'cancelled', paymentStatus: 'unpaid', payoutStatus: 'failed' },
                        { new: true }
                    )
                }

                console.error('Payment processing error:', error);
                return {
                    status: 500,
                    message: 'Payment processing error',
                    error: error.stack

                }
            } finally {
                console.log("Finaly")
            }

        }
        else if (modelNameFromPayload === 'UserSubScription') {
            const updatedSubscription = await UserSubscriptionModel.findOneAndUpdate(
                { orderId: orderId },
                {
                    paymentStatus: 'paid',
                    isActive: true,
                    startDate: new Date(),
                    endDate: this.calculateEndDate(),
                    paymentId: paymentId

                },
                { new: true }
            );

            if (!updatedSubscription) {
                throw new HttpException(404, 'Subscription not found');
            }


            return {
                status: 200,
                message: 'Subscription payment completed',
                data: updatedSubscription
            }
        }

        throw new HttpException(400, 'Unknown payment type');
    }

    private calculateEndDate(): Date {
        const date = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)


        return date;
    }



    public generateTrackingNumber(): string {
        return 'TRK-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    }



    public async handleSubscriptionCancellation(subscriptionId: string): Promise<void> {
        console.log('======handleSubscriptionCancellation function Call=====')
        // const subscriptionId = payload.payload.subscription.entity.id;
        const subscription = await UserSubscriptionModel.findOne({
            razorpaySubscriptionId: subscriptionId
        });


        console.log(`This is subscriptionId:${subscriptionId} and this is subscription:${subscription}`)


        if (!subscription) {
            console.warn("Subscription not found:", subscriptionId);
            return;
        }

        subscription.isActive = false;
        subscription.endDate = new Date();
        subscription.cancelledAt = new Date()
        subscription.isAutoRenew = null
        subscription.expiry = null
        await subscription.save();
    }



    public async handleRefundEvent(payload: any): Promise<void> {

        console.log('====handleRefundEvent function call=====');

        const { paymentId, refund } = payload;
        const { refund_id, refund_amount, refund_status, eligible_product_ids } = refund;
        console.log("paymentId", paymentId)

        if (!paymentId || !refund.refund_status) {
            console.error('Invalid refund event payload:', payload);
            return;
        }
        const payment = await PaymentModel.findOne({ paymentId });
        if (!payment) {
            console.error('Payment not found:', paymentId);
            return;
        }

        console.log("payment", payment)
        console.log("payment.modelName", payment.modelName)

        await PaymentModel.findByIdAndUpdate(payment._id, {
            amountRefunded: refund_amount,
            refundStatus: refund_status === 'processed' ? 'refunded' : 'failed',
            refundId: refund_id
        });

        if (payment.modelName === 'Order') {


            const order = await OrderModel.findOne({ paymentId })
            if (!order) {
                console.error('Order not found for paymentId:', paymentId);
                return;
            }

            console.log("handleRefundEvent function Order", order)

            const cart = await cartModel.findOne({ _id: order.CartId })
                .populate('products.productId')
                .populate('products.productVariantId');
            if (!cart) {
                console.error('Cart not found for order:', order._id);
                return;
            }

            const eligibleProductIds = Array.isArray(eligible_product_ids)
                ? eligible_product_ids
                : [];
            console.log("refund.notes", refund.notes)
            console.log("eligibleProductIds", eligibleProductIds)


            if (refund_status === 'processed') {
                await cartModel.updateOne(
                    { _id: order.CartId, 'products.productId': { $in: eligibleProductIds } },
                    {
                        $set: {
                            'products.$[elem].refundStatus': 'processed',
                        }
                    },
                    {
                        arrayFilters: [{ 'elem.productId': { $in: eligibleProductIds.map(id => new mongoose.Types.ObjectId(id)) } }]
                    }
                );
                console.log("Updated Cart products' refund status to 'processed'.");
            }

            const stockUpdates = cart.products.
                filter(product => eligibleProductIds.includes(product.productId.toString()))
                .flatMap(product => [
                    {
                        updateOne: {
                            filter: { _id: product.productId },
                            update: { $inc: { stockLeft: product.quantity } }
                        }
                    },
                    ...(product.productVariantId ? [{
                        updateOne: {
                            filter: { _id: product.productVariantId },
                            update: { $inc: { stockLeft: product.quantity } }
                        }
                    }] : [])
                ]);


            if (refund_status === 'processed' && stockUpdates.length > 0) {
                await Promise.all([
                    Product.bulkWrite(stockUpdates),
                    ProductVariant.bulkWrite(stockUpdates)
                ]);
            }

            await OrderModel.findByIdAndUpdate(
                order._id,
                {
                    refundStatus: refund_status === 'processed' ? 'refunded' : 'failed',
                    refundId: refund_id,
                    orderStatus: 'cancelled',
                    payoutStatus: 'pending'
                },
                { new: true }
            );





        }
        else if (payment.modelName === 'UserSubScription') {
            console.log("userSubsciption status updated")
            await UserSubscriptionModel.findOneAndUpdate(
                { paymentId },
                {
                    refundStatus: refund_status === 'processed' ? 'refunded' : 'failed',
                    refundAmount: refund_amount,
                    isActive: false,
                    endDate: new Date()
                }
            );
        }

    }


    public async createPayment(req: Request, res: Response, next: NextFunction): Promise<Response> {
        const paymentData: Payment = req.body;
        try {
            const newPayment = await this.paymentService.createPayment(paymentData);
            return res.status(201).json(newPayment);
        } catch (error) {
            next(error)
        }
    }

    public async updatePaymentStatus(req: Request, res: Response, next: NextFunction): Promise<Response> {
        const { transactionId, status } = req.body;
        try {
            const updatedPayment = await this.paymentService.updatePaymentStatus(transactionId, status);
            return res.status(200).json(updatedPayment);
        } catch (error) {
            next(error)
        }

    }
}




// if (payload.event === 'refund.created' || payload.event === 'refund.processed' || payload.event === 'subscription.cancelled') {
//     const refund = payload.payload?.refund?.entity;

//     const existingPayment = await PaymentModel.findOne({ orderId: razorpayOrderId });
//     existingPayment.amountRefunded = refund.amount / 100;
//     existingPayment.refundStatus = refund.status;
//     existingPayment.refundId = refund.id;
//     existingPayment.updatedAt = new Date();

//     await existingPayment.save();

//     const userSubscription = await UserSubscriptionModel.findOne({ paymentId: razorpayPaymentId });
//     if (userSubscription) {
//         userSubscription.refundStatus = refund.status;
//         userSubscription.refundAmount = refund.amount / 100;
//         userSubscription.updatedAt = new Date();

//         if (refund.status === 'cancelled') {
//             userSubscription.isActive = false;
//             userSubscription.endDate = new Date();
//             userSubscription.expiry = null
//             userSubscription.isAutoRenew = null
//             userSubscription.cancelledAt = new Date()
//         }

//         await userSubscription.save();
//     }

//     return res.status(200).json({
//         message: 'Refund processed successfully',
//         status: refund.status
//     });
// }