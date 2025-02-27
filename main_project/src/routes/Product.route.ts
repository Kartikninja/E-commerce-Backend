import { Router } from 'express';
import ProductController from '@controllers/Product.controller';
import { AuthMiddlewareStore } from '@/middlewares/auth.middleware';

class ProductRouter {
    public path = '/products';
    public router = Router();
    private productController = new ProductController();

    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.post(`${this.path}`, AuthMiddlewareStore, this.productController.createProduct);
        this.router.get(`${this.path}`, this.productController.getAllProducts);
        this.router.get(`${this.path}/:id`, this.productController.getProductById);
        this.router.put(`${this.path}/:id`, AuthMiddlewareStore, this.productController.updateProduct);
        this.router.delete(`${this.path}/:id`, AuthMiddlewareStore, this.productController.deleteProduct);
        this.router.get(`${this.path}/get/search`, this.productController.searchProduct)
        this.router.get(`${this.path}/getAll/category`, this.productController.getProductsByCategory)


    }
}

export default ProductRouter;
