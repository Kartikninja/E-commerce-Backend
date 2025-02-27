import { Router } from 'express';
import SubCategoryController from '@/controllers/SubCategory.controller';
import { AuthMiddlewareStore } from '@middlewares/auth.middleware';

class SubCategoryRoute {
    public path = '/subcategories';
    public router = Router();
    public subCategoryController = new SubCategoryController();

    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.post(`${this.path}`, AuthMiddlewareStore, this.subCategoryController.createSubCategory);
        this.router.get(`${this.path}`, AuthMiddlewareStore, this.subCategoryController.getAllSubCategories);
        this.router.delete(`${this.path}/:id`, AuthMiddlewareStore, this.subCategoryController.deleteSubCategory);
        this.router.get(`${this.path}/get/search`, this.subCategoryController.searchSubcategory)
        this.router.get(`${this.path}/getAll/category`, this.subCategoryController.getSubCategoriesGroupedByCategory)

        this.router.put(`${this.path}/:id`, AuthMiddlewareStore, this.subCategoryController.updateSubcategory)

    }
}

export default SubCategoryRoute;
