import { CartController } from "@/controllers/cart.controller";
import { Routes } from "@/interfaces/routes.interface";
import { AuthMiddleware } from "@/middlewares/auth.middleware";
import { Router } from "express";

export class CartRoute implements Routes {
    public path = '/cart';
    public router = Router()
    public cartController = new CartController()

    constructor() {
        this.intializeRoute()
    }
    private intializeRoute() {
        this.router.get(`${this.path}/:cartId`, AuthMiddleware, this.cartController.getCartById)
        this.router.post(`${this.path}/create`, AuthMiddleware, this.cartController.addToCart)

    }
}




// public async createOrder(userId: string, orderData: any): Promise<any> {
//     const { storeId, products, shippingAddress, discountCode } = orderData;

//     console.log("orderData", orderData)
//     const store = await StoreModel.findOne({ _id: storeId, isActive: true, status: 'approved' });
//     if (!store) throw new HttpException(404, 'This Store is not found');

//     const user = await UserModel.findOne({ _id: userId, isVerified: true });
//     if (!user) throw new HttpException(404, 'User not found or not verified');

//     try {
//         let totalPrice = 0;
//         const createOrder = []

//         const calculateDiscountedPrice = async (discountCode: string, productId: string, variantId: string, quantity: number, currentPrice: number):
//             Promise<{ finalPrice: number; discountAmount: number; discountType: 'percentage' | 'fixed' | 'none' }> => {


//             let finalPrice = currentPrice * quantity
//             let discountAmount = 0;

//             let discountType: 'percentage' | 'fixed' | 'none' = 'none';

//             if (discountCode) {
//                 const discount = await DiscountModel.findOne({
//                     code: discountCode,
//                     isActive: true,
//                     $or: [
//                         { start_date: { $lte: new Date() }, end_date: { $gte: new Date() } },
//                         { start_date: null, end_date: null }
//                     ]
//                 })
//                 const currentDate = new Date()
//                 if (discount) {
//                     const itemAmount = currentPrice
//                     let itemDiscount = 0
//                     const isWithinDateRange = discount.start_date && discount.end_date ?
//                         currentDate >= discount.start_date && currentDate <= discount.end_date : true;
//                     if (isWithinDateRange) {
//                         if (discount.unit === null || quantity >= discount.unit) {
//                             if (discount.discount_type === Discount_TYPE.PERCENTAGE) {
//                                 itemDiscount = (itemAmount * discount.value) / 100
//                                 discountType = 'percentage';
//                             } else {
//                                 itemDiscount = discount.value
//                                 discountType = 'fixed';
//                             }
//                             discountAmount = itemAmount * quantity
//                         }
//                         finalPrice = (itemAmount - itemDiscount) * quantity
//                     }
//                 } else {
//                     console.log("No valid discount code found.");

//                 }
//             } else {
//                 const cartItem = [{
//                     Product_id: productId,
//                     quantity: quantity,
//                     variant: { price: currentPrice },
//                     discountCode: discountCode
//                 }]
//                 console.log("No Discount Code Provided. Using getApplicableDiscount for product discount.");

//                 const appliedDiscount = await this.getApplicableDiscount(cartItem);
//                 if (appliedDiscount) {
//                     console.log("appliedDiscount", appliedDiscount)
//                     discountAmount = appliedDiscount.discountAmount;
//                     discountType = appliedDiscount.discount_type as 'percentage' | 'fixed' | 'none';
//                     finalPrice = (currentPrice * quantity) - appliedDiscount.discountAmount;
//                 }
//                 console.log(`This ${productId} has  discount  ${discountAmount} and this is finalPrice : ${finalPrice}`)
//                 console.log(`getApplicableDiscount=>This product ${productId} has discountType is ${discountType}`)
//             }

//             return { finalPrice, discountAmount, discountType }


//         }
//         for (const product of products) {
//             const { productId, productVariantId, quantity } = product;


//             const productData = await ProductVariant.findById(productVariantId).populate('productId');;
//             if (!productData) throw new HttpException(404, 'This Product Varinat  is not found');
//             if (productData.stockLeft <= 0) throw new HttpException(404, `${productData.variantName} is not avalible for this time`)
//             const productVariant = await ProductVariant.findOne({ _id: productVariantId, productId });
//             if (!productVariant) throw new HttpException(404, 'This Product Variant is not found');
//             if (productVariant.stockLeft <= 0) throw new HttpException(404, `this ${productVariant._id} is not avalible for this time `)

//             const subCategoriesId = await Product.findById(productData.productId)


//             const subCategory = await SubCategory.findById(subCategoriesId.subCategoryId);
//             const variantPrice = productVariant.price || 0;




//             const { finalPrice, discountAmount, discountType } = await calculateDiscountedPrice(discountCode, productId, productVariantId.toString(), quantity, variantPrice);
//             totalPrice += finalPrice
//             console.log(`calculateDiscountedPrice=>   totalPrice  ${totalPrice} and discountedPrice ${discountAmount}`)

//             console.log(`calculateDiscountedPrice=>This is product ${productId} DiscountType has ${discountType}`)

//             createOrder.push({
//                 productId,
//                 productVariantId,
//                 quantity,
//                 finalPrice: finalPrice,
//                 refundPolicy: subCategoriesId.refundPolicy,
//                 replacementPolicy: subCategoriesId.replacementPolicy,

//                 discountedPrice: finalPrice,
//                 discountAmount: discountAmount,
//                 discountType: discountType,

//             });

//             console.log(`Discounted price for product ${productId}: ${finalPrice}`);


//         }
//         console.log(`totalPrice ${totalPrice} `)

//         const { finalPrice, SubScriptiondiscountAmount } = await this.discountForSubscription(totalPrice, userId);
//         totalPrice = finalPrice;

//         console.log(`discountForSubscription=>totalPrice ${totalPrice} and finalPrice ${finalPrice}`)

//         const payment = await this.payment.createRazorpayOrder(totalPrice, userId, 'razorpay', 'Order');
//         console.log('payment', payment);

//         const order_Id = `ORD-${new Date().getTime()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
//         const order = await OrderModel.create({
//             order_Id,
//             userId,
//             storeId,
//             products: createOrder,
//             totalPrice,
//             shippingAddress,
//             orderStatus: 'pending',
//             paymentStatus: 'unpaid',
//             orderId: payment.orderId,
//             subScriptionDiscount: SubScriptiondiscountAmount

//         });




//         await this.notification.sendNotification({
//             modelName: 'Order',
//             type: 'new-order',
//             userId: order.userId.toString(),
//             storeId: order.storeId.toString(),
//             createdBy: 'User',
//             orderId: order._id.toString()
//         })


//         const populatedProducts = await Promise.all(
//             createOrder.map(async (product) => {
//                 const productData = await Product.findById(product.productId);
//                 if (!productData) throw new HttpException(404, 'Product not found');

//                 const productVariant = await ProductVariant.findOne({
//                     _id: product.productVariantId,
//                     productId: product.productId,
//                 });
//                 if (!productVariant) throw new HttpException(404, 'Product Variant not found');

//                 return {
//                     ...product,
//                     ProductName: productData.name || 'Unknown Product',
//                     variantName: productVariant.variantName,
//                     price: productVariant.price,
//                     imageUrl: productVariant.images || productData.images || 'default-image-url.jpg',

//                 };
//             })
//         );







//         const emailDetails = {
//             orderDate: new Date(),
//             customerName: user.fullName || 'Valued Customer',
//             email: user.email,
//             products: populatedProducts.map(product => ({
//                 productName: product.ProductName,
//                 productImage: product.imageUrl,
//                 variantName: product.variantName,
//                 price: product.finalPrice,
//                 quantity: product.quantity
//             })),

//             orderId: payment.orderId,
//             subject: 'Your Purchase Details',
//             order_Id,
//             mailTitle: 'Thank you for your purchase!',

//         };

//         await sendPurchaseEmail(emailDetails)

//         return { order, payment };
//     } catch (error) {
//         console.error('Error creating order:', error);
//         throw new HttpException(500, 'Failed to create order');
//     }
// }
