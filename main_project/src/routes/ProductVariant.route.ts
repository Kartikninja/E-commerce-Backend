import { Router } from 'express';
import { ProductVariantController } from '@controllers/ProductVariant.controller';
import { AuthMiddlewareStore } from '@/middlewares/auth.middleware';

class ProductVariantRouter {
    public path = '/productVariants';
    public router = Router();
    private productVariantController = new ProductVariantController();

    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.post(`${this.path}`, AuthMiddlewareStore, this.productVariantController.createProductVariant);
        this.router.get(`${this.path}`, this.productVariantController.getAllProductVariants);
        this.router.get(`${this.path}/:id`, this.productVariantController.getProductVariantById);
        this.router.put(`${this.path}/:id`, AuthMiddlewareStore, this.productVariantController.updateProductVariant);
        this.router.delete(`${this.path}/:id`, AuthMiddlewareStore, this.productVariantController.deleteProductVariant);
    }
}

export default ProductVariantRouter;
