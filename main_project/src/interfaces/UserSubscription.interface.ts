import { Document } from "mongoose";

export interface UserSubscription extends Document {
    userId: string;
    subscriptionId: string;
    startDate: Date;
    endDate: Date;
    isActive: boolean;
    isAutoRenew: boolean;
    createdAt: Date;
    updatedAt: Date;
    expiry: Date | null
    orderId: string
    paymentStatus: 'paid' | 'unpaid'
    price: number
    razorpaySubscriptionId: string
    duration: number

    paymentId: string

    cancelledAt: Date

    refundStatus: 'none' | 'pending' | 'refunded' | 'failed' | 'partial' | 'processed'
    // refundStatus: 'none' | 'requested' | 'processing' | 'refunded' | 'failed' | 'processed'
    refundAmount: number
    refundId: string
    cancellationReason: string

    subscriptionType: number
}


export interface UserPurchaseSubScription {
    fullName: string
    email: string

}
