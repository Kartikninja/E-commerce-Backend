import { Request, Response, NextFunction } from 'express';
import OrderService from '@services/Order.service';
import Container from 'typedi';


class OrderController {
    private orderService = Container.get(OrderService);

    // const orderData = req.body;
    public createOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { _id: userId } = req.user;
            const userRole = req.user.role
            if (userRole !== 1) {
                res.status(403).json({ message: 'You are not authorized to create an order' })
            }
            const { cartId } = req.params
            const { order, payment } = await this.orderService.createOrder(userId, cartId);
            res.status(201).json({ data: order, paymentDetails: payment, message: 'Order created successfully' });
        } catch (error) {
            next(error);
        }
    };



    public cancelOrder = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;
            const userId = req.user._id;
            const { cancellationReason } = req.body

            const cancel = await this.orderService.cancelOrder(id, userId, cancellationReason)
            res.status(200).json({ data: cancel, message: 'Order cancelled successfully' })

        } catch (err) {
            next(err)
        }
    }




    public getOrderById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { id } = req.params;
            const order = await this.orderService.getOrderById(id);
            res.status(200).json({ data: order, message: 'Order retrieved successfully' });
        } catch (error) {
            next(error);
        }
    };

    public getAllOrders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { _id: userId } = req.user;

            const orders = await this.orderService.getAllOrders(userId);
            res.status(200).json({ data: orders, message: 'Orders retrieved successfully' });
        } catch (error) {
            next(error);
        }
    };

    public deleteOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = req.user._id
            const { id } = req.params;
            await this.orderService.deleteOrder(id, userId);
            res.status(200).json({ message: 'Order deleted successfully' });
        } catch (error) {
            next(error);
        }
    };






    public updateOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { _id: userId } = req.user;
            const { orderId } = req.params;
            const orderData = req.body;

            const updatedOrder = await this.orderService.updateOrder(userId, orderId, orderData);

            res.status(200).json({ data: updatedOrder, message: 'Order updated successfully' });
        } catch (error) {
            next(error);
        }
    };



    public updateOrderStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { orderId, status } = req.body;

            const storeId = req.store._id



            const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
            if (!validStatuses.includes(status)) {
                res.status(400).json({ message: 'Invalid order status' });
            }

            const updatedOrder = await this.orderService.updateOrderStatus(storeId, orderId, status);
            res.status(200).json({ data: updatedOrder, message: 'Order status updated successfully' });
        } catch (error) {
            next(error);
        }
    };




    public getAllAdmin = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const orders = await this.orderService.getAllAdminOrders();
            res.status(200).json({ message: "Get All", orders })
        } catch (err) {
            next(err)
        }
    }






}

export default OrderController;
