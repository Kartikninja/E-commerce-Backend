import { NextFunction, Request, Response } from "express";
import { CreateUserSubscriptionDto } from "@/dtos/UserSubscription .dto";
import Container from "typedi";
import { UserSubscriptionService } from "@/services/UserSubscription.service";

export class UserSubscriptionController {

    private userSub = Container.get(UserSubscriptionService)

    public userBuySubscription = async (req: Request, res: Response, next: NextFunction) => {

        try {
            const userId = req.user._id
            const { subscriptionId } = req.params;


            const { startDate, isAutoRenew, subscriptionType } = req.body;
            const { subscription, paymentDetails,
                // paymentLink
            } = await this.userSub.UserPurchase(userId, subscriptionId, startDate, isAutoRenew, subscriptionType);
            res.json({
                message: "Subscription added successfully", status: true, subscription, paymentDetails,
                // paymentLink
            });
        } catch (error) {
            next(error);
        }
    };


    public getAll = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await this.userSub.getAllSubscriptions();
            res.json({ message: "All subscriptions retrieved successfully", status: true, result });
        } catch (error) {
            next(error);
        }
    }

    public getById = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id;
            const result = await this.userSub.getSubscriptionById(id);
            res.json({ message: "Subscription retrieved successfully", status: true, result });
        } catch (error) {
            next(error);
        }
    }

    public delete = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id;
            const result = await this.userSub.deleteSubscription(id);
            res.json({ message: "Subscription deleted successfully", status: true, result });
        } catch (error) {
            next(error);
        }
    }




    public cancleSubscription = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.user._id
            const subscriptionId = req.params.subscriptionId;
            const cancellationReason = typeof req.body.cancellationReason === 'string'
                ? req.body.cancellationReason
                : 'User requested cancellation';
            const result = await this.userSub.cancleSubscription(userId, subscriptionId, cancellationReason);

            res.status(200).json({ message: "Refund Initiate", result })

        } catch (error) {
            next(error);
        }
    }



}
