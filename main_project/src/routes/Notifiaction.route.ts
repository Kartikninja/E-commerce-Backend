
import { Router } from 'express';
import { NotificationController } from '@controllers/Notification.controller';
import { Socket } from 'socket.io';
import { Routes } from '@/interfaces/routes.interface';

export class NotificationRoute implements Routes {
    public path = '/notifications';
    public router = Router();
    public notificationController = new NotificationController();



    constructor() {

        this.initializeRoutes();
    }
    private initializeRoutes() {
        this.router.get(`${this.path}/:modelName/:id`, this.notificationController.getNotifications);
        this.router.put(`${this.path}/mark-as-read/:notificationId`, this.notificationController.markAsRead);
        this.router.post(`${this.path}/send`, this.notificationController.sendNotification);

    }
}


