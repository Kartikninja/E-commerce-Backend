
import { Request, Response, NextFunction } from 'express';
import { ProductVariantService } from '@services/ProductVariant.service';
import Container from 'typedi';

export class ProductVariantController {
    private productVariantService = Container.get(ProductVariantService);

    public createProductVariant = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { _id: storeId, role } = req.store;
            if (role !== 3) {
                res.status(403).json({ message: 'You are not authorized to create a product variant' });
            }

            const productVariantData = req.body;
            const newProductVariant = await this.productVariantService.createProductVariant(storeId, productVariantData);
            res.status(201).json({ data: newProductVariant, message: 'Product variant created successfully' });
        } catch (error) {
            next(error);
        }
    };

    public getAllProductVariants = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const productVariants = await this.productVariantService.getAllProductVariants();
            res.status(200).json({ data: productVariants, message: 'Product variants retrieved successfully' });
        } catch (error) {
            next(error);
        }
    };

    public getProductVariantById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;
            const productVariant = await this.productVariantService.getProductVariantById(id);
            res.status(200).json({ data: productVariant, message: 'Product variant retrieved successfully' });
        } catch (error) {
            next(error);
        }
    };

    public updateProductVariant = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const storeId = req.store._id
            const { id } = req.params;
            const productVariantData = req.body;
            const updatedProductVariant = await this.productVariantService.updateProductVariant(storeId, id, productVariantData);
            res.status(200).json({ data: updatedProductVariant, message: 'Product variant updated successfully' });
        } catch (error) {
            next(error);
        }
    };

    public deleteProductVariant = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const storeId = req.store._id
            const { id } = req.params;
            await this.productVariantService.deleteProductVariant(storeId, id);
            res.status(200).json({ message: 'Product variant deleted successfully' });
        } catch (error) {
            next(error);
        }
    };



    public searchProductVariant = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {

            const result = await this.productVariantService.searchProductVariant(req.query);
            res.status(200).json({ message: 'Product variant deleted successfully',success:true,data:result });
        } catch (error) {
            next(error);
        }
    };
}

