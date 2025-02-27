import { DiscountService } from "@/services/Discount.service";
import { NextFunction, Request, Response } from "express";
import Container from "typedi";

export class DiscountController {
    private discount = Container.get(DiscountService);

    public createDiscount = async (req: Request, res: Response, next: NextFunction) => {
        try {
            // const { storeId, code, discount_type, start_date, end_date, value, Until, isActive, ProductIds, CategoryIds, SubCategoryIds } = req.body;
            const { _id: storeId } = req.store;

            console.log("storeId", storeId)

            const discountData = req.body;
            const discount = await this.discount.createDiscount(storeId, discountData);

            res.status(201).json({ data: discount, message: "Discount added successfully", status: true });
        } catch (error) {
            next(error);
        }
    };

    public getDiscountsByStoreId = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { storeId } = req.query;
            let discounts;

            if (storeId) {
                discounts = await this.discount.getDiscountsByStoreId(storeId as string);
            } else {
                discounts = await this.discount.getAll();
            }

            res.status(200).json({ data: discounts, message: "Discounts fetched successfully", status: true });
        } catch (error) {
            next(error);
        }
    };

    public updateDiscount = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { discountId } = req.params;
            const discountData = req.body;

            const updatedDiscount = await this.discount.updateDiscount(discountId, discountData);

            if (!updatedDiscount) {
                return res.status(404).json({ message: 'Discount not found', status: false });
            }

            res.status(200).json({ data: updatedDiscount, message: 'Discount updated successfully', status: true });
        } catch (error) {
            next(error);
        }
    };

    public deleteDiscount = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { discountId } = req.params;
            const deletedDiscount = await this.discount.deleteDiscount(discountId);

            if (!deletedDiscount) {
                return res.status(404).json({ message: 'Discount not found', status: false });
            }

            res.status(200).json({ message: 'Discount deleted successfully', status: true });
        } catch (error) {
            next(error);
        }
    };
}
