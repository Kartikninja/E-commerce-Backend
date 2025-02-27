
import { Router } from 'express';
import { PayoutController } from '@/controllers/Payout.controller';
import { AuthMiddleware } from '@/middlewares/auth.middleware';

export class PayoutRoute {
    public path = '/payouts';
    public router = Router();
    public payoutController = new PayoutController();

    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes() {


        this.router.get(
            `${this.path}/status/:payoutId`,
            AuthMiddleware,
            this.payoutController.getPayoutStatus
        );
        // https://norfolk-isaac-claire-confirmed.trycloudflare.com/payouts/razorpayx-payout-webhook
        this.router.post(`${this.router}/razorpayx-payout-webhook`, this.payoutController.razorpayXwebhook)
    }
}