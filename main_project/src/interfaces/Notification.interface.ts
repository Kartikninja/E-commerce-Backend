import { ObjectId } from 'mongoose';
import { Document } from 'mongodb';

export interface Notification {
    _id?: ObjectId;
    modelName: 'SubCategory' | 'ProductVariant' | 'User' | 'Store' | 'Order' | 'UserSubscription' | 'Subscription' | 'Product' | 'Category';
    userId?: ObjectId;
    storeId?: ObjectId;
    OrderId?: ObjectId;
    usersubScriptionId?: ObjectId
    subScriptionId?: ObjectId;
    message: string;
    type: 'Delete-SubCategory' | 'Update-SubCategory' | 'Delete-Category' | 'Update-Category' | 'Delete-ProductVariant' | 'Update-ProductVariant' | 'Delete-Product' | 'Update-Product' | 'Create-Category' | 'Create-SubCategory' | 'Create-Product' | 'Create-ProductVariant' | 'User-Cancel-SubScription' | 'User-Purchase-SubScription' | 'SubScription-Deleted' | 'SubScription-Created' | 'Reject-Store' | 'Approve-Store' | 'Update-Store' | 'Delete-Store' | 'Store-Reset-Password' | 'Store-Forgot-Password' | 'Login-Store' | 'Create-Store' | 'user-logout' | 'Update-order-status' | 'User-Buy-subscription' | 'user-registered' | 'user-login' | 'admin-notification' | 'new-order' | 'order-updated' | 'order-cancelled' | 'User-Forgot-password' | 'User-Reset-password' | 'User-Update-Profile' | 'Delete-User' | 'Order-delete';
    isRead: boolean;
    createdBy: 'System' | 'Admin' | 'User' | 'StoreOwner' | ObjectId;
    metadata?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date
}

export interface NotificationDocument extends Notification, Document { }
