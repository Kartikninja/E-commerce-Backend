import { Router } from 'express';
import { PaymentController } from '../controller/payment.controller';
import { Routes } from "../interface/routes.interface";

export class PaymentRouter implements Routes {
    public path = '/payment';
    public router = Router();
    public paymentController = new PaymentController();

    constructor() {
        this.initializeRouter();
    }

    private initializeRouter(): void {
        this.router.post(`${this.path}/webhook`, this.paymentController.verifyWebhook);
    }
}
