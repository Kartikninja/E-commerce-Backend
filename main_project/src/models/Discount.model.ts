import { IDiscount } from '@/interfaces/Discount.interface';
import { Discount_TYPE } from '@/utils/constant';
import { model, Schema, Document } from 'mongoose';

const DiscountSchema: Schema = new Schema(
    {
        storeId: {
            type: Schema.Types.ObjectId,
            ref: 'Store'
        },
        code: {
            type: String,
            required: false
        },
        discount_type: {
            type: Number,
            enum: Discount_TYPE,
            default: 1,
        },
        start_date: {
            type: Date,
        },
        end_date: {
            type: Date,
        },
        value: {
            type: Number,
            required: true
        },
        unit: {
            type: Number,
            required: false
        },
        isActive: {
            type: Boolean,
            default: false
        },
        ProductIds: [{
            type: String,
            required: true
        }],
        CategoryIds: [{
            type: String,
            required: true
        }],
        SubCategoryIds: [{
            type: String,
            required: true
        }]
    },
    { timestamps: true, versionKey: false }
);

export const DiscountModel = model<Document & IDiscount>('Discount', DiscountSchema, 'Discounts');
