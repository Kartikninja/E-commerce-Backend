import { Document } from 'mongoose';
import { Discount_TYPE } from '@/utils/constant';

export interface IDiscount extends Document {
    storeId: string;
    code: string;
    discount_type: Discount_TYPE;
    start_date: Date;
    end_date: Date;
    value: number;
    unit: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    ProductIds: string[]
    CategoryIds: string[]
    SubCategoryIds: string[]
}


export interface CartItem {
    Product_id: string;
    quantity: number;
    variant: {
        price: number;
    };
    Product?: Product;
    discountCode?: string
}

export interface DiscountAttributes {
    id: number | null;
    discount_type: 'percentage' | 'fixed' | 'none';
    value: number;
    is_active: boolean;
    discountAmount: number;
    totalAfterDiscount: number;
    breakdown: {
        product: {
            discounts: any[];
            totals: {
                originalTotal: number;
                discountTotal: number;
                finalTotal: number;
            };
        };
        subCategory: {
            discounts: any[];
            totals: {
                originalTotal: number;
                discountTotal: number;
                finalTotal: number;
            };
        };
        category: {
            discounts: any[];
            totals: {
                originalTotal: number;
                discountTotal: number;
                finalTotal: number;
            };
        };
    };
}


export interface Product {
    SubCategory_id: string;
    Category_id: string;

}

