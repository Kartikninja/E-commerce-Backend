import { Request, Response, NextFunction } from 'express';
import { CategoryService } from '@services/Category.service';
import { CategoryInterface } from '@interfaces/Category.interface';
import Container from 'typedi';

export class CategoryController {
    private categoryService = Container.get(CategoryService);

    public createCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {

            const storeId = req.store._id
            const userRole = req.store.role
            if (userRole !== 3) {
                res.status(403).json({ message: 'You are not authorized to create a category' })
            }
            const categoryData: CategoryInterface = { ...req.body, storeId };
            const newCategory = await this.categoryService.createCategory(categoryData);
            res.status(201).json({ data: newCategory, message: 'Category created successfully' });
        } catch (error) {
            next(error);
        }
    };

    public getAllCategories = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const categories = await this.categoryService.getAllCategories();
            res.status(200).json({ data: categories, message: 'Categories retrieved successfully' });
        } catch (error) {
            next(error);
        }
    };

    public getCategoryById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const categoryId = req.params.id;
            const category = await this.categoryService.getCategoryById(categoryId);
            res.status(200).json({ data: category, message: 'Category retrieved successfully' });
        } catch (error) {
            next(error);
        }
    };

    public updateCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const storeId = req.store._id
            const categoryId = req.params.id;
            const categoryData: Partial<CategoryInterface> = req.body;
            const updatedCategory = await this.categoryService.updateCategory(storeId, categoryId, categoryData);
            res.status(200).json({ data: updatedCategory, message: 'Category updated successfully' });
        } catch (error) {
            next(error);
        }
    };

    public deleteCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const storeId = req.store._id
            const categoryId = req.params.id;
            const deletedCategory = await this.categoryService.deleteCategory(storeId, categoryId);
            res.status(200).json({ data: deletedCategory, message: 'Category deleted successfully' });
        } catch (error) {
            next(error);
        }
    };





    public getAllCategoriesByUserId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const categoriesByUserId = await this.categoryService.getAllCategoriesGroupedByUserId();
            res.status(200).json({ data: categoriesByUserId, message: 'Categories grouped by user retrieved successfully' });
        } catch (error) {
            next(error);
        }
    };


    public searchCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const result = await this.categoryService.searchCategory(req.query)
            res.status(200).json({ success: true, result, message: "Category Recived" });


        } catch (err) {
            next(err)
        }
    }

}
