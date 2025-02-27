import { StoreController } from "@/controllers/Store.controller";
import { Routes } from "@/interfaces/routes.interface";
import { AuthMiddlewareStore, isAdmin } from "@/middlewares/auth.middleware";
import { Router } from "express";

export class StoreRoute implements Routes {
    public path = '/store';
    public router = Router();
    public store = new StoreController()

    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.post(`${this.path}/add`, this.store.CreateStore);
        this.router.post(`${this.path}/verify/otp`, AuthMiddlewareStore, this.store.verifyOtp)
        this.router.post(`${this.path}/login`, this.store.logIn);
        this.router.post(`${this.path}/forgotPassword`, this.store.forgotPassword);
        this.router.get(`${this.path}/verifyEmail/:token`, this.store.verifyEmail);

        this.router.post(`${this.path}/resetPassword/:token`, this.store.resetPassword);



        this.router.get(`${this.path}/getAll`, this.store.getAll)
        this.router.get(`${this.path}/:id`, this.store.getById)
        this.router.delete(`${this.path}/:id`, isAdmin, this.store.delete)
        this.router.put(`${this.path}/approve/:storeId`, isAdmin, this.store.approveStore);


        this.router.get(`${this.path}/nearBy/Location`, this.store.getNearbyStores)

    }





}