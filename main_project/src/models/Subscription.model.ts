import { Subscription } from "@/interfaces/Subscription.interface";
import { SUBSCRIPTIONS_TYPES } from "@/utils/constant";
import { model, Schema, Document } from "mongoose";

const SubscriptionSchema: Schema = new Schema({
    name: { type: String, required: true },
    type: {
        type: Number,
        required: true,
        // enum: Object.values(SUBSCRIPTIONS_TYPES),
        enum: Object.values(SUBSCRIPTIONS_TYPES).filter(value => typeof value === 'number'),

        default: SUBSCRIPTIONS_TYPES.FREE
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    benefite: {
        type: [String],
        required: true
    },
    period: {
        type: String,
        required: true,
        enum: ['daily', 'weekly', 'monthly', 'yearly'],
        default: 'monthly'
    },

    isActive: {
        type: Boolean,
        deflate: false
    },

    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    razorpayPlanId: { type: String, required: false }
})

export const SubscriptionModel = model<Subscription & Document>('Subscription', SubscriptionSchema, 'Subscriptions')