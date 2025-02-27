import { IDiscount } from "@/interfaces/Discount.interface";
import { DiscountModel } from "@/models/Discount.model";
import { StoreModel } from "@/models/Store.model";
import { HttpException } from "@/exceptions/httpException";
import { Service } from "typedi";
import { Product } from "@/models/Product.model";
import { Category } from "@/models/Category.model";
import { SubCategory } from "@/models/SubCategory.model";
import mongoose from "mongoose";

@Service()
export class DiscountService {

    public async createDiscount(storeId: string, DiscountData: IDiscount) {
        const { ProductIds, CategoryIds, SubCategoryIds } = DiscountData
        const checkStore = await StoreModel.findOne({
            _id: storeId,
            isActive: true,
            status: 'approved'
        });
        if (!checkStore) {
            throw new HttpException(404, 'Store is not found');
        }

        if (CategoryIds && CategoryIds.length > 0) {
            const invalidCategories = await Category.find({ '_id': { $in: CategoryIds }, storeId: storeId });
            console.log("invalidCategories", invalidCategories)
            if (invalidCategories.length !== CategoryIds.length) {
                throw new HttpException(400, 'Some of the provided category IDs are invalid');
            }
        }

        if (SubCategoryIds && SubCategoryIds.length > 0) {
            const invalidSubCategories = await SubCategory.find({ '_id': { $in: SubCategoryIds }, categoryId: { $in: CategoryIds } });
            console.log("invalidSubCategories", invalidSubCategories)
            if (invalidSubCategories.length !== SubCategoryIds.length) {
                throw new HttpException(400, 'Some of the provided subcategory IDs are invalid');
            }
        }

        if (ProductIds && ProductIds.length > 0) {
            const invalidProducts = await Product.find({ '_id': { $in: ProductIds }, storeId: storeId, subCategoryId: { $in: SubCategoryIds } });
            console.log("invalidProducts", invalidProducts)
            if (invalidProducts.length !== ProductIds.length) {
                throw new HttpException(400, 'Some of the provided product IDs are invalid');
            }
        }



        const code = await DiscountModel.findOne({ code: DiscountData.code })
        if (code) {
            throw new HttpException(400, 'Discount code already exists');
        }

        const discount = await DiscountModel.create({ storeId, ...DiscountData });
        return discount;
    }

    public async getDiscountsByStoreId(storeId: string) {
        const discounts = await DiscountModel.find({ storeId }).populate('storeId');
        return discounts;
    }

    public async getAll() {
        const discounts = await DiscountModel.find().populate('storeId', 'storeName');

        const groupedDiscounts = discounts.reduce((acc: any, discount: any) => {
            const storeId = discount.storeId._id.toString();
            if (!acc[storeId]) {
                acc[storeId] = {
                    storeName: discount.storeId.storeName,
                    discounts: []
                };
            }
            acc[storeId].discounts.push(discount);
            return acc;
        }, {});

        return groupedDiscounts;
    }


    public async updateDiscount(discountId: string, discountData: IDiscount) {
        const updatedDiscount = await DiscountModel.findByIdAndUpdate(discountId, discountData, { new: true });
        return updatedDiscount;
    }

    public async deleteDiscount(discountId: string) {
        const deletedDiscount = await DiscountModel.findByIdAndDelete(discountId);
        return deletedDiscount;
    }
}
