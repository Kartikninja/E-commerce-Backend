
import { PayoutService } from '@services/payout.service';
import { Request, Response, NextFunction } from 'express';
import Container from 'typedi';

import crypto from 'crypto'
import { PayoutModel } from '@/models/Payout.model';
import { RAZORPAYX_WEBHOOK_SECRET } from '@config'
import { OrderModel } from '@/models/Order.model';



export class PayoutController {
    private payoutService = Container.get(PayoutService);

 
    public getPayoutStatus = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { payoutId } = req.params;
            const status = await this.payoutService.getPayoutStatus(payoutId);

            res.status(200).json({
                status: true,
                data: status
            });
        } catch (error) {
            next(error);
        }







    }


    public verifyRazorpayXWebhook(body: any, signature: string): boolean {
        const webhookSecret = RAZORPAYX_WEBHOOK_SECRET!;
        const bodyString = JSON.stringify(body);
        console.log("bodyString", bodyString)
        const generatedSignature = crypto
            .createHmac('sha256', webhookSecret)
            .update(bodyString)
            .digest('hex');

        console.log("generatedSignature", generatedSignature)
        console.log("signature", signature)


        return generatedSignature === signature;
    }

    public razorpayXwebhook = async (req: Request, res: Response) => {
        console.log("=======razorpayXwebhook start======")
        try {
            const signature = req.headers['x-razorpay-signature'] as string;
            const isValid = this.verifyRazorpayXWebhook(req.body, signature);
            console.log("req.headers", req.headers)
            if (!isValid) {
                return res.status(401).json({ error: 'Invalid signature' });
            }

            const event = req.body.event;
            const payoutData = req.body.payload.payout.entity;
            console.log("event", event)
            console.log("payoutData", payoutData)


            const existingPayout = await PayoutModel.findOne({ razorpayPayoutId: payoutData.id })
            existingPayout.payoutAmount = payoutData.amount / 100,
                existingPayout.utr = payoutData.utr || null,
                existingPayout.status_details = {
                    description: payoutData.status_details?.description || null,
                    source: payoutData.status_details.source || null,
                    reason: payoutData.status_details.reason || null
                },
                existingPayout.purpose = payoutData.purpose,
                existingPayout.purpose = payoutData.purpose;

            await existingPayout.save()


            switch (event) {
                case 'payout.processed':
                    await this.handlePayoutSuccess(payoutData);
                    break;
                case 'payout.failed':
                    await this.handlePayoutFailure(payoutData);
                    break;
                default:
                    console.log('Unhandled event:', event);
            }

            res.status(200).send('OK');
        } catch (error) {
            console.error('Webhook error:', error);
            res.status(500).send('Internal Server Error');
        }
    }

    public async handlePayoutSuccess(payoutData: any) {
        await PayoutModel.findOneAndUpdate(
            { payoutId: payoutData.id },
            {
                status: 'success',
                razorpayPayoutId: payoutData.id,
                processedAt: new Date(),
            }
        );
        console.log("handlePayoutSuccess status change => success")

    }

x
    public async handlePayoutFailure(payoutData: any) {
        await PayoutModel.findOneAndUpdate(
            { payoutId: payoutData.id },
            {
                status: 'failed',
                error: payoutData.error.description,
                failedAt: new Date(),
            }
        );

        console.log("handlePayoutFailure status change => falid")
    }





}




