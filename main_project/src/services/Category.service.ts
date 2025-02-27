import { Category } from '@models/Category.model';
import { CategoryInterface } from '@interfaces/Category.interface';
import Container, { Service } from 'typedi';
import { HttpException } from '@/exceptions/httpException';
import { StoreModel } from '@/models/Store.model';
import { redisClient } from '@/utils/redisClient';
import { FilterQuery } from 'mongoose';
import { NotificationService } from './Notification.service';
import { sendCategoryAddedEmail, sendCategoryDeletedEmail, sendCategoryUpdatedEmail } from '@/utils/mailer';


@Service()
export class CategoryService {

    public notificationService = Container.get(NotificationService)
    public async createCategory(categoryData: CategoryInterface): Promise<CategoryInterface> {
        const checkName = await Category.findOne({ name: categoryData.name })
        if (checkName) {
            throw new HttpException(404, 'Category name already exists')
        }
        const checkStore = await StoreModel.findOne({ _id: categoryData.storeId, status: 'approved', isActive: true })
        if (!checkStore) {
            throw new HttpException(404, 'Store not found')
        }
        const category = await Category.create(categoryData);
        await this.notificationService.sendNotification({
            modelName: 'Category',
            type: 'Create-Category',
            createdBy: 'StoreOwner',
            storeId: categoryData.storeId,
            categoryId: category._id.toString(),
            metadata: { data: categoryData }
        });
        await sendCategoryAddedEmail({
            categoryName: categoryData.name,
            email: checkStore.email,
            storeName: checkStore.storeName,
            storeId: checkStore._id,
        });
        return category;
    }

    public async getAllCategories(): Promise<CategoryInterface[]> {
        const cacheKey = 'categories:all';

        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
            console.log('Cache hit ✅');
            return JSON.parse(cachedData);
        }
        console.log('Cache miss ❌. Fetching from MongoDB...');

        const categories = await Category.find();
        await redisClient.set(cacheKey, JSON.stringify(categories), 'EX', 600);

        return categories;
    }

    public async getCategoryById(categoryId: string): Promise<CategoryInterface | null> {
        const category = await Category.findById(categoryId);
        if (!category) throw new Error('Category not found');
        return category;
    }

    public async updateCategory(storeId: string, categoryId: string, categoryData: Partial<CategoryInterface>): Promise<CategoryInterface | null> {
        const checkStore = await StoreModel.findOne({ _id: storeId, isActive: true, status: 'approved' })
        if (!checkStore) {
            throw new HttpException(404, 'Store not found or store is not active');
        }
        const updatedCategory = await Category.findOne({ _id: categoryId, storeId: storeId });
        if (!updatedCategory) throw new Error('Category not found');
        updatedCategory.name = categoryData.name || updatedCategory.name;
        updatedCategory.description = categoryData.description || updatedCategory.description;
        updatedCategory.images = categoryData.images || updatedCategory.images;


        await updatedCategory.save();
        await this.notificationService.sendNotification({
            modelName: 'Category',
            type: 'Update-Category',
            createdBy: 'StoreOwner',
            storeId: storeId,
            categoryId: categoryId,
            metadata: { updates: categoryData }
        });


        await sendCategoryUpdatedEmail({
            categoryName: updatedCategory.name,
            email: checkStore.email,
            storeName: checkStore.storeName,
            storeId: checkStore._id,
            updates: categoryData,
        });
        return updatedCategory;
    }

    public async deleteCategory(storeId: string, categoryId: string): Promise<CategoryInterface | null> {
        const checkStore = await StoreModel.findOne({ _id: storeId, isActive: true, status: 'approved' })
        if (!checkStore) {
            throw new HttpException(404, 'Store not found or store is not active');
        }
        const deletedCategory = await Category.findByIdAndDelete({ _id: categoryId, storeId: storeId });
        if (!deletedCategory) throw new Error('Category not found');
        await this.notificationService.sendNotification({
            modelName: 'Category',
            type: 'Delete-Category',
            createdBy: 'StoreOwner',
            storeId: storeId,
            categoryId: categoryId
        });
        await sendCategoryDeletedEmail({
            categoryName: deletedCategory.name,
            email: checkStore.email,
            storeName: checkStore.storeName,
            storeId: checkStore._id,
        });
        return deletedCategory;
    }



    public async getAllCategoriesGroupedByUserId(): Promise<any> {
        const cacheKey = 'categories:grouped';

        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
            console.log('Cache hit ✅');
            return JSON.parse(cachedData);
        }
        const categories = await Category.aggregate([
            {
                $group: {
                    _id: "$userId",
                    categories: {
                        $push: {
                            _id: "$_id",
                            name: "$name",
                            description: "$description",
                            images: "$images",
                            createdAt: "$createdAt",
                            updatedAt: "$updatedAt",
                        },
                    },
                },
            },
            {
                $lookup: {
                    from: "Users",
                    localField: "_id",
                    foreignField: "_id",
                    as: "userInfo",
                },
            },
            {
                $unwind: "$userInfo",
            },
            {
                $project: {
                    // userInfo: {
                    //     _id: 1,
                    //     fullName: 1,
                    //     email: 1,
                    //     role: 1,
                    // },
                    categories: 1,
                },
            },
        ]);
        await redisClient.set(cacheKey, JSON.stringify(categories), 'EX', 600);

        return categories;
    }

    public async searchCategory(queryParams: any) {
        const { search, storeId, minPrice, maxPrice, sortBy, sortOrder, page = 1, limit = 10 } = queryParams;
        let filter: FilterQuery<typeof Category> = {}

        console.log("queryParams", queryParams)

        if (search) {
            filter.$text = { $search: search }
        }
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



        const cacheKey = `categories:search:${JSON.stringify(queryParams)}`;
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
            console.log('Cache hit ✅');

            return JSON.parse(cachedData);

        }

        const categories = await Category.find(filter)
            .sort(sortOptions)
            .skip(skip)
            .limit(Number(limit));

        const totalCount = await Category.countDocuments(filter);
        const responseData = {
            categories,
            totalCount,
            currentPage: page,
            totalPage: Math.ceil(totalCount / limit),
        };
        await redisClient.set(cacheKey, JSON.stringify(responseData), 'EX', 3600)

        return responseData


    }


}
