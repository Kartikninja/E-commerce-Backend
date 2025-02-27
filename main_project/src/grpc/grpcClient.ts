import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import { PaymentController } from '../controllers/Payment.controller';
import { OrderModel } from '../models/Order.model';
import Razorpay from 'razorpay';
import { PaymentModel } from '@/models/Payment.model';

const ORDER_PROTO_PATH = path.resolve(__dirname, '../proto/order.proto');
const orderPackageDefinition = protoLoader.loadSync(ORDER_PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});
const grpcObjectOrder = grpc.loadPackageDefinition(orderPackageDefinition) as any;
const orderProto = grpcObjectOrder.order as any
const PAYMENT_PROTO_PATH = path.resolve(__dirname, '../proto/payment.proto');
const paymentPackageDefinition = protoLoader.loadSync(PAYMENT_PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});
const grpcObjectPayment = grpc.loadPackageDefinition(paymentPackageDefinition) as any;
const paymentProto = grpcObjectPayment.payment as any
const razorpayInstance = new Razorpay({
    key_id: "rzp_test_oPTupXhgKYgwXA",
    key_secret: "Y2fY65okD7D08aI9AmWXxCX0",
});

const server = new grpc.Server();

server.addService(paymentProto.PaymentService.service, {

    PaymentStatusUpdate: async (call: any, callback: any) => {
        try {
            const { orderId, paymentId, status, event } = call.request;

            console.log(`Received gRPC event: ${event} with status: ${status} for order ${orderId}`);

            const paymentController = new PaymentController();

            if (!orderId) {
                return callback({ code: grpc.status.INVALID_ARGUMENT, message: "orderId is mandatory" });
            }

            switch (event) {
                case "order.paid":
                    if (!paymentId) {
                        return callback({ code: grpc.status.INVALID_ARGUMENT, message: "paymentId is mandatory for paid status" });
                    }

                    const payment = await razorpayInstance.payments.fetch(paymentId);
                    const order = await razorpayInstance.orders.fetch(orderId);

                    if (order.status !== "paid") {
                        return callback({ code: grpc.status.INVALID_ARGUMENT, message: "Payment captured but order not marked as paid" });
                    }

                    const result = await paymentController.handleSuccessfulPayment(orderId, paymentId);
                    return callback(null, { message: result.message, statusMessage: "paid" });

                case "payment.failed":
                    await PaymentModel.findOneAndUpdate(
                        { orderId },
                        { status: "failed" }
                    );

                    await OrderModel.findOneAndUpdate(
                        { orderId },
                        { orderStatus: "cancelled", paymentStatus: "unpaid", payoutStatus: "failed" }
                    );

                    return callback(null, { message: "Payment failed", statusMessage: "failed" });

                case "order.cancelled":
                    await PaymentModel.findOneAndUpdate(
                        { orderId },
                        { status: "cancelled" }
                    );

                    await OrderModel.findOneAndUpdate(
                        { orderId },
                        { orderStatus: "cancelled", paymentStatus: "unpaid", payoutStatus: "none" }
                    );

                    return callback(null, { message: "Order manually cancelled", statusMessage: "cancelled" });

                case "refund.created":
                    const { refund_id, refund_amount, refund_status, eligible_product_ids } = call.request.refund;
                    const refundPayload = {
                        paymentId,
                        refund: {
                            refund_id,
                            refund_amount,
                            refund_status,
                            eligible_product_ids
                        }
                    };

                    console.log("refundPayload", refundPayload)
                    await paymentController.handleRefundEvent(refundPayload)
                    return callback(null, { message: "Refund processed", statusMessage: "refunded" });

                case "subscription.activated":
                    await OrderModel.findOneAndUpdate(
                        { orderId },
                        { subscriptionStatus: "active" }
                    );

                    return callback(null, { message: "Subscription activated", statusMessage: "active" });

                case "subscription.cancelled":

                    const cancelSubscription = await paymentController.handleSubscriptionCancellation(orderId)
                    return callback(null, { message: "Subscription cancelled", statusMessage: "cancelled" });

                default:
                    console.log(`Unhandled event: ${event}`);
                    return callback(null, { message: `Unhandled event: ${event}`, statusMessage: "pending" });
            }
        } catch (error) {
            console.error("Error in PaymentStatusUpdate:", error);
            return callback({ code: grpc.status.INTERNAL, message: "Failed to process payment event" });
        }
    },
});

server.bindAsync(
    'localhost:50051',
    grpc.ServerCredentials.createInsecure(),
    (error, port) => {
        if (error) {
            console.error('Failed to bind server:', error);
            return;
        }
        console.log('gRPC Server running on port', port);
        server.start();
    }
);

const paymentClient = new paymentProto.PaymentService(
    'localhost:50052',
    grpc.credentials.createInsecure()
);

export default paymentClient;
