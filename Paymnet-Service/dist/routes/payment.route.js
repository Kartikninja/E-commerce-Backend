"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentRouter = void 0;
const express_1 = require("express");
const payment_controller_1 = require("../controller/payment.controller");
class PaymentRouter {
    constructor() {
        this.path = '/payment';
        this.router = (0, express_1.Router)();
        this.paymentController = new payment_controller_1.PaymentController();
        this.initializeRouter();
    }
    initializeRouter() {
        this.router.post(`${this.path}/webhook`, this.paymentController.verifyWebhook);
    }
}
exports.PaymentRouter = PaymentRouter;
//# sourceMappingURL=payment.route.js.map