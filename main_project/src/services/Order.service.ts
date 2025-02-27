import Container, { Service } from 'typedi';
import { OrderModel } from '@models/Order.model';
import { StoreModel } from '@/models/Store.model';
import { HttpException } from '@/exceptions/httpException';
import { UserModel } from '@/models/users.model';
import { Product } from '@/models/Product.model';
import { ProductVariant } from '@/models/ProductVariant.model';
import { PaymentService } from './Paymnet.Service';
import { DiscountModel } from '@/models/Discount.model';
import { Discount_TYPE, SUBSCRIPTIONS_TYPES } from '@/utils/constant';
import { SubCategory } from '@/models/SubCategory.model';
import { NotificationService } from './Notification.service';
import { sendCancellationEmail, sendDeletionEmail, sendOrderUpdateEmail, sendPurchaseEmail, sendStatusUpdateEmail } from '@/utils/mailer';
import { CartItem, DiscountAttributes } from '@/interfaces/Discount.interface';
import { RazorpayService } from './razorpay.service';
import { razorpayInstance } from '@/controllers/Payment.controller';
import { Order } from '@/interfaces/Order.interface';
import { UserSubscriptionModel } from '@/models/UserSubscriptionSchema.model';
import { SubscriptionModel } from '@/models/Subscription.model';
import { v4 as uuidv4 } from 'uuid'
import { Queue } from 'bullmq';
import { REDIS_HOST, REDIS_PORT } from '@/config';
import { cartModel } from '@/models/cart.model';
import { AddressModel } from '@/models/Address.model';
import paymentClient from '@/grpc/grpcClient';


@Service()
class OrderService {

    private payment = Container.get(PaymentService)
    private notification = Container.get(NotificationService)

    private razorpayService = Container.get(RazorpayService)




    public async createOrder(userId: string, cartId: string): Promise<any> {
        const cart = await cartModel.findOne({ userId: userId, _id: cartId });
        if (!cart) throw new HttpException(404, 'Cart not found');

        const { storeId, products, totalPrice } = cart;
        const cart1 = await cartModel.findOne({ userId: userId, _id: cartId }).populate('products.productId').populate('products.productVariantId');

        const store = await StoreModel.findOne({ _id: storeId, isActive: true, status: 'approved' });
        if (!store) throw new HttpException(404, 'This Store is not found');

        const user = await UserModel.findOne({ _id: userId, isVerified: true });
        if (!user) throw new HttpException(404, 'User not found or not verified');

        const shippingAddress = await AddressModel.findOne({ userId: userId })

        try {
            const paymentRequest = { userId, amount: totalPrice, paymentMethod: 'razorpay', modelName: 'Order' };
            const payment: any = await new Promise((resolve, reject) => {
                console.log('Razorpay Payment hit in Order Service')
                paymentClient.CreateRazorpayOrder(paymentRequest, (error, response) => {
                    if (error) reject(error)
                    else resolve(response)
                })
            })
            console.log("payment", payment)
            // const payment = await grpcClient.createPaymentOrder(paymentRequest);
            // const payment = await this.payment.createRazorpayOrder(totalPrice, userId, 'razorpay', 'Order');
            console.log('payment', payment);

            const order_Id = `ORD-${new Date().getTime()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
            const order = await OrderModel.create({
                order_Id,
                userId,
                storeId,
                CartId: cartId,
                totalPrice,
                shippingAddress,
                orderStatus: 'pending',
                paymentStatus: 'unpaid',
                orderId: payment.orderId,


            });




            await this.notification.sendNotification({
                modelName: 'Order',
                type: 'new-order',
                userId: order.userId.toString(),
                storeId: order.storeId.toString(),
                createdBy: 'User',
                orderId: order._id.toString()
            })


            const emailDetails = {
                orderDate: new Date(),
                customerName: user.fullName || 'Valued Customer',
                email: user.email,

                products: cart1?.products?.map(product => ({
                    productName: product.productId?.name || 'Unknown Product',
                    productImage: product.productVariantId?.images || product.productId.images || 'default-image-url.jpg',
                    variantName: product.productVariantId?.variantName || 'Unknown Variant',
                    price: product.price,
                    quantity: product.quantity,
                    finalPrice: product.finalPrice,
                })),

                orderId: payment.orderId,
                subject: 'Your Purchase Details',
                order_Id,
                mailTitle: 'Thank you for your purchase!',

            };

            await sendPurchaseEmail(emailDetails)

            return { order, payment };
        } catch (error) {
            console.error('Error creating order:', error);
            throw new HttpException(500, 'Failed to create order');
        }
    }




    public generateTrackingNumber(): string {
        return 'TRK-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    }




    public async discountForSubscription(totalPrice: number, userId: string): Promise<any> {
        let SubScriptiondiscountAmount = 0
        const userSubscription = await UserSubscriptionModel.findOne({ userId: userId, isActive: true, expiry: { $gte: new Date() }, paymentStatus: 'paid' })
        if (!userSubscription) {
            console.log("subscription Not found for this user");
            console.log("totalPrice", totalPrice);
            return { finalPrice: totalPrice, SubScriptiondiscountAmount: 0 };
        }
        console.log("userSubscription", userSubscription)
        const subscription = await SubscriptionModel.findOne({ _id: userSubscription.subscriptionId })
        if (!subscription) {

            return { finalPrice: totalPrice, SubScriptiondiscountAmount: 0 }
        }

        switch (userSubscription.subscriptionType) {
            case SUBSCRIPTIONS_TYPES.BASIC:
                SubScriptiondiscountAmount = totalPrice * 0.05;
                console.log(`Discount Amount is ${SubScriptiondiscountAmount} for BASIC`)
                break;
            case SUBSCRIPTIONS_TYPES.PREMIUM:
                SubScriptiondiscountAmount = totalPrice * 0.10;
                console.log(`Discount Amount is ${SubScriptiondiscountAmount} for PREMIUM`)

                break;
            case SUBSCRIPTIONS_TYPES.ULTIMATE:
                SubScriptiondiscountAmount = totalPrice * 0.15;
                console.log(`Discount Amount is ${SubScriptiondiscountAmount} for ULTIMATE`)

                break;
            default:
                console.log("No subscription discount  for This user")
                SubScriptiondiscountAmount = 0;
        }



        const finalPrice = Math.max(totalPrice - SubScriptiondiscountAmount, 0);
        console.log(`User has an active subscription. Discount applied: ${SubScriptiondiscountAmount}. Final Price: ${finalPrice}`);

        return { finalPrice, SubScriptiondiscountAmount };

    }


    // for real-time app
    // if (order.payoutStatus !== 'pending') {
    //     throw new HttpException(400, 'product is not refundable');
    // }

    public async cancelOrder(id: string, userId: string, cancellationReason?: string): Promise<any> {
        try {
            const order = await OrderModel.findOne({ _id: id, userId });
            if (!order) throw new HttpException(404, 'Order not found');

            if (order.orderStatus === 'cancelled') {
                throw new HttpException(400, 'Order already cancelled');
            }

            const user = await UserModel.findOne({ _id: userId })
            const cartItems = await cartModel.findOne({ _id: order.CartId })
                .populate({
                    path: 'products.productId',
                    model: 'Product'
                })
                .populate({
                    path: 'products.productVariantId',
                    model: 'ProductVariant'
                });

            if (!cartItems) {
                throw new HttpException(404, 'Cart not found')
            }
            let refundAmount = 0;
            const eligibleProducts: any[] = [];
            const now = new Date();
            if ((order.orderStatus === 'pending' && order.paymentStatus === 'paid') || order.orderStatus === 'confirmed') {
                refundAmount = order.totalPrice;
                eligibleProducts.push(...cartItems.products);
            }
            else if (['shipped', 'out_for_delivery', 'delivered'].includes(order.orderStatus)) {
                for (const product of cartItems.products) {
                    const { shippingStatus, refundPolicy, deliveredAt, productId, discountedPrice } = product;

                    // console.log("product", product)
                    let isEligible = false
                    if (shippingStatus === 'delivered' || shippingStatus === 'shipped' || shippingStatus === 'out_for_delivery') {
                        if (deliveredAt && this.isEligibleForRefund(refundPolicy, new Date(deliveredAt))) {
                            isEligible = true
                        }
                    } else {
                        isEligible = true
                    }
                    if (isEligible) {
                        refundAmount += discountedPrice
                        eligibleProducts.push(product.productVariantId)
                    }

                }
            } else {
                throw new HttpException(400, 'Order cannot be cancelled in its current status');
            }

            console.log("Main server->eligibleProducts", eligibleProducts.map(id => id._id.toString()).join(', '))
            if (refundAmount <= 0) {
                throw new HttpException(400, 'No eligible products for refund');
            }
            const notesContent = {
                reason: cancellationReason || 'No reason provided',
                cancelledBy: userId.toString(),
                eligibleProducts: eligibleProducts.map(id => id._id.toString()).join(', ')
            };
            console.log("Main Server->notesContent", notesContent)


            const refund: any = await new Promise((resolve, reject) => {
                paymentClient.CancelOrder(
                    {
                        paymentId: order.paymentId,
                        amount: Math.round(refundAmount * 100),
                        notes: notesContent
                    },
                    (error: any, response: any) => {
                        if (error) reject(error)
                        else resolve(response)
                    }
                )
            })
            console.log("Main server", refund)


            const updateData: any = {
                orderStatus: 'cancelled',
                refundStatus: refundAmount === order.totalPrice ? 'refunded' : 'partial',
                cancelledAt: new Date(),
                cancellationReason,
                $push: {
                    cancellationHistory: {
                        date: new Date(),
                        amount: refundAmount,
                        reason: cancellationReason,
                        refundId: refund.refundId
                    }
                }
            };
            console.log("updateData", updateData)

            // const updateCart = cartItems.products.map(p => ({
            //     ...p.toObject(),
            //     // productId: p.productId._id,
            //     refundStatus: eligibleProducts.includes(p.productId.toString())
            //         ? 'requested'
            //         : 'rejected',
            // }));


            await this.notification.sendNotification({
                modelName: 'Order',
                type: 'order-cancelled',
                userId: order.userId.toString(),
                storeId: order.storeId.toString(),
                createdBy: 'User',
                orderId: order._id.toString()
            })
            await OrderModel.findOneAndUpdate(
                { _id: id },
                {
                    $set: {
                        orderStatus: 'cancelled',
                        refundStatus: refundAmount === order.totalPrice ? 'refunded' : 'partial',
                        cancelledAt: new Date(),
                        cancellationReason
                    },
                    $push: {
                        cancellationHistory: {
                            date: new Date(),
                            amount: refundAmount,
                            reason: cancellationReason,
                            refundId: refund.refundId
                        }
                    }
                },
                { new: true }
            );

            for (const product of cartItems.products) {
                const newRefundStatus = eligibleProducts.includes(product.productId.toString())
                    ? 'requested'
                    : 'rejected';

                await cartModel.updateOne(
                    { _id: order.CartId, "products.productId": product.productId._id },
                    { $set: { "products.$.refundStatus": newRefundStatus } }
                );
            }




            const emailDetails = {
                orderDate: order.createdAt,
                customerName: user.fullName || 'Valued Customer',
                email: user.email,
                orderId: order._id.toString(),
                cancellationReason: cancellationReason || 'No reason provided',
                refundAmount,
                subject: 'Your Order Has Been Cancelled',
                mailTitle: 'Order Cancellation Confirmation',
                products: cartItems.products.map((product) => ({
                    productName: product.productId.name,
                    productImage: product.productId.images,
                    variantName: product.productVariantId.variantName,
                    price: product.discountedPrice,
                    quantity: product.quantity
                }))
            };

            await sendCancellationEmail(emailDetails);

            return {
                success: true,
                refundAmount,
                currency: 'INR',
                refundId: refund.refundId,
                message: `Cancelled successfully. ${refundAmount} INR refunded.`
            };

        } catch (error) {
            console.error('Cancellation failed:', error);
            throw new HttpException(500, 'Cancellation failed: ' + error.message);
        }
    }

    private isEligibleForRefund(policy: string, deliveredAt: Date): boolean {
        const now = new Date();
        const deliveredTime = deliveredAt.getTime();
        const currentTime = now.getTime();

        if (deliveredTime > currentTime) return false;

        const timeDifference = currentTime - deliveredTime;
        console.log("timeDifference", timeDifference)
        const daysElapsed = Math.floor(timeDifference / (1000 * 3600 * 24));

        switch (policy) {
            case 'no-refund':
                return false;
            case '7-days':
                return daysElapsed <= 7;
            case '30-days':
                return daysElapsed <= 30;
            default:
                return false;
        }
    }


    public async getOrderById(orderId: string): Promise<any> {
        const order = await OrderModel.findById(orderId)
            .populate('userId', 'name email')
            .populate('storeId', 'name')
            .populate('products.productId', 'name')
            .populate('products.productVariantId', 'variantDetails');
        if (!order) throw new Error('Order not found');
        return order;
    }

    public async getAllOrders(userId: string): Promise<any> {
        const orders = await OrderModel.find({ userId })
            .populate('storeId', 'name')
            .populate('products.productId', 'name')
            .populate('products.productVariantId', 'variantDetails');
        return orders;
    }

    public async deleteOrder(orderId: string, userId: string): Promise<void> {
        const result = await OrderModel.findByIdAndDelete(orderId);
        const cart = await cartModel.findOne({ userId: userId, _id: result.CartId }).populate('products.productId').populate('products.productVariantId');
        await this.notification.sendNotification({
            modelName: 'Order',
            type: 'Order-delete',
            userId: result.userId.toString(),
            storeId: result.storeId.toString(),
            createdBy: 'User',
            orderId: result._id.toString()
        })

        const user = await UserModel.findOne({ _id: userId })
        const emailDetails = {
            orderDate: result.createdAt,
            customerName: user.fullName || 'Valued Customer',
            email: user.email,
            orderId: orderId,
            subject: 'Your Order Has Been Deleted',
            mailTitle: 'Order Deletion Confirmation',
            products: cart.products.map((product: any) => ({
                productName: product.productId.name,
                productImage: product.productId.images,
                variantName: product.productVariantId.variantName,
                price: product.discountedPrice,
                quantity: product.quantity
            }))
        };

        await sendDeletionEmail(emailDetails);

        if (!result) throw new Error('Order not found or already deleted');
    }


    public async getApplicableDiscount(cartItems: CartItem[]): Promise<(DiscountAttributes & { totalAfterDiscount?: number }) | null> {

        let totalOriginalPrice = 0;
        let totalAfterDiscount = 0;
        let discountBreakdown: any[] = [];
        let appliedDiscountId: number | null = null;



        for (const cartItem of cartItems) {
            const itemAmount = cartItem.variant?.price * cartItem.quantity || 0;
            totalOriginalPrice += itemAmount;
            let finalItemPrice = itemAmount;
            const itemQuantity = cartItem.quantity;



            const productDiscount = await DiscountModel.findOne({
                isActive: true,
                $or: [
                    { start_date: { $lte: new Date() }, end_date: { $gte: new Date() } },
                    { start_date: null, end_date: null }
                ],
                ProductIds: cartItem.Product_id
            })
            const currentDate = new Date();

            if (productDiscount) {
                const isWithinDateRange = productDiscount.start_date && productDiscount.end_date ?
                    currentDate >= productDiscount.start_date && currentDate <= productDiscount.end_date : true;

                if (isWithinDateRange) {

                    if (productDiscount.unit === null || itemQuantity >= productDiscount.unit) {

                        appliedDiscountId = productDiscount.id;
                        let itemDiscount = 0;
                        if (productDiscount.discount_type === Discount_TYPE.PERCENTAGE) {
                            itemDiscount = (itemAmount * productDiscount.value) / 100;
                        } else {
                            itemDiscount = productDiscount.value;
                        }
                        finalItemPrice = itemAmount - itemDiscount;
                        discountBreakdown.push({
                            discountAppliedType: 'product',
                            productId: cartItem.Product_id,
                            originalPrice: itemAmount,
                            quantity: cartItem.quantity,
                            discountApplied: itemDiscount,
                            finalPrice: finalItemPrice,
                            dateRange: productDiscount.start_date && productDiscount.end_date ?
                                `${productDiscount.start_date.toLocaleDateString()} to ${productDiscount.end_date?.toLocaleDateString()}` : 'No date restrictions',
                            discountedPrice: finalItemPrice,
                            discountAmount: itemDiscount,
                            discountType: productDiscount.discount_type,

                        });
                    }
                }
            }

            if (!productDiscount) {
                const subCategoryDiscount = await DiscountModel.findOne({
                    is_active: true,
                    $or: [
                        { start_date: { $lte: new Date() }, end_date: { $gte: new Date() } },
                        { start_date: null, end_date: null }
                    ],
                    SubCategoryIds: cartItem.Product?.SubCategory_id
                })

                if (subCategoryDiscount) {

                    const isWithinDateRange = subCategoryDiscount.start_date && subCategoryDiscount.end_date ?
                        currentDate >= subCategoryDiscount.start_date && currentDate <= subCategoryDiscount.end_date : true;

                    if (isWithinDateRange) {
                        if (subCategoryDiscount.unit === null || itemQuantity >= subCategoryDiscount.unit) {
                            appliedDiscountId = subCategoryDiscount.id;
                            let itemDiscount = 0;
                            if (subCategoryDiscount.discount_type === Discount_TYPE.PERCENTAGE) {
                                itemDiscount = (itemAmount * subCategoryDiscount.value) / 100;
                            } else {
                                itemDiscount = subCategoryDiscount.value;
                            }
                            finalItemPrice = itemAmount - itemDiscount;
                            discountBreakdown.push({
                                discountAppliedType: 'subcategory',
                                productId: cartItem.Product_id,
                                originalPrice: itemAmount,
                                quantity: itemQuantity,
                                discountApplied: itemDiscount,
                                finalPrice: finalItemPrice,
                                dateRange: subCategoryDiscount.start_date && subCategoryDiscount.end_date ?
                                    `${subCategoryDiscount.start_date.toLocaleDateString()} to ${subCategoryDiscount.end_date?.toLocaleDateString()}` : 'No date restrictions',

                                discountedPrice: finalItemPrice,
                                discountAmount: itemDiscount,
                                discountType: subCategoryDiscount.discount_type,
                            });
                        }
                    }
                }

                if (!subCategoryDiscount) {
                    const categoryDiscount = await DiscountModel.findOne({
                        is_active: true,
                        $or: [
                            { start_date: { $lte: new Date() }, end_date: { $gte: new Date() } },
                            { start_date: null, end_date: null }
                        ],
                        CategoryIds: cartItem.Product?.Category_id
                    })

                    if (categoryDiscount) {

                        const isWithinDateRange = categoryDiscount.start_date && categoryDiscount.end_date ?
                            currentDate >= categoryDiscount.start_date && currentDate <= categoryDiscount.end_date : true;

                        if (isWithinDateRange) {
                            if (categoryDiscount.unit === null || itemQuantity >= categoryDiscount.unit) {
                                appliedDiscountId = categoryDiscount.id;
                                let itemDiscount = 0;
                                if (categoryDiscount.discount_type === Discount_TYPE.PERCENTAGE) {
                                    itemDiscount = (itemAmount * categoryDiscount.value) / 100;
                                } else {
                                    itemDiscount = categoryDiscount.value;
                                }
                                finalItemPrice = itemAmount - itemDiscount;
                                discountBreakdown.push({
                                    discountAppliedType: 'category',
                                    productId: cartItem.Product_id,
                                    originalPrice: itemAmount,
                                    quantity: itemQuantity,
                                    discountApplied: itemDiscount,
                                    finalPrice: finalItemPrice,
                                    dateRange: categoryDiscount.start_date && categoryDiscount.end_date ?
                                        `${categoryDiscount.start_date.toLocaleDateString()} to ${categoryDiscount.end_date?.toLocaleDateString()}` : 'No date restrictions',

                                    discountedPrice: finalItemPrice,
                                    discountAmount: itemDiscount,
                                    discountType: categoryDiscount.discount_type,
                                });
                            }
                        }
                    }
                }

            }

            totalAfterDiscount += finalItemPrice;
        }

        const totalDiscount = totalOriginalPrice - totalAfterDiscount;


        if (totalDiscount > 0) {

            const productDiscounts = discountBreakdown.filter(d => d.discountAppliedType === 'product');
            const subCategoryDiscounts = discountBreakdown.filter(d => d.discountAppliedType === 'subcategory');
            const categoryDiscounts = discountBreakdown.filter(d => d.discountAppliedType === 'category');

            const calculateTotals = (discounts: any[]) => ({
                originalTotal: discounts.reduce((sum, d) => sum + d.originalPrice, 0),
                discountTotal: discounts.reduce((sum, d) => sum + d.discountApplied, 0),
                finalTotal: discounts.reduce((sum, d) => sum + d.finalPrice, 0)
            });

            const productTotals = calculateTotals(productDiscounts);
            const subCategoryTotals = calculateTotals(subCategoryDiscounts);
            const categoryTotals = calculateTotals(categoryDiscounts);

            const appliedDiscountType = discountBreakdown.length > 0
                ? discountBreakdown[0].discountType === Discount_TYPE.PERCENTAGE
                    ? 'percentage'
                    : discountBreakdown[0].discountType === Discount_TYPE.FIXED
                        ? 'fixed'
                        : 'none'
                : 'none';
            console.log("appliedDiscountType", appliedDiscountType)
            return {
                id: appliedDiscountId,
                discount_type: appliedDiscountType,
                value: totalDiscount,
                is_active: true,
                discountAmount: totalDiscount,
                totalAfterDiscount: totalAfterDiscount,
                breakdown: {
                    product: {
                        discounts: productDiscounts,
                        totals: productTotals
                    },
                    subCategory: {
                        discounts: subCategoryDiscounts,
                        totals: subCategoryTotals
                    },
                    category: {
                        discounts: categoryDiscounts,
                        totals: categoryTotals
                    }
                }
            } as DiscountAttributes & {
                totalAfterDiscount: number,
                breakdown: {
                    product: { discounts: any[], totals: any },
                    subCategory: { discounts: any[], totals: any },
                    category: { discounts: any[], totals: any }
                }
            };
        }

        console.log("\nNo applicable discounts found");
        return null;
    }






    public async updateOrder(userId: string, orderId: string, orderData: any): Promise<any> {
        const { products: updatedProducts = [], discountCode } = orderData;
        const user = await UserModel.findById(userId)
        const order = await OrderModel.findOne({ _id: orderId, userId });
        if (!order) throw new HttpException(404, 'Order not found or you are not authorized to update it');

        if (order.orderStatus === 'confirmed' || order.orderStatus === 'shipped') {
            throw new HttpException(400, 'Cannot update order status once it is confirmed or shipped');
        }

        console.log("Current Order Details:", order);
        const cart = await cartModel.findOne({ userId, _id: order.CartId }).populate('products.productId').populate('products.productVariantId');

        if (!cart) throw new HttpException(404, 'Cart not found for this order');



        const currentProductVariantIds = cart.products.map((p) => p.productVariantId);
        const productVariants = await ProductVariant.find({
            _id: { $in: currentProductVariantIds },
        });

        const currentPriceMap: Record<string, number> = {};
        productVariants.forEach((variant) => {
            currentPriceMap[variant._id.toString()] = variant.price;
        });

        let totalPrice = 0;
        const updatedOrderProducts = [];

        const calculateDiscountedPrice = async (discountCode: string, productId: string, variantId: string, quantity: number, currentPrice: number) => {
            const cartItem = [{
                Product_id: productId,
                quantity: quantity,
                variant: { price: currentPrice },
                discountCode: discountCode
            }];

            let finalPrice = currentPrice * quantity;
            if (discountCode) {
                console.log(`Checking for Discount Code: ${discountCode}`);
                const discount = await DiscountModel.findOne({
                    code: discountCode,
                    isActive: true,
                    $or: [
                        { start_date: { $lte: new Date() }, end_date: { $gte: new Date() } },
                        { start_date: null, end_date: null }
                    ]
                });


                const currentDate = new Date();

                if (discount) {
                    const itemAmount = currentPrice;
                    let itemDiscount = 0;
                    const isWithinDateRange = discount.start_date && discount.end_date ?
                        currentDate >= discount.start_date && currentDate <= discount.end_date : true;

                    if (isWithinDateRange) {
                        if (discount.unit === null || quantity >= discount.unit) {
                            if (discount.discount_type === Discount_TYPE.PERCENTAGE) {
                                itemDiscount = (itemAmount * discount.value) / 100;
                            } else {
                                itemDiscount = discount.value;
                            }

                            finalPrice = (itemAmount - itemDiscount) * quantity;

                        }
                    }
                } else {
                    console.log("No valid discount code found.");
                }
            } else {
                console.log("No Discount Code Provided. Using getApplicableDiscount for product discount.");

                const appliedDiscount = await this.getApplicableDiscount(cartItem);

                let productDiscount = 0;
                if (appliedDiscount) {
                    productDiscount = appliedDiscount.discountAmount;
                }

                finalPrice = (currentPrice * quantity) - productDiscount;
            }


            return finalPrice;
        };


        for (let currentProduct of cart.products) {
            const variantId = currentProduct.productVariantId.toString();
            const currentPrice = currentPriceMap[variantId] || 0;

            const updatedProduct = updatedProducts.find(
                (p: any) => p.productVariantId.toString() === variantId
            );

            if (updatedProduct) {
                const updatedQuantity = updatedProduct.quantity || 0;

                const discountedPrice = await calculateDiscountedPrice(
                    discountCode,
                    currentProduct.productId.toString(),
                    variantId,
                    updatedQuantity,
                    currentPrice,
                );

                totalPrice += discountedPrice;
                updatedOrderProducts.push({
                    ...currentProduct,
                    finalPrice: discountedPrice,
                    quantity: updatedQuantity,
                });
            } else {
                const originalQuantity = currentProduct.quantity || 0;

                const discountedPrice = await calculateDiscountedPrice(
                    discountCode,
                    currentProduct.productId.toString(),
                    variantId,
                    originalQuantity,
                    currentPrice
                );

                totalPrice += discountedPrice;

                updatedOrderProducts.push({ ...currentProduct, finalPrice: discountedPrice, quantity: originalQuantity });
            }
        }

        for (let newProduct of updatedProducts) {
            const { productVariantId, quantity } = newProduct;

            if (!cart.products.some((p) => p.productVariantId.toString() === productVariantId.toString())) {
                const variant = await ProductVariant.findById(productVariantId);
                if (!variant) throw new HttpException(404, `ProductVariant not found for ID: ${productVariantId}`);

                const newPrice = variant.price || 0;
                const product = await Product.findById(newProduct.productId);
                if (!product) {
                    throw new HttpException(404, `Product not found for ID: ${newProduct.productId}`);
                }

                const discountedPrice = await calculateDiscountedPrice(
                    discountCode,
                    newProduct.productId,
                    productVariantId.toString(),
                    quantity,
                    newPrice,
                );

                totalPrice += discountedPrice;
                updatedOrderProducts.push({
                    productId: variant.productId,
                    productVariantId,
                    quantity,
                    finalPrice: discountedPrice

                });
            }
        }

        console.log("Updated Total Price:", totalPrice);

        const storeId = order.storeId
        const UpdatedOrderId = `UPDATE-ORD-${new Date().getTime()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`
        const payment = await this.payment.createRazorpayOrder(totalPrice, userId, 'razorpay', 'Order')
        cart.products = updatedOrderProducts;
        order.totalPrice = Math.max(totalPrice, 0);
        order.order_Id = UpdatedOrderId
        order.orderId = payment.orderId
        order.shippingAddress = orderData.shippingAddress


        await order.save();

        console.log("Order Successfully Updated:", order);

        await this.notification.sendNotification({
            modelName: 'Order',
            type: 'order-updated',
            userId: order.userId.toString(),
            storeId: order.storeId.toString(),
            createdBy: 'User',
            orderId: order._id.toString()
        })





        const emailData = {
            orderDate: new Date(),
            customerName: user.fullName || 'Valued Customer',
            email: user.email,
            products: cart.products.map(product => ({
                productName: product.productId?.name || 'Unknown Product',
                productImage: product.productVariantId?.images || product.productId.images || 'default-image-url.jpg',
                variantName: product.productVariantId?.variantName || 'Unknown Variant',
                price: product.price,
                quantity: product.quantity,
                finalPrice: product.finalPrice,
            })),
            orderId: order.orderId,
            subject: 'Your Updated Purchase Details',
            mailTitle: 'Your order has been updated!',
            updatedFields: {
                storeId: order.storeId,
                orderStatus: order.orderStatus,
                totalPrice: order.totalPrice,
                shippingAddress: order.shippingAddress,
            }
        };



        await sendOrderUpdateEmail(emailData)


        return order;
    }


    public async updateOrderStatus(storeId: string, orderId: string, status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled"): Promise<any> {
        const order = await OrderModel.findById(orderId);
        if (!order) throw new HttpException(404, 'Order not found');
        const checkOrder = await OrderModel.findOne({ _id: orderId, storeId: storeId })

        if (!checkOrder) throw new HttpException(404, 'You are not accessible for update this order')
        order.orderStatus = status;

        await order.save();

        const store = await StoreModel.findById(order.storeId);
        const user = await UserModel.findById(order.userId);



        if (user && store) {
            await this.notification.sendNotification({
                modelName: 'Order',
                type: 'Update-order-status',
                userId: order.userId.toString(),
                storeId: order.storeId.toString(),
                createdBy: 'StoreOwner',
                orderId: order._id.toString()
            })
            const emailDetails = {
                orderId: order.orderId,
                status,
                email: user.email,
                customerName: user.fullName,
                subject: 'Your Order Status Update',
                totalPrice: order.totalPrice
            };

            await sendStatusUpdateEmail(emailDetails);
        }

        return order;
    }



    public async getAllAdminOrders() {
        const orders = await OrderModel.find()
            .populate('userId', 'email')
            .populate('storeId', 'name')
            .populate('products.productId', 'name')
            .populate('products.productVariantId', 'variantDetails');
        const groupedOrder = orders.reduce((result, order) => {
            const user = order.userId as any
            const key = user?.email || "Unknown User";
            if (!result[key]) {
                result[key] = []
            }
            result[key].push(order)
            return result

        }, {})


        return groupedOrder;
    }





}

export default OrderService;
