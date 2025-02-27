import { Router } from 'express';
import OrderController from '@controllers/Order.controller';
import { AuthMiddleware, AuthMiddlewareStore, isAdmin } from '@/middlewares/auth.middleware';
import { Routes } from '@/interfaces/routes.interface';

export class OrderRouter implements Routes {
    public path = '/orders';
    public router = Router();
    private orderController = new OrderController();

    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.post(`${this.path}/:cartId`, AuthMiddleware, this.orderController.createOrder);
        this.router.get(`${this.path}/:id`, AuthMiddleware, this.orderController.getOrderById);
        this.router.get(`${this.path}`, AuthMiddleware, this.orderController.getAllOrders);
        this.router.delete(`${this.path}/:id`, AuthMiddleware, this.orderController.deleteOrder);
        this.router.put(`${this.path}/updateOrder/:orderId`, AuthMiddleware, this.orderController.updateOrder)

        this.router.put(`${this.path}/update/status`, AuthMiddlewareStore, this.orderController.updateOrderStatus)

        this.router.get(`${this.path}/admin/getAll`, isAdmin, this.orderController.getAllAdmin)


        this.router.post(`${this.path}/orderCancle/:id`, AuthMiddleware, this.orderController.cancelOrder)
    }
}

