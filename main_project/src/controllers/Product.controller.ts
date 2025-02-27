import { Request, Response, NextFunction } from 'express';
import ProductService from '@services/Product.service';
import Container from 'typedi';

class ProductController {
    private productService = Container.get(ProductService)

    public createProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { _id: storeId, role } = req.store
            if (role !== 3) {
                res.status(403).json({ message: 'You are not authorized to create a product' })
            }
            console.log("req.store", req.store)
            const productData = req.body;
            const newProduct = await this.productService.createProduct(storeId, productData);
            res.status(201).json({ data: newProduct, message: 'Product created successfully' });
        } catch (error) {
            next(error);
        }
    };

    public getProductsByCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const products = await this.productService.getAllProductsGrouped();
            res.status(200).json({ data: products, message: 'Products retrieved successfully' });
        } catch (error) {
            next(error);
        }
    };

    public getAllProducts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const products = await this.productService.getAllProducts();
            res.status(200).json({ data: products, message: 'Products retrieved successfully' });
        } catch (error) {
            next(error);
        }
    };


    public getProductById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;
            const product = await this.productService.getProductById(id);
            res.status(200).json({ data: product, message: 'Product retrieved successfully' });
        } catch (error) {
            next(error);
        }
    };

    public updateProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const storeId = req.store._id
            const { id } = req.params;
            const productData = req.body;
            const updatedProduct = await this.productService.updateProduct(storeId, id, productData);
            res.status(200).json({ data: updatedProduct, message: 'Product updated successfully' });
        } catch (error) {
            next(error);
        }
    };

    public deleteProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const storeId = req.store._id
            const { id } = req.params;
            await this.productService.deleteProduct(storeId, id);
            res.status(200).json({ message: 'Product deleted successfully' });
        } catch (error) {
            next(error);
        }
    };


    public searchProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const result = await this.productService.searchProduct(req.query)
            res.status(200).json({ success: true, message: 'Product Recived successfull', data: result })
        } catch (err) {
            next(err)
        }
    }


}

export default ProductController;
