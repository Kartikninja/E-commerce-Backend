import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import Razorpay from 'razorpay';
import { HttpException } from '../utils/HttpException';
import crypto from 'crypto'
import { Payment } from '../interface/Payment.interface';
import { PaymentModel } from '../models/payment.model';
import { Request, Response } from 'express';
import { ServerUnaryCall, sendUnaryData } from '@grpc/grpc-js';
import path from 'path';
import webhooks from 'razorpay/dist/types/webhooks';


const PROTO_PATH = path.resolve(__dirname, '../proto/payment.proto');


const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});
const grpcObject = grpc.loadPackageDefinition(packageDefinition) as any;
const paymentProto = grpcObject.payment



const orderClient = new paymentProto.PaymentService(
    'localhost:50051',
    grpc.credentials.createInsecure()
);

const razorpay = new Razorpay({
    key_id: "rzp_test_oPTupXhgKYgwXA",
    key_secret: "Y2fY65okD7D08aI9AmWXxCX0",
});

export class PaymentController {

    public async createRazorpayOrder(call: any, callback: any) {
        console.log('CreateRazorpayoredr hit')
        try {
            const { amount, userId, paymentMethod, modelName } = call.request;

            const options = {
                amount: amount * 100,
                currency: 'INR',
                receipt: `order_receipt_${Date.now()}`,
                payment_capture: 1,
                notes: { userId: userId },
            };

            const order = await razorpay.orders.create(options);
            console.log('✅ Razorpay Order Created:', order);

            const paymentData: Payment = {
                userId,
                paymentId: '',
                orderId: order.id,
                amount,
                currency: 'INR',
                status: 'unpaid',
                paymentMethod,
                email: '',
                contact: '',
                vpa: null,
                wallet: null,
                bank: null,
                amountRefunded: 0,
                refundStatus: null,
                fee: 0,
                tax: 0,
                errorCode: null,
                errorDescription: null,
                acquirerData: {
                    rrn: null,
                    upiTransactionId: null,
                },
                createdAt: new Date(),
                updatedAt: new Date(),
                modelName,
                refundId: null
            };


            const newPayment = new PaymentModel(paymentData);
            await newPayment.save();


            callback(null, {
                orderId: order.id,
                amount: Number(order.amount) / 100
            });

        } catch (error) {
            console.error('❌ Error Creating Razorpay Order:', error);
            callback({
                code: grpc.status.INTERNAL,
                message: 'Error in Payment RazorPay',
            });
        }
    }

    public async createSubscriptionPlan(call: any, callback: any) {
        try {
            const { period, interval, name, amount, description, currency } = call.request
            const plan = await razorpay.plans.create({
                period: period,
                interval: interval,
                item: {
                    name: name,
                    amount: Math.round(amount * 100),
                    currency: currency,
                    description: description
                }
            })
            callback(null, { planId: plan.id, status: 'success' })
        } catch (err) {
            callback(err, null)
        }
    }

    public async cancelUserSubscription(call: any, callback: any) {
        try {
            const { razorpaySubscriptionId } = call.request
            console.log("razorpaySubscriptionId", razorpaySubscriptionId)
            const cancelSubscription = await razorpay.subscriptions.cancel(razorpaySubscriptionId, false)
            console.log("cancelSubscription", cancelSubscription)
            callback(null, { success: true, message: 'User Cancled Subscription', status: cancelSubscription.status })
        } catch (err) {
            callback(null, { success: false, message: 'Error in Cancel Subscription', status: '' })
        }
    }



    public async verifyWebhook(req: Request, res: Response): Promise<void> {
        try {
            console.log('Received Webhook on Payment Server (3021)');
            const signature = req.headers['x-razorpay-signature'] as string;
            const payload = req.body;

            let razorpayOrderId: string;
            let razorpayPaymentId: string;
            let generatedSignature: string;

            if (payload?.event) {
                // Webhook verification
                const rawBody = (req as any).rawBody;
                generatedSignature = crypto
                    .createHmac('sha256', process.env.WEBHOOK_SECRET!)
                    .update(rawBody)
                    .digest('hex');
            } else {
                // Manual verification
                const body = payload.razorpayOrderId + "|" + payload.razorpayPaymentId;
                generatedSignature = crypto
                    .createHmac('sha256', process.env.RAZORPAY_API_SECRET!)
                    .update(body)
                    .digest('hex');
            }

            if (!signature || generatedSignature !== signature) {
                throw new Error('Invalid/missing signature');
            }

            console.log("Payload:", payload);
            console.log("Headers:", req.headers);

            let grpcRequest: any;

            if (payload.event) {
                switch (payload.event) {
                    case 'order.paid':
                        razorpayOrderId = payload.razorpayOrderId || payload.payload?.payment?.entity?.order_id;
                        razorpayPaymentId = payload.razorpayPaymentId || payload.payload?.payment?.entity?.id;

                        grpcRequest = {
                            orderId: razorpayOrderId,
                            paymentId: razorpayPaymentId,
                            status: 'paid',
                            event: payload.event
                        };

                        console.log("Sending Payment Success gRPC Request to Main Server (3020)", grpcRequest);
                        break;

                    case 'payment.failed':
                        razorpayOrderId = payload.razorpayOrderId || payload.payload?.payment?.entity?.order_id;
                        razorpayPaymentId = payload.razorpayPaymentId || payload.payload?.payment?.entity?.id;

                        grpcRequest = {
                            orderId: razorpayOrderId,
                            paymentId: razorpayPaymentId,
                            status: 'failed',
                            event: payload.event
                        };

                        console.log("Sending Payment Failed gRPC Request to Main Server (3020)", grpcRequest);
                        break;
                    case 'subscription.cancelled':
                        const subsciptionId = payload.payload.subscription.entity.id
                        grpcRequest = {
                            orderId: subsciptionId,
                            paymentId: '',
                            status: 'cancelled',
                            event: payload.event
                        };
                        break;

                    case 'refund.created':
                        const refund = payload.payload.refund.entity;
                        const paymentEntity = payload.payload.payment.entity;

                        grpcRequest = {
                            orderId: paymentEntity.order_id,
                            paymentId: paymentEntity.id,
                            status: 'refunded',
                            event: payload.event,
                            refund: {
                                refund_id: refund.id,
                                refund_amount: refund.amount / 100,
                                refund_status: refund.status,
                                eligible_product_ids: Array.isArray(refund.notes?.eligibleProducts)
                                    ? refund.notes.eligibleProducts
                                    : []


                            }
                        };
                        console.log("grpcRequest", grpcRequest)
                        break
                    default:
                        console.log(`Unhandled event: ${payload.event}`);
                        res.status(202).json({ message: "Unhandled event" });
                        return
                }
            } else {
                const { razorpayOrderId, razorpayPaymentId } = payload;
                grpcRequest = {
                    orderId: razorpayOrderId,
                    paymentId: razorpayPaymentId,
                    status: 'paid',
                    event: payload.event
                };
            }

            await new Promise((resolve, reject) => {
                orderClient.PaymentStatusUpdate(grpcRequest, (error: any, response: any) => {
                    if (error) {
                        console.error('gRPC call failed:', error);
                        reject(error);
                    } else {
                        console.log('gRPC response:', response);
                        resolve(response);
                    }
                });
            });

            res.status(200).json({ message: `Webhook event ${payload.event || 'manual_payment'} processed` });
        } catch (error) {
            console.error('Webhook verification failed:', error);
            res.status(500).json({ message: 'Webhook verification failed' });
        }
    }



    public async CancelOrder(call: any, callback: any) {
        try {
            const { paymentId, amount, notes } = call.request
            console.log("call.request", call.request)
            const refund = await razorpay.payments.refund(paymentId, {
                amount: amount,
                speed: 'normal',
                notes: {
                    reason: notes?.reason || 'No reason provided',
                    cancelledBy: notes?.cancelledBy || '',
                    // eligibleProducts: Array.isArray(notes?.eligibleProducts)
                    //     ? notes.eligibleProducts.map(id => id.toString())  // Ensure proper format
                    //     : []
                    eligibleProducts: notes?.eligibleProducts || ''
                },
                receipt: `refund_${Date.now()}`
            })
            console.log("Payment Server ->refund", refund)
            console.log("Payment Server->refund.notes", refund.notes)

            callback(null, {
                success: true,
                refundId: refund.id,
                status: refund.status,
                message: `Refund of ${refund.amount} INR processed successfully.`
            })
        } catch (err) {
            console.error('Refund Faild', err)
            callback(null, {
                success: false,
                refundId: '',
                status: 'falid',
                message: `Refund failed: ${err.message}`

            })
        }
    }


}



