import { PaymentController } from "@/controllers/Payment.controller";
import { Routes } from "@/interfaces/routes.interface";
import { isAdmin } from "@/middlewares/auth.middleware";
import { Router } from "express";
import crypto from 'crypto'

export class PaymentRouter implements Routes {
    public path = '/payment'
    public router = Router()
    public payment = new PaymentController()


    constructor() {
        this.intializeRouter()
    }
    private intializeRouter() {
        this.router.post(`${this.path}/create`, this.payment.createPayment)
        this.router.put(`${this.path}/update-status`, this.payment.updatePaymentStatus)

        this.router.post(`${this.path}/createRazorPay`, this.payment.createRazorpayPayment)

        this.router.post(`${this.path}/verify/payment`, this.payment.verifyPayment)

        this.router.get(`${this.path}/admin/getAll`, isAdmin, this.payment.getAllPaymnet)

        // this.router.post(`${this.path}/refund/webhook`, this.payment.handleRefundProcessedWebhook)

        // this.router.post(`${this.path}/subscriptioncancle/webhook`, this.payment.handleSubscriptionCancellationWebhook)

    }

}
