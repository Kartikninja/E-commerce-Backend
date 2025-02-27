import { SubscriptionController } from "@/controllers/Subscription.controller";
import { CreateSubscriptionDto } from "@/dtos/Subscription.dto";
import { Routes } from "@/interfaces/routes.interface";
import { AuthMiddleware, isAdmin } from "@/middlewares/auth.middleware";
import { ValidationMiddleware } from "@/middlewares/validation.middleware";
import { Router } from "express";

export class SubscriptionRoute implements Routes {
    public path = '/Subscription';
    public router = Router();
    public sub = new SubscriptionController();

    constructor() {
        this.intializeRoutes();
    }

    private intializeRoutes() {
        this.router.post(`${this.path}/add`, isAdmin, ValidationMiddleware(CreateSubscriptionDto), this.sub.CreateSubscription)
        this.router.get(`${this.path}/getAll`, this.sub.getAll)
        this.router.get(`${this.path}/:id`, this.sub.getById)
        this.router.delete(`${this.path}/:id`, this.sub.delete)

    }

}