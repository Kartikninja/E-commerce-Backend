import { CartService } from "@/services/cart.service";
import { NextFunction, Request, Response } from "express";
import Container from "typedi";

export class CartController {
    public cartService = Container.get(CartService)
    public getCartById = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { cartId } = req.params;
            const userId = req.user._id
            const cart = await this.cartService.getCartById(userId, cartId)
            return res.status(200).json({ message: 'Cart Item retriv', cart })
        } catch (err) {
            next(err)
        }
    }

    public addToCart = async (req: Request, res: Response, next: NextFunction) => {
        const userId = req.user._id;
        const { products, storeId } = req.body;

        try {
            const cart = await this.cartService.addToCart(userId, storeId, products);
            res.status(200).json({ cart });
        } catch (err) {
            next(err)
        }
    }

    public updateCartItem = async (req: Request, res: Response, next: NextFunction) => {
        const { userId, storeId, itemId } = req.params;
        const { quantity } = req.body;

        try {
            const updatedCart = await this.cartService.updateCartItem(userId, storeId, itemId, quantity);
            res.status(200).json({ updatedCart });
        } catch (err) {
            next(err);
        }
    }

    public removeCartItem = async (req: Request, res: Response, next: NextFunction) => {
        const { userId, storeId, itemId } = req.params;

        try {
            const updatedCart = await this.cartService.removeCartItem(userId, storeId, itemId);
            res.status(200).json({ updatedCart });
        } catch (err) {
            next(err);
        }
    }
}