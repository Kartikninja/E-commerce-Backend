import { CartDocument } from '@/interfaces/cart.interface';
import mongoose, { Document, model } from 'mongoose';
import { Schema } from 'mongoose';

const CartSchema: Schema = new Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
    products: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        productVariantId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductVariant', required: true },
        quantity: { type: Number, required: true, default: 1 },
        price: { type: Number, required: false },
        discountAmount: { type: Number, default: 0 },
        finalPrice: { type: Number, default: 0 },

        refundStatus: {
            type: String,
            enum: ['none', 'requested', 'approved', 'rejected', 'processed'],
            default: 'none',
            required: false
        },
        replacementStatus: {
            type: String,
            required: false,
            enum: ['none', 'requested', 'approved', 'rejected', 'processed'],
            default: 'none'
        },
        deliveredAt: { type: Date },
        refundPolicy: { type: String },
        replacementPolicy: { type: String },

        shippingStatus: {
            type: String,
            enum: ['pending', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'returned'],
            default: 'pending'
        },
        trackingNumber: { type: String },
        courierPartner: { type: String },
        estimatedDelivery: { type: Date },
        shippedAt: { type: Date },
        deliveryAgentName: { type: String },
        deliveryAgentPhone: { type: String },

        discountedPrice: { type: Number, required: false },
        discountType: { type: String, enum: ['percentage', 'fixed', 'none'], default: 'none' }
    }],
    subScriptionDiscount: { type: Number, default: 0 },
    totalPrice: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

export const cartModel = model<Document & CartDocument>('Cart', CartSchema);


// const CartSchema: Schema = new Schema({
//     userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
//     storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
//     products: [{
//         productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
//         productVariantId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductVariant', required: true },
//         quantity: { type: Number, required: true, default: 1 },
//         price: { type: Number, required: true },
//         discountAmount: { type: Number, default: 0 },
//         finalPrice: { type: Number, default: 0 },
//         discountType: { type: String, enum: ['percentage', 'fixed', 'none'], default: 'none' }


//     }],
//     subScriptionDiscount: { type: Number, default: 0 },
//     totalPrice: { type: Number, default: 0 },
//     createdAt: { type: Date, default: Date.now },
//     updatedAt: { type: Date, default: Date.now }
// },
//     { timestamps: true });

// export const cartModel = model<Document & CartDocument>('Cart', CartSchema)

