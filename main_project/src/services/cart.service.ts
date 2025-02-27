import { cartModel } from "@/models/cart.model";
import { ProductVariant } from "@/models/ProductVariant.model";
import Container, { Service } from "typedi";
import OrderService from "./Order.service";
import { DiscountModel } from "@/models/Discount.model";
import { Discount_TYPE } from "@/utils/constant";
import { CartItem } from "@/interfaces/Discount.interface";
import { HttpException } from "@/exceptions/httpException";
import { Product } from "@/models/Product.model";
import { StoreModel } from "@/models/Store.model";
import { UserModel } from "@/models/users.model";

@Service()
export class CartService {
    private orderService = Container.get(OrderService)

    public async getCartById(userId: string, cartId: string) {
        const cart = await cartModel.findOne({ userId: userId, _id: cartId })
        return cart
    }

    public async addToCart(userId: string, storeId: string, products: any[]) {
        const user = await UserModel.findById(userId)
        if (!user) {
            throw new HttpException(404, "User not found")
        }

        let cart = await cartModel.findOne({ userId, storeId });

        if (!cart) {
            cart = new cartModel({ userId, storeId, products: [], totalPrice: 0, subscriptionDiscount: 0 });
        }
        const store = await StoreModel.findById(storeId)

        const calculateDiscountedPrice = async (discountCode: string, productId: string, variantId: string, quantity: number, currentPrice: number):
            Promise<{ finalPrice: number; discountAmount: number; discountType: 'percentage' | 'fixed' | 'none' }> => {

            let finalPrice = currentPrice * quantity;
            let discountAmount = 0;
            let discountType: 'percentage' | 'fixed' | 'none' = 'none';

            if (discountCode) {
                const discount = await DiscountModel.findOne({
                    code: discountCode,
                    isActive: true,
                    $or: [
                        { start_date: { $lte: new Date() }, end_date: { $gte: new Date() } },
                        { start_date: null, end_date: null }
                    ]
                });
                if (discount) {
                    const itemAmount = currentPrice;
                    let itemDiscount = 0;
                    const isWithinDateRange = discount.start_date && discount.end_date ?
                        new Date() >= discount.start_date && new Date() <= discount.end_date : true;

                    if (isWithinDateRange) {
                        if (discount.unit === null || quantity >= discount.unit) {
                            if (discount.discount_type === Discount_TYPE.PERCENTAGE) {
                                itemDiscount = (itemAmount * discount.value) / 100;
                                discountType = 'percentage';
                            } else {
                                itemDiscount = discount.value;
                                discountType = 'fixed';
                            }
                            discountAmount = itemAmount * quantity;
                        }
                        finalPrice = (itemAmount - itemDiscount) * quantity;
                    }
                }
            } else {
                const cartItem = [{
                    Product_id: productId,
                    quantity: quantity,
                    variant: { price: currentPrice },
                    discountCode: discountCode
                }];
                const appliedDiscount = await this.orderService.getApplicableDiscount(cartItem);
                if (appliedDiscount) {
                    discountAmount = appliedDiscount.discountAmount;
                    discountType = appliedDiscount.discount_type as 'percentage' | 'fixed' | 'none';
                    finalPrice = (currentPrice * quantity) - appliedDiscount.discountAmount;
                }
            }

            return { finalPrice, discountAmount, discountType };
        }

        for (const productData of products) {
            const { productId, productVariantId, quantity, discountCode } = productData;
            const product = await ProductVariant.find({ _id: productVariantId, productId: productId })
            if (!product) {
                throw new HttpException(404, `This ${productVariantId} variant is not found`)
            }
            const productVariant = await ProductVariant.findById(productVariantId);
            if (!productVariant) throw new HttpException(404, 'Product variant not found');
            if (productVariant.stockLeft < quantity) {
                throw new HttpException(400, `Insufficient stock for ${productVariant.variantName}`);
            }

            const productIds = await Product.findById(productId)

            const { finalPrice, discountAmount, discountType } = await calculateDiscountedPrice(discountCode, productId, productVariantId.toString(), quantity, productVariant.price);
            const existingProductIndex = cart.products.findIndex(
                (product: any) => {
                    if (!product.productId || !product.productVariantId) {
                        console.log("Product is missing productId or productVariantId:", product);
                        return false;
                    }

                    return product.productId.toString() === productId.toString() &&
                        product.productVariantId.toString() === productVariantId.toString();
                }
            );

            if (existingProductIndex > -1) {
                const existingProduct = cart.products[existingProductIndex];
                const newQuantity = existingProduct.quantity + quantity;

                if (newQuantity <= 0) {
                    cart.products.splice(existingProductIndex, 1);
                } else {
                    existingProduct.quantity = newQuantity;
                    existingProduct.finalPrice += finalPrice;
                    existingProduct.discountAmount += discountAmount;
                    existingProduct.discountType = discountType;
                }
            } else {
                cart.products.push({
                    productId,
                    productVariantId,
                    quantity,
                    price: productVariant.price,
                    finalPrice,
                    discountAmount,
                    discountType,

                    discountedPrice: finalPrice,
                    refundPolicy: productIds.refundPolicy,
                    replacementPolicy: productIds.replacementPolicy,
                    trackingNumber: this.generateTrackingNumber(),
                    courierPartner: "ExampleCourier",
                    estimatedDelivery: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000),
                    deliveryAgentName: store.fullName,
                    deliveryAgentPhone: store.phoneNumber
                });
            }
        }

        let totalPrice = cart.products.reduce((sum, item) => sum + item.finalPrice, 0);

        const { finalPrice: discountedTotal, SubScriptiondiscountAmount } = await this.orderService.discountForSubscription(totalPrice, userId);
        cart.totalPrice = discountedTotal;
        cart.subScriptionDiscount = SubScriptiondiscountAmount;

        await cart.save();
        return cart;
    }

    public generateTrackingNumber(): string {
        return 'TRK-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    }
  public async updateCartItem(userId: string, storeId: string, itemId: string, quantity: number): Promise<any> {
        const cart = await cartModel.findOne({ userId, storeId });
        if (!cart) throw new HttpException(404, 'Cart not found');

        const productIndex = cart.products.findIndex((product: any) => product._id.toString() === itemId);
        if (productIndex === -1) throw new HttpException(404, 'Product not found in cart');

        const product = cart.products[productIndex];
        const productVariant = await ProductVariant.findById(product.productVariantId);
        if (!productVariant) throw new HttpException(404, 'Product variant not found');

        if (productVariant.stockLeft < quantity) {
            throw new HttpException(400, `Insufficient stock for ${productVariant.variantName}`);
        }

        const { finalPrice, discountAmount, discountType } = await this.calculateDiscountedPrice(
            product.discountCode,
            product.productId.toString(),
            product.productVariantId.toString(),
            quantity,
            productVariant.price
        );

        cart.products[productIndex].quantity = quantity;
        cart.products[productIndex].finalPrice = finalPrice;
        cart.products[productIndex].discountAmount = discountAmount;
        cart.products[productIndex].discountType = discountType;

        let totalPrice = cart.products.reduce((sum, item) => sum + item.finalPrice, 0);

        const { finalPrice: discountedTotal, SubScriptiondiscountAmount } = await this.orderService.discountForSubscription(totalPrice, userId);
        cart.totalPrice = discountedTotal;
        cart.subScriptionDiscount = SubScriptiondiscountAmount;

        await cart.save();

        return cart;
    }

    public async calculateDiscountedPrice(
        discountCode: string,
        productId: string,
        variantId: string,
        quantity: number,
        currentPrice: number
    ): Promise<{ finalPrice: number; discountAmount: number; discountType: 'percentage' | 'fixed' | 'none' }> {
        let finalPrice = currentPrice * quantity;
        let discountAmount = 0;
        let discountType: 'percentage' | 'fixed' | 'none' = 'none';

        if (discountCode) {
            const discount = await DiscountModel.findOne({
                code: discountCode,
                isActive: true,
                $or: [
                    { start_date: { $lte: new Date() }, end_date: { $gte: new Date() } },
                    { start_date: null, end_date: null }
                ]
            });

            if (discount) {
                const itemAmount = currentPrice;
                let itemDiscount = 0;
                const isWithinDateRange = discount.start_date && discount.end_date ?
                    new Date() >= discount.start_date && new Date() <= discount.end_date : true;

                if (isWithinDateRange) {
                    if (discount.unit === null || quantity >= discount.unit) {
                        if (discount.discount_type === Discount_TYPE.PERCENTAGE) {
                            itemDiscount = (itemAmount * discount.value) / 100;
                            discountType = 'percentage';
                        } else {
                            itemDiscount = discount.value;
                            discountType = 'fixed';
                        }
                        discountAmount = itemAmount * quantity;
                    }
                    finalPrice = (itemAmount - itemDiscount) * quantity;
                }
            }
        } else {
            // If no discount code, check for applicable discounts
            const cartItem = [{
                Product_id: productId,
                quantity: quantity,
                variant: { price: currentPrice },
                discountCode: discountCode
            }];
            const appliedDiscount = await this.orderService.getApplicableDiscount(cartItem);
            if (appliedDiscount) {
                discountAmount = appliedDiscount.discountAmount;
                discountType = appliedDiscount.discount_type as 'percentage' | 'fixed' | 'none';
                finalPrice = (currentPrice * quantity) - appliedDiscount.discountAmount;
            }
        }

        return { finalPrice, discountAmount, discountType };
    }

    public async removeCartItem(userId: string, storeId: string, itemId: string) {
        const cart = await cartModel.findOne({ userId, storeId });
        if (!cart) throw new Error('Cart not found');

        const productIndex = cart.products.findIndex((product: any) => product._id.toString() === itemId);
        if (productIndex === -1) throw new Error('Product not found in cart');

        cart.products.splice(productIndex, 1);
        await this.updateCartTotal(cart);
        return cart.save();
    }

    private async updateCartTotal(cart: any) {
        let totalPrice = 0;
        for (const product of cart.products) {
            totalPrice += product.finalPrice;
        }
        cart.totalPrice = totalPrice;
        cart.updatedAt = new Date();
    }

}