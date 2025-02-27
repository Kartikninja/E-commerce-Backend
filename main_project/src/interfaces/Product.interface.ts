import { Document } from 'mongoose';

interface ProductInterface extends Document {
    name: string;
    description: string;
    // price: number;
    // stockQuantity: number;
    images: string[];
    storeId: string;
    createdAt: Date;
    updatedAt: Date;
    // stockLeft: number;
    subCategoryId: string
    userId: string

    refundPolicy: 'no-refund' | '7-days' | '30-days' | 'custom',
    replacementPolicy: 'no-replacement' | '7-days' | '30-days' | 'custom',
    customPolicyDetails: string

    hasVariants: boolean
    basePrice: number
}

export default ProductInterface;
