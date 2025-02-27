

import { model, Schema, Document } from 'mongoose'
import ProductInterface from '@interfaces/Product.interface'
import { SubCategory } from './SubCategory.model';
import { Category } from './Category.model';
import { ProductVariant } from './ProductVariant.model';

const ProductSchema: Schema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },
        description: {
            type: String,
            required: true
        },
        basePrice: {
            type: Number,
            required: false
        },

        hasVariants: {
            type: Boolean,
            default: false
        },
        stockQuantity: {
            type: Number,
            required: function () { return !this.hasVariants },
            default: null
        },
        stockLeft: {
            type: Number,
            required: false,
            default: function () {
                return this.stockQuantity;
            }
        },
        images: [{
            type: String,
            required: false
        }],
        storeId: {
            type: Schema.Types.ObjectId,
            ref: 'Store',
            required: true
        },
        subCategoryId: {
            type: Schema.Types.ObjectId,
            ref: 'SubCategory',
            required: true
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        createdAt: {
            type: Date,
            default: Date.now
        },
        updatedAt: {
            type: Date,
            default: Date.now
        },
        refundPolicy: { type: String, enum: ['no-refund', '7-days', '30-days', 'custom'], default: 'no-refund' },
        replacementPolicy: { type: String, enum: ['no-replacement', '7-days', '30-days', 'custom'], default: 'no-replacement' },
        customPolicyDetails: { type: String, required: false }
    },
    {
        timestamps: true
    }
);

ProductSchema.pre('save', async function (next) {
    try {
        if (this.hasVariants) {
            const variants = await ProductVariant.find({ productId: this._id }).sort({ price: 1 });
            if (variants.length > 0) {
                this.basePrice = variants[0].price;
            }
        }

        if (!this.refundPolicy || !this.replacementPolicy) {
            const subCategory = await SubCategory.findById(this.subCategoryId).populate('categoryId');
            if (subCategory) {
                this.refundPolicy = this.refundPolicy || subCategory.refundPolicy;
                this.replacementPolicy = this.replacementPolicy || subCategory.replacementPolicy;
            }

            if (!this.refundPolicy || !this.replacementPolicy) {
                const category = await Category.findById(subCategory?.categoryId);
                if (category) {
                    this.refundPolicy = this.refundPolicy || category.refundPolicy;
                    this.replacementPolicy = this.replacementPolicy || category.replacementPolicy;
                }
            }
        }
    } catch (err) {
        console.error('Error setting default policies:', err);
    }
    next();
});



ProductSchema.index({ name: "text", description: "text" }, { weights: { name: 10, description: 5 } });

ProductSchema.index({ storeId: 1, subCategoryId: 1, basePrice: 1 });
ProductSchema.index({ storeId: 1, createdAt: -1 });

ProductSchema.index({ createdAt: -1 });


export const Product = model<ProductInterface & Document>('Product', ProductSchema, 'Products');

