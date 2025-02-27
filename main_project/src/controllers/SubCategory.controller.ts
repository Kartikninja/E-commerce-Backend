import { Request, Response, NextFunction } from 'express';
import SubCategoryService from '@/services/SubCategory.service';
import Container from 'typedi';

class SubCategoryController {
    public subCategoryService = Container.get(SubCategoryService)

    public createSubCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { _id: storeId, role } = req.store;
            if (role !== 3) {
                res.status(403).json({ message: 'Only store owners can add subcategories' });
            }

            const subCategoryData = req.body;
            const newSubCategory = await this.subCategoryService.createSubCategory(storeId, subCategoryData);
            res.status(201).json({ data: newSubCategory, message: 'SubCategory created successfully' });
        } catch (error) {
            next(error);
        }
    };

    public getAllSubCategories = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const subCategories = await this.subCategoryService.getAllSubCategories();
            res.status(200).json({ data: subCategories, message: 'SubCategories retrieved successfully' });
        } catch (error) {
            next(error);
        }
    };

    public deleteSubCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const storeId = req.store._id

            const { id } = req.params;
            await this.subCategoryService.deleteSubCategory(storeId, id);
            res.status(200).json({ message: 'SubCategory deleted successfully' });
        } catch (error) {
            next(error);
        }
    };

    public getSubCategoriesGroupedByCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const groupedSubCategories = await this.subCategoryService.getSubCategoriesGroupedByCategory();
            res.status(200).json({ data: groupedSubCategories, message: 'SubCategories grouped by category retrieved successfully' });
        } catch (error) {
            next(error);
        }
    };


    public updateSubcategory = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const storeId = req.store._id
            const { id } = req.params;

            const updatedSubCategory = await this.subCategoryService.updateSubcategory(storeId, id, req.body)
            res.status(200).json({ data: updatedSubCategory, message: 'SubCategory updated' })

        } catch (err) {
            next(err)
        }
    }

    public searchSubcategory = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await this.subCategoryService.searchSubCategory(req.query)
            res.status(200).json({ data: result, message: 'SubCategory Recive' })

        } catch (err) {
            next(err)
        }
    }
}

export default SubCategoryController;
