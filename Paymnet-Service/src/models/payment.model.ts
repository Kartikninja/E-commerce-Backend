import { PaymentDocument } from '../interface/Payment.interface'
import { Document } from 'mongoose';
import { model, Schema, Types } from 'mongoose';

const ObjectId = Schema.Types.ObjectId
const PaymentSchema: Schema = new Schema({
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

export const PaymentModel = model<PaymentDocument>('Payment', PaymentSchema, 'Paymnets');

