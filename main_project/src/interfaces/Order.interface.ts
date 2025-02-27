import { Schema } from "mongoose";

export interface OrderProduct {

    productId: Schema.Types.ObjectId;
    quantity: number;
    price: number;
    productVariantId: Schema.Types.ObjectId;
    refundStatus: 'none' | 'requested' | 'approved' | 'rejected' | 'processed';
    replacementStatus: 'none' | 'requested' | 'approved' | 'rejected' | 'processed';
    refundPolicy: string;
    replacementPolicy: string;
    deliveredAt?: Date;
    shippedAt?: Date;
    shippingStatus: 'pending' | 'processing' | 'shipped' | 'out_for_delivery' | 'delivered' | 'returned';
    trackingNumber?: string;
    courierPartner?: string;
    estimatedDelivery?: Date;
    deliveryAgentName?: string;
    deliveryAgentPhone?: string;


    discountedPrice: number
    discountAmount: number
    discountType: 'percentage' | 'fixed' | 'none'


}

export interface Order {
    order_Id: string;
    paymentId: string
    userId: Schema.Types.ObjectId;
    storeId: Schema.Types.ObjectId;
    // products: OrderProduct[];
    CartId: Schema.Types.ObjectId
    totalPrice: number;
    orderStatus: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
    paymentStatus: 'paid' | 'unpaid' | 'refunded';
    // shippingAddress: string;
    shippingAddress: Schema.Types.ObjectId
    createdAt: Date;
    updatedAt: Date;
    orderId: string
    discountCode: string
    taxAmount: number;
    shippingCost: number;
    commissionAmount: number
    amountToSeller: number
    payoutStatus: 'pending' | 'processed' | 'processing' | 'rejected' | 'reversed' | "queued" | "failed"
    refundId: string
    cancellationReason?: string;
    cancelledAt?: Date;
    refundStatus: 'refunded' | 'partial' | 'not-refunded'

    // subScriptionDiscount: number
}

