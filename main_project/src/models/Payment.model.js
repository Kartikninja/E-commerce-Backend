"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentModel = void 0;
const mongoose_1 = require("mongoose");
const ObjectId = mongoose_1.Schema.Types.ObjectId;
const PaymentSchema = new mongoose_1.Schema({
    userId: { type: ObjectId, ref: 'User', required: false },
    orderId: { type: String, required: false },
    amount: { type: Number, required: false },
    status: { type: String, enum: ['paid', 'unpaid', 'refunded'], default: 'unpaid' },
    paymentMethod: { type: String, required: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    modelName: { type: String, require: false },
    paymentId: { type: String, required: false, default: null },
    currency: { type: String, required: true, default: 'INR' },
    email: { type: String, required: false },
    contact: { type: String, required: false },
    vpa: { type: String, required: false, default: null },
    wallet: { type: String, required: false, default: null },
    bank: { type: String, required: false, default: null },
    amountRefunded: { type: Number, default: 0 },
    // refundStatus: { type: String, default: null },
    refundStatus: {
        type: String,
        enum: ['pending', 'processed', 'failed', 'partial', 'refunded'],
        default: null
    },
    fee: { type: Number, required: false },
    tax: { type: Number, required: false },
    errorCode: { type: String, default: null },
    errorDescription: { type: String, default: null },
    acquirerData: {
        rrn: { type: String, required: false },
        upiTransactionId: { type: String, required: false },
    },
    refundId: { type: String, required: false, default: null }
}, { timestamps: true });
PaymentSchema.index({ orderId: 1 });
PaymentSchema.index({ status: 1 });
exports.PaymentModel = (0, mongoose_1.model)('Payment', PaymentSchema, 'Paymnets');
