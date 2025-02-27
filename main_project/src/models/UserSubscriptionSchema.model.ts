import { model, Schema, Document } from "mongoose";
import { UserSubscription } from "@/interfaces/UserSubscription.interface";

const UserSubscriptionSchema: Schema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    subscriptionId: {
        type: Schema.Types.ObjectId,
        ref: "Subscription",
        required: true
    },
    startDate: {
        type: Date,
        default: Date.now
    },
    endDate: {
        type: Date,
        required: false
    },
    isActive: {
        type: Boolean,
        default: false
    },
    isAutoRenew: {
        type: Boolean,
        default: false
    },
    duration: {
        type: Number,
        required: false
    },
    expiry: {
        type: Date,
        required: false,
        default: null
    },
    paymentId: {
        type: String,
        required: false,
        default: null
    },
    paymentStatus: {
        type: String,
        enum: ['paid', 'unpaid'],
        default: 'unpaid',
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    price: {
        type: Number,
        required: false
    },
    orderId: { type: String, required: false, default: null },
    razorpaySubscriptionId: { type: String, required: false, default: null },


    cancelledAt: {
        type: Date,
        default: null
    },
    refundStatus: {
        type: String,
        enum: ['none', 'pending', 'refunded', 'failed', 'partial', 'processed'],
        default: 'none'
    },
    refundAmount: {
        type: Number,
        default: 0
    },
    refundId: {
        type: String,
        default: null
    },
    cancellationReason: {
        type: String,
        default: null
    },
    subscriptionType: { type: Number, required: true },


}, { timestamps: true });

export const UserSubscriptionModel = model<UserSubscription & Document>('UserSubscription', UserSubscriptionSchema, 'UserSubscriptions');
