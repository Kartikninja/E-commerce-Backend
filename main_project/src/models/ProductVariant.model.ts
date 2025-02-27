import { model, Schema, Document } from 'mongoose';
import ProductVariantInterface from '@interfaces/ProductVariant.interface';
import { Product } from './Product.model';

const ProductVariantSchema: Schema = new Schema(
    {
        productId: {
            type: Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        variantName: {
            type: String,
            required: true
        },

        price: {
            type: Number,
            required: true
        },
        stockQuantity: {
            type: Number,
            required: true,
            default: 0
        },
        stockLeft: {
            type: Number,
            required: false,
            default: function () {
                return this.stockQuantity;
            }
        },
        images: [
            {
                type: String,
                required: false
            }
        ],
        userId: {
            type: Schema.Types.ObjectId,
            required: false,
            ref: 'User'
        },
        storeId: {
            type: Schema.Types.ObjectId,
            required: false,
            ref: "Store"
        },

        attributes: {
            type: Map,
            of: String,
            required: false
        },
        createdAt: {
            type: Date,
            default: Date.now
        },
        updatedAt: {
            type: Date,
            default: Date.now
        }
    },
    {
        timestamps: true,

    }
);

ProductVariantSchema.post('save', async function (variant) {
    const product = await Product.findById(variant.productId);
    if (product?.hasVariants) {
        const variants = await ProductVariant.find({ productId: variant.productId }).sort({ price: 1 });
        if (variants.length > 0) {
            await Product.updateOne({ _id: variant.productId }, { basePrice: variants[0].price });
        }
    }
});

ProductVariantSchema.post('findOneAndDelete', async function (variant) {
    if (!variant) return;

    const product = await Product.findById(variant.productId);
    if (product?.hasVariants) {
        const variants = await ProductVariant.find({ productId: variant.productId }).sort({ price: 1 });

        if (variants.length > 0) {
            await Product.updateOne({ _id: variant.productId }, { basePrice: variants[0].price });
        } else {
            // If no variants exist, reset basePrice to null and hasVariants to false
            await Product.updateOne({ _id: variant.productId }, { basePrice: null, hasVariants: false });
        }
    }
});



ProductVariantSchema.index({ name: 'text' })
ProductVariantSchema.index({ productId: 1, 'attributes.$**': 1 })
ProductVariantSchema.index({ storeId: 1, price: 1 })
ProductVariantSchema.index({ price: 1 })



export const ProductVariant = model<ProductVariantInterface & Document>('ProductVariant', ProductVariantSchema, 'ProductVariants');
