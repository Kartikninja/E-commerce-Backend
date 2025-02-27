"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentController = void 0;
const tslib_1 = require("tslib");
const grpc = tslib_1.__importStar(require("@grpc/grpc-js"));
const protoLoader = tslib_1.__importStar(require("@grpc/proto-loader"));
const razorpay_1 = tslib_1.__importDefault(require("razorpay"));
const crypto_1 = tslib_1.__importDefault(require("crypto"));
const payment_model_1 = require("../models/payment.model");
const path_1 = tslib_1.__importDefault(require("path"));
const PROTO_PATH = path_1.default.resolve(__dirname, '../proto/payment.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});
const grpcObject = grpc.loadPackageDefinition(packageDefinition);
const paymentProto = grpcObject.payment;
const orderClient = new paymentProto.PaymentService('localhost:3020', grpc.credentials.createInsecure());
const razorpay = new razorpay_1.default({
    key_id: "rzp_test_oPTupXhgKYgwXA",
    key_secret: "Y2fY65okD7D08aI9AmWXxCX0",
});
class PaymentController {
    async createRazorpayOrder(call, callback) {
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
            const paymentData = {
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
            // Save Payment Data to MongoDB
            const newPayment = new payment_model_1.PaymentModel(paymentData);
            await newPayment.save();
            // Return gRPC Response
            callback(null, {
                orderId: order.id,
                amount: Number(order.amount) / 100, // Convert paise back to INR
                currency: order.currency,
                status: 'unpaid',
                razorpayKey: process.env.RAZORPAY_KEY_ID,
            });
        }
        catch (error) {
            console.error('❌ Error Creating Razorpay Order:', error);
            callback({
                code: grpc.status.INTERNAL,
                message: 'Error in Payment RazorPay',
            });
        }
    }
    async verifyWebhook(req, res) {
        try {
            const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
            const signature = req.headers['x-razorpay-signature'];
            const rawBody = req.rawBody;
            // Generate the expected signature
            const expectedSignature = crypto_1.default
                .createHmac('sha256', "Kartik02@")
                .update(rawBody)
                .digest('hex');
            if (expectedSignature !== signature) {
                console.error('Invalid webhook signature');
                res.status(400).json({ message: 'Invalid webhook signature' });
                return;
            }
            console.log('Webhook Verified:', req.body);
            const payload = req.body;
            let razorpayOrderId, razorpayPaymentId, order, payment;
            switch (payload.event) {
                case 'order.paid':
                    razorpayOrderId = payload.payload.payment.entity.order_id;
                    razorpayPaymentId = payload.payload.payment.entity.id;
                    // Fetch payment & order details from Razorpay
                    payment = await razorpay.payments.fetch(razorpayPaymentId);
                    order = await razorpay.orders.fetch(razorpayOrderId);
                    if (order.status !== 'paid') {
                        console.error('Payment captured but order not marked as paid');
                        res.status(400).json({ message: 'Payment captured but order not marked as paid' });
                        return;
                    }
                    // Send Payment Success Update to Main Server via gRPC
                    orderClient.PaymentStatusUpdate({ orderId: razorpayOrderId, paymentId: razorpayPaymentId, status: 'paid' }, (error, response) => {
                        if (error) {
                            console.error('Error updating payment status:', error);
                            res.status(500).json({ message: 'Failed to update payment status' });
                            return;
                        }
                        console.log('Payment status updated:', response.message);
                        res.json({ message: 'Payment status updated successfully' });
                    });
                    break;
                case 'payment.failed':
                    razorpayOrderId = payload.payload.payment.entity.order_id;
                    razorpayPaymentId = payload.payload.payment.entity.id;
                    // Fetch payment & order details from Razorpay
                    payment = await razorpay.payments.fetch(razorpayPaymentId);
                    order = await razorpay.orders.fetch(razorpayOrderId);
                    console.error('Payment failed:', payment.error_code, payment.error_description);
                    // Send Payment Failure Update to Main Server via gRPC
                    orderClient.PaymentStatusUpdate({ orderId: razorpayOrderId, paymentId: razorpayPaymentId, status: 'failed' }, (error, response) => {
                        if (error) {
                            console.error('Error updating payment status:', error);
                            return res.status(500).json({ message: 'Failed to update payment status' });
                        }
                        console.log('Payment status updated:', response.message);
                        return res.json({ message: 'Payment failed, status updated' });
                    });
                    break;
                case 'subscription.cancelled':
                    console.log('Subscription Cancelled:', payload);
                    // Handle subscription cancellation logic here
                    res.status(200).json({ message: 'Subscription cancellation processed' });
                    return;
                case 'refund.processed':
                    console.log('Refund Processed:', payload);
                    // Handle refund logic here
                    res.status(200).json({ message: 'Refund processed' });
                    return;
                default:
                    console.log(`Unhandled event: ${payload.event}`);
                    res.status(202).json({ message: 'Unhandled event' });
            }
        }
        catch (error) {
            console.error('Webhook error:', error);
            res.status(500).json({ message: 'Webhook verification failed' });
            return;
        }
    }
}
exports.PaymentController = PaymentController;
//# sourceMappingURL=payment.controller.js.map