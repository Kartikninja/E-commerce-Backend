import { NextFunction, Request, Response } from 'express';
import { RazorpayService } from '@services/razorpay.service';
import Container from 'typedi';

export class RazorpayController {
    private razorpayService = Container.get(RazorpayService)
    public createCustomer = async (req: Request, res: Response, next: NextFunction) => {
        const { email, contact, name } = req.body;
        try {
            const customer = await this.razorpayService.createContact(req.body);
            res.status(200).json({ message: 'Customer created successfully', data: customer });
        } catch (error) {
            next(error)
        }
    }

    public createFundAccount = async (req: Request, res: Response, next: NextFunction) => {
        const { contactId, bankDetails } = req.body;
        try {
            const fundAccount = await this.razorpayService.createFundAccount(contactId, bankDetails);
            res.status(200).json({ message: 'Fund account created successfully', data: fundAccount });
        } catch (error) {
            next(error)
        }
    }


    public verifyFundAccount = async (req: Request, res: Response, next: NextFunction) => {
        const { fundAccountId } = req.params;
        try {
            const verification = await this.razorpayService.verifyFundAccount(fundAccountId);
            res.status(200).json({ message: 'Fund account verified successfully', data: verification });
        } catch (error) {
            next(error)
        }
    }


    // public createPayout = async (req: Request, res: Response, next: NextFunction) => {
    //     const { fundAccountId, amount, currency } = req.body;
    //     try {
    //         const payout = await this.razorpayService.createPayout(fundAccountId, amount, currency);
    //         res.status(200).json({ message: 'Payout created successfully', data: payout });
    //     } catch (error) {
    //         next(error)
    //     }
    // }

}

