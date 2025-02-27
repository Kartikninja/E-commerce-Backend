
import { ProductVariant } from '@models/ProductVariant.model';
import { Product } from '@models/Product.model';
import { Category } from '@models/Category.model';
import { SubCategory } from '@models/SubCategory.model';
import Container, { Service } from 'typedi';
import { HttpException } from '@/exceptions/httpException';
import { StoreModel } from '@/models/Store.model';
import { FilterQuery } from 'mongoose';
import { redisClient } from '@/utils/redisClient';
import { NotificationService } from './Notification.service';
import { sendProductVariantNotificationEmail } from '@/utils/mailer';


@Service()
export class ProductVariantService {
    public notificationService = Container.get(NotificationService)
    public async createProductVariant(storeId: string, productVariantData: any) {
        const { productId, attributes } = productVariantData
        if (!attributes || Object.keys(attributes).length === 0) {
            throw new HttpException(400, 'At least one of attributes must be provided');
        }




        const checkProduct = await Product.findOne({ _id: productVariantData.productId, storeId: storeId })
        if (!checkProduct) {
            throw new HttpException(404, 'Product not found')
        }

        const checkStore = await StoreModel.findOne({ _id: storeId, isActive: true, status: 'approved' })
        if (!checkStore) {
            throw new HttpException(404, 'Store not found')
        }

        const query: any = { productId }
        Object.keys(attributes).forEach(key => {
            query[`attributes.${key}`] = attributes[key]
        })



        const existingProductVarinat = await ProductVariant.findOne({ ...query, variantName: productVariantData.variantName })
        if (existingProductVarinat) {
            throw new HttpException(400, 'Product variant already exists')
        }


        const newProductVariant = await ProductVariant.create({ ...productVariantData, storeId });
        const populatedProductVariant = await ProductVariant.findById(newProductVariant._id).populate('productId');

        if (!checkProduct.hasVariants) {
            await Product.updateOne({ _id: productId }, { hasVariants: true });
        }
        const variants = await ProductVariant.find({ productId }).sort({ price: 1 });
        if (variants.length > 0) {
            await Product.updateOne({ _id: productId }, { basePrice: variants[0].price });
        }

        await this.notificationService.sendNotification({
            modelName: 'ProductVariant',
            type: 'Create-ProductVariant',
            createdBy: 'StoreOwner',
            storeId: storeId,
            productId: productId,
            productVariantId: newProductVariant._id.toString(),
            metadata: { data: productVariantData }
        });

        await sendProductVariantNotificationEmail({
            action: 'Create-ProductVariant',
            productVariantData: populatedProductVariant,
            storeId: storeId,
            productId: productId,
            storeName: checkStore.storeName,
            email: checkStore.email,
        });


        return newProductVariant;
    }


    public async getAllProductVariants() {
        const productVariants = await ProductVariant.aggregate([
            {
                $lookup: {
                    from: 'Products',
                    localField: 'productId',
                    foreignField: '_id',
                    as: 'product',
                },
            },
            {
                $unwind: '$product',
            },
            {
                $lookup: {
                    from: 'subcategories',
                    localField: 'product.subCategoryId',
                    foreignField: '_id',
                    as: 'subCategory',
                },
            },
            {
                $unwind: '$subCategory',
            },
            {
                $lookup: {
                    from: 'Categories',
                    localField: 'subCategory.categoryId',
                    foreignField: '_id',
                    as: 'category',
                },
            },
            {
                $unwind: '$category',
            },
            {
                $group: {
                    _id: {
                        categoryId: '$category._id',
                        categoryName: '$category.name',
                        subCategoryId: '$subCategory._id',
                        subCategoryName: '$subCategory.name',
                        productId: '$product._id',
                        productName: '$product.name',
                    },
                    categoryName: { $first: '$category.name' },
                    subCategoryName: { $first: '$subCategory.name' },
                    products: {
                        $push: {
                            variantId: '$_id',
                            variantName: '$variantName',
                            variantValue: '$variantValue',
                            price: '$price',
                            stockQuantity: '$stockQuantity',
                            stockLeft: '$stockLeft',
                            images: '$images',
                        },
                    },
                },
            },
            {
                $group: {
                    _id: {
                        categoryId: '$_id.categoryId',
                        categoryName: '$_id.categoryName',
                        subCategoryId: '$_id.subCategoryId',
                        subCategoryName: '$_id.subCategoryName',
                    },
                    products: {
                        $push: {
                            productId: '$_id.productId',
                            productName: '$_id.productName',
                            variants: '$products',
                        },
                    },
                },
            },
            {
                $group: {
                    _id: {
                        categoryId: '$_id.categoryId',
                        categoryName: '$_id.categoryName',
                    },
                    subcategories: {
                        $push: {
                            subCategoryId: '$_id.subCategoryId',
                            subCategoryName: '$_id.subCategoryName',
                            products: '$products',
                        },
                    },
                },
            },
            {
                $project: {
                    _id: 0,
                    categoryId: '$_id.categoryId',
                    categoryName: '$_id.categoryName',
                    subcategories: 1,
                },
            },
            {
                $sort: { categoryName: 1 },
            },
        ]);

        return productVariants;
    }






    public async getProductVariantById(id: string) {
        const productVariant = await ProductVariant.findById(id).populate('productId').populate('productId.subCategoryId').populate('productId.subCategoryId.categoryId');
        return productVariant;
    }

    public async updateProductVariant(storeId: string, id: string, productVariantData: any) {
        const checkStore = await StoreModel.findOne({ _id: storeId, isActive: true, status: 'approved' })
        if (!checkStore) {
            throw new HttpException(404, 'Store not found or store is not active');
        }
        const productVariant = await ProductVariant.findOne({ _id: id, storeId: storeId })
        if (!productVariant) {
            throw new HttpException(404, 'Product Variant not found')
        }
        if (productVariant.productId) {
            const productId = await Product.findOne({ _id: productVariant.productId, storeId: storeId })
            if (!productId) {
                throw new HttpException(404, 'Product not found')
            }
        }
        productVariant.price = productVariantData.price || productVariant.price;
        productVariant.stockQuantity = productVariantData.stockQuantity || productVariant.stockQuantity;
        productVariant.stockLeft = productVariantData.stockLeft || productVariant.stockLeft;
        productVariant.images = productVariantData.images || productVariant.images;

        // if (productVariantData.attributes) {
        //     if (productVariantData.attributes.size) {
        //         productVariant.attributes.size = productVariantData.attributes.size;
        //     }
        //     if (productVariantData.attributes.color) {
        //         productVariant.attributes.color = productVariantData.attributes.color;
        //     }
        //     if (productVariantData.attributes.material) {
        //         productVariant.attributes.material = productVariantData.attributes.material;
        //     }
        // }

        const populatedProductVariant = await ProductVariant.findById(productVariant._id)
            .populate('productId');

        productVariant.updatedAt = new Date();
        await productVariant.save();

        await this.notificationService.sendNotification({
            modelName: 'ProductVariant',
            type: 'Update-ProductVariant',
            createdBy: 'StoreOwner',
            storeId: storeId,
            productVariantId: id,
            productId: productVariant.productId,
            metadata: { updates: productVariantData }
        });
        await sendProductVariantNotificationEmail({
            action: 'Update-ProductVariant',
            productVariantData: populatedProductVariant,
            storeId: storeId,
            productId: productVariant.productId,
            storeName: checkStore.storeName,
            email: checkStore.email,
        });

        return productVariant;

    }


    public async deleteProductVariant(storeId: string, variantId: string) {
        const checkStore = await StoreModel.findOne({ _id: storeId, isActive: true, status: 'approved' });
        if (!checkStore) {
            throw new HttpException(404, 'Store not found');
        }

        const productVariant = await ProductVariant.findById(variantId).populate('productId');
        if (!productVariant) {
            throw new HttpException(404, 'Product Variant not found');
        }
        if (productVariant) {
            const remainingVariants = await ProductVariant.countDocuments({ productId: productVariant.productId })
            if (remainingVariants === 0) {
                await Product.updateOne({ _id: productVariant.productId }, { hasVariants: false })
            }
        }

        await ProductVariant.deleteOne({ _id: variantId });

        await this.notificationService.sendNotification({
            modelName: 'ProductVariant',
            type: 'Delete-ProductVariant',
            createdBy: 'StoreOwner',
            storeId: storeId,
            productId: productVariant.productId._id,
            productVariantId: variantId,
            metadata: { data: productVariant },
        });

        await sendProductVariantNotificationEmail({
            action: 'Delete-ProductVariant',
            productVariantData: productVariant,
            storeId: storeId,
            productId: productVariant.productId._id,
            storeName: checkStore.storeName,
            email: checkStore.email,
        });

        return { message: 'Product variant deleted successfully' };
    }



    public async searchProductVariant(queryParams: any) {
        const { attributes, search, subCategoryId, productId, storeId, minPrice, maxPrice, sortBy, sortOrder } = queryParams;
        const page = Number(queryParams.page) || 1;
        const limit = Number(queryParams.limit) || 10;

        if (attributes) {
            Object.entries(JSON.parse(attributes).forEach(([key, value]) => {
                filter[`attributes.${key}`] = value
            }))
        }

        let filter: FilterQuery<typeof ProductVariant> = {}
        if (search) {
            filter.$text = { $search: search }
        }
        if (productId) filter.productId = productId

        if (subCategoryId) filter.subCategoryId = subCategoryId
        if (storeId) filter.storeId = storeId

        if (minPrice || maxPrice) {
            filter.price = {}
            if (minPrice) filter.price.$gte = minPrice
            if (maxPrice) filter.price.$lte = maxPrice

        }

        let sortOptions: any = {}
        if (sortBy) {
            sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1
        } else {
            sortOptions.createdAt = -1
        }

        const skip = (page - 1) * limit

        const catchKey = `search:${JSON.stringify(queryParams)}`
        const cachedData = await redisClient.get(catchKey)
        if (cachedData) {
            console.log("Data is catch from redis")
            return JSON.parse(cachedData)
        }
        console.log('Cache miss. Fetching from MongoDB...');

        const productVariant = await ProductVariant.find(filter)
            .hint({ 'attributes.$**': 1 })
            .sort(sortOptions)
            .skip(skip)
            .limit(Number(limit))

        const totalCount = await ProductVariant.countDocuments(filter)

        const result = {
            productVariant,
            totalCount,
            currentPage: page,
            totalPage: Math.ceil(totalCount / limit)
        }
        await redisClient.set(catchKey, JSON.stringify(result), 'EX', 3600)
        return result
    }
}



