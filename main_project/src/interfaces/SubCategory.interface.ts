import { model, Schema, Document } from 'mongoose';

export interface SubCategoryInterface extends Document {
    name: string;
    description: string;
    images: string[];
    categoryId: Schema.Types.ObjectId;
    userId: Schema.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
    storeId: string;



    refundPolicy: 'no-refund' | '7-days' | '30-days' | 'custom',
    replacementPolicy: 'no-replacement' | '7-days' | '30-days' | 'custom',
    customPolicyDetails: string

}