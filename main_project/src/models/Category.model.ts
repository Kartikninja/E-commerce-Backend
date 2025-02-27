import { CategoryInterface } from '@/interfaces/Category.interface';
import { model, Schema, Document } from 'mongoose';

const CategorySchema: Schema = new Schema(
    {
        name: { type: String, required: true, unique: true, trim: true },
        description: { type: String, trim: true },
        images: { type: [String], default: [] },
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: false

        },
        storeId: {
            type: Schema.Types.ObjectId,
            ref: 'Store',
            required: true,
        },
        refundPolicy: { type: String, enum: ['no-refund', '7-days', '30-days', 'custom'], default: 'no-refund', required: false },
        replacementPolicy: { type: String, enum: ['no-replacement', '7-days', '30-days', 'custom'], default: 'no-replacement', required: false },
        customPolicyDetails: { type: String, required: false }

    },
    { timestamps: true }
);


CategorySchema.index({ name: "text", description: 'text' })
CategorySchema.index({ storeId: 1, name: 'text' })

export const Category = model<Document & CategoryInterface>('Category', CategorySchema, 'Categories');
