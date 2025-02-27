import { SubCategoryInterface } from "@/interfaces/SubCategory.interface";
import { model, Schema, Document } from "mongoose";

const SubCategorySchema: Schema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            required: true,
        },
        images: [
            {
                type: String,
                required: false,
            },
        ],
        categoryId: {
            type: Schema.Types.ObjectId,
            ref: 'Category',
            required: true,
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        storeId: {
            type: Schema.Types.ObjectId,
            ref: 'Store'
        },
        refundPolicy: { type: String, enum: ['no-refund', '7-days', '30-days', 'custom'], default: 'no-refund', required: false },
        replacementPolicy: { type: String, enum: ['no-replacement', '7-days', '30-days', 'custom'], default: 'no-replacement', required: false },
        customPolicyDetails: { type: String, required: false }
    },
    {
        timestamps: true,
    }
);

SubCategorySchema.index({ name: 'text', description: 'text' }, { weights: { name: 10, description: 5 } })
SubCategorySchema.index({ storeId: 1, categoryId: 1, createdAt: -1 })




export const SubCategory = model<SubCategoryInterface & Document>('SubCategory', SubCategorySchema);

