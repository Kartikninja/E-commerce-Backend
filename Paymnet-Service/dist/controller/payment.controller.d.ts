import { Request, Response } from 'express';
export declare class PaymentController {
    createRazorpayOrder(call: any, callback: any): Promise<void>;
    verifyWebhook(req: Request, res: Response): Promise<void>;
}
