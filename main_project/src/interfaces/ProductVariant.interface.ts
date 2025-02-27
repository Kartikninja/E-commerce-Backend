import { Document } from 'mongoose';

export default interface ProductVariantInterface extends Document {
    productId: string;
    price: number;
    stockQuantity: number;
    stockLeft: number;
    images: string[];
    createdAt: Date;
    updatedAt: Date;
    attributes?: Record<string, string>
    userId: string;
    storeId: string;
    variantName: string
}
