import { PaymentController } from '../controller/payment.controller';
import { Routes } from "../interface/routes.interface";
export declare class PaymentRouter implements Routes {
    path: string;
    router: import("express-serve-static-core").Router;
    paymentController: PaymentController;
    constructor();
    private initializeRouter;
}
