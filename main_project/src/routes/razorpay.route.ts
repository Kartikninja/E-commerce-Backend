import { Router } from 'express';
import { RazorpayController } from '@controllers/razorpay.controller';
import { Routes } from '@/interfaces/routes.interface';


export class RazorpayRoute implements Routes {
    public path = '/razorpay'
    public router = Router();
    public raz = new RazorpayController()


    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes() {


        this.router.post(`${this.path}/create-customer`, this.raz.createCustomer);
        this.router.post(`${this.path}/create-fund-account`, this.raz.createFundAccount);


        this.router.get(`${this.path}/verify-fund-account/:fundAccountId`, this.raz.verifyFundAccount);
        // this.router.post(`${this.path}/create-payout`, this.raz.createPayout);

    }

}
