import { SubscriptionService } from "@/services/Subscription.service";
import { NextFunction, Request, Response } from "express";
import Container from "typedi";

export class SubscriptionController {
    private sub = Container.get(SubscriptionService)

    public getAll = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await this.sub.getAll();
            res.json({ message: "GetAll", status: true, result });
        } catch (error) {
            next(error)
        }
    }


    public CreateSubscription = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const subData = req.body
            const result = await this.sub.CreateSubscription(subData)
            res.json({ message: "Added succesfuly", status: true, result })
        } catch (error) {
            next(error)
        }
    }

    public getById = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params
            const getById = await this.sub.getById(id)
            res.json({ message: "Get By Id", status: true, getById })
        } catch (error) {
            next(error)
        }
    }

    public delete = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params
            const result = await this.sub.delete(id)
            res.json({ message: "Deleted succesfuly", status: true, result })
        } catch (error) {
            next(error)
        }
    }


}