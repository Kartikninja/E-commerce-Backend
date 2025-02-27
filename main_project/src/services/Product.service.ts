import { Product } from '@models/Product.model';
import ProductInterface from '@interfaces/Product.interface';
import Container, { Service } from 'typedi';
import { StoreModel } from '@/models/Store.model';
import { HttpException } from '@/exceptions/httpException';
import { SubCategory } from '@/models/SubCategory.model';
import { Category } from '@/models/Category.model';
import { redisClient } from '@/utils/redisClient';
import { FilterQuery } from 'mongoose';
import { NotificationService } from './Notification.service';
import { sendProductCreatedEmail, sendProductDeletedEmail, sendProductUpdatedEmail } from '@/utils/mailer';

@Service()
class ProductService {
    public notificationService = Container.get(NotificationService)
    public async createProduct(storeId: string, productData: ProductInterface): Promise<ProductInterface> {


        const checkStore = await StoreModel.findOne({ _id: storeId, isActive: true, status: 'approved' })
        if (!checkStore) {
            throw new HttpException(400, 'Invalid storeId or you are not authorized to manage this store');
        }

        const checkSubCategory = await SubCategory.findOne({ _id: productData.subCategoryId })
        if (!checkSubCategory) {
            throw new HttpException(400, 'Invalid subCategoryId')
        }

        const checkName = await Product.find({ name: { $regex: new RegExp(`^${productData.name}$`, 'i') }, storeId: storeId })
        if (checkName.length > 0) {
            throw new HttpException(400, 'Product name already exists');
        }

        if (!productData.hasVariants && !productData.basePrice) {
            throw new HttpException(400, 'Base price is required for non variant products')
        }

        const newProduct = await Product.create({ ...productData, storeId });
        await this.notificationService.sendNotification({
            modelName: 'Product',
            type: 'Create-Product',
            createdBy: 'StoreOwner',
            storeId: storeId,
            subCategoryId: productData.subCategoryId,
            productId: newProduct._id.toString(),
            metadata: { data: productData }
        })
        await sendProductCreatedEmail({
            productName: newProduct.name,
            email: checkStore.email,
            storeName: checkStore.storeName,
            storeId: storeId,
            subCategoryName: checkSubCategory.name
        });

        return newProduct;
    }

    public getAllProducts = async (): Promise<ProductInterface[]> => {

        const catchKey = 'getAllProducts'
        const redisData = await redisClient.get(catchKey)
        if (redisData) {

            return JSON.parse(redisData)
        }

        const product = await Product.find();
        await redisClient.set(catchKey, JSON.stringify(product), 'EX', 3600)
        return product
    };

    public getAllProductsGrouped = async (): Promise<any[]> => {
        const cacheKey = 'allProductsGrouped'

        const cachedData = await redisClient.get(cacheKey)
        if (cachedData) {
            return JSON.parse(cachedData)
        }


        const categories = await Category.find();

        const result = [];

        for (let category of categories) {

            const subCategories = await SubCategory.find({ categoryId: category._id });

            const subCategoryProducts = [];

            for (let subCategory of subCategories) {

                const products = await Product.find({ subCategoryId: subCategory._id });

                subCategoryProducts.push({
                    subCategory: subCategory.name,
                    products: products,
                });
            }



            result.push({
                category: category.name,
                subCategories: subCategoryProducts,
            });
        }
        await redisClient.set(cacheKey, JSON.stringify(result), 'EX', 3600)

        return result;
    };



    public async getProductById(productId: string): Promise<ProductInterface | null> {
        return await Product.findById(productId);
    }

    public async updateProduct(storeId: string, productId: string, productData: ProductInterface): Promise<ProductInterface | null> {

        const product = (await Product.findOne({ _id: productId, storeId: storeId })).populated('storeId');
        if (!product) {
            throw new HttpException(404, 'Product not found with this store');
        }
        let subName;
        if (productData.subCategoryId) {
            const checkSubCategory = (await SubCategory.findOne({ _id: productData.subCategoryId, storeId: storeId })).populated('storeId');
            if (!checkSubCategory) {
                throw new HttpException(400, 'Invalid subCategoryId');
            }
            checkSubCategory.name = subName
        }
        if (productData.name && productData.name !== product.name) {
            const existingProduct = await Product.findOne({ name: productData.name });
            if (existingProduct) {
                throw new HttpException(400, 'Product name already exists');
            }
        }

        product.name = productData.name || product.name;
        product.description = productData.description || product.description;
        product.images = productData.images || product.images;
        product.subCategoryId = productData.subCategoryId || product.subCategoryId;
        product.updatedAt = new Date();
        await product.save();
        await this.notificationService.sendNotification({
            modelName: 'Product',
            type: 'Update-Product',
            createdBy: 'StoreOwner',
            storeId: storeId,
            productId: productId,
            subCategoryId: productData.subCategoryId || product.subCategoryId,
            metadata: { updates: productData }
        })
        await sendProductUpdatedEmail({
            productName: product.name,
            email: product.email,
            storeName: product.storeName,
            storeId: storeId,
            subCategoryName: subName
        });

        return product;
    }

    public async deleteProduct(storeId: string, productId: string) {

        const deleteProduct = (await Product.findByIdAndDelete({ _id: productId, storeId: storeId })).populated('storeId');
        if (!deleteProduct) {
            throw new HttpException(404, 'Product not found with this store');
        }
        await sendProductDeletedEmail({
            productName: deleteProduct.name,
            email: deleteProduct.email,
            storeName: deleteProduct.storeName,
            storeId: storeId,
            subCategoryName: deleteProduct.subCategoryId
        });
        await this.notificationService.sendNotification({
            modelName: 'Product',
            type: 'Delete-Product',
            createdBy: 'StoreOwner',
            storeId: storeId,
            productId: productId
        })

        return deleteProduct;
    }


    public async searchProduct(queryParams: any) {

        const { search, subCategoryId, storeId, minPrice, maxPrice, sortBy, sortOrder, page = 1, limit = 10 } = queryParams;
        let filter: FilterQuery<typeof Product> = {}
        if (search) {
            filter.$text = { $search: search }
        }
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
            return JSON.parse(cachedData)
        }

        const products = await Product.find(filter)
            .sort(sortOptions)
            .skip(skip)
            .limit(Number(limit))

        const totalCount = await Product.countDocuments(filter)

        const result = {
            products,
            totalCount,
            currentPage: page,
            totalPage: Math.ceil(totalCount / limit)
        }
        await redisClient.set(catchKey, JSON.stringify(result), 'EX', 3600)
        return result
    }



}

export default ProductService;
