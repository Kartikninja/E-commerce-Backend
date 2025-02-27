import { Router } from 'express';
import { CategoryController } from '@controllers/Category.controller';
import { AuthMiddleware, AuthMiddlewareStore } from '@/middlewares/auth.middleware';

class CategoryRoute {
    public path = '/categories';
    public router = Router();
    private categoryController = new CategoryController();

    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.post(`${this.path}`, AuthMiddlewareStore, this.categoryController.createCategory);
        this.router.get(`${this.path}`, this.categoryController.getAllCategories);
        this.router.get(`${this.path}/:id`, this.categoryController.getCategoryById);
        this.router.put(`${this.path}/:id`, AuthMiddlewareStore, this.categoryController.updateCategory);
        this.router.delete(`${this.path}/:id`, AuthMiddlewareStore, this.categoryController.deleteCategory);
        this.router.get(`${this.path}/getby/user`, this.categoryController.getAllCategoriesByUserId)

        this.router.get(`${this.path}/get/search`, this.categoryController.searchCategory)
    }
}

export default CategoryRoute;
