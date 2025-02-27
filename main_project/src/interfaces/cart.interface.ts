import mongoose, { Document } from "mongoose";
import ProductInterface from "./Product.interface";
import ProductVariantInterface from "./ProductVariant.interface";

interface CartProduct {
    productId: ProductInterface;
    productVariantId: ProductVariantInterface;
    quantity: number;
    price: number;
    discountCode?: string;
    discountAmount?: number;
    finalPrice: number;
    discountType: 'percentage' | 'fixed' | 'none'


    refundStatus?: 'none' | 'requested' | 'approved' | 'rejected' | 'processed';
    replacementStatus?: 'none' | 'requested' | 'approved' | 'rejected' | 'processed';
    refundPolicy: string;
    replacementPolicy: string;
    deliveredAt?: Date;
    shippedAt?: Date;
    shippingStatus?: 'pending' | 'processing' | 'shipped' | 'out_for_delivery' | 'delivered' | 'returned';
    trackingNumber?: string;
    courierPartner?: string;
    estimatedDelivery?: Date;
    deliveryAgentName?: string;
    deliveryAgentPhone?: string;


    discountedPrice: number



}

export interface CartDocument extends Document {
    userId: mongoose.Schema.Types.ObjectId;
    storeId: mongoose.Schema.Types.ObjectId;
    products: CartProduct[];
    totalPrice: number;
    createdAt: Date;
    updatedAt: Date;
    subScriptionDiscount: number

}
