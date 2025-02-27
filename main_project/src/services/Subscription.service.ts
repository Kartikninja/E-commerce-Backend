import { HttpException } from "@/exceptions/httpException";
import { Subscription } from "@/interfaces/Subscription.interface";
import { SubscriptionModel } from "@/models/Subscription.model";
import Razorpay from "razorpay";
import Container, { Service } from "typedi";
import { NotificationService } from "./Notification.service";
import paymentClient from "@/grpc/grpcClient";
import { SUBSCRIPTIONS_TYPES } from "@/utils/constant";




const razorpay = new Razorpay({
    key_id: "rzp_test_oPTupXhgKYgwXA",
    key_secret: "Y2fY65okD7D08aI9AmWXxCX0",
})
@Service()
export class SubscriptionService {

    public notificationService = Container.get(NotificationService)
    public async getAll() {
        const SubAll = await SubscriptionModel.find({ isActive: true })
        return SubAll

    }

    // razorpayPlan = await razorpay.plans.create({
    //     period: SubscriptionData.period,
    //     interval: 1,
    //     item: {
    //         name: SubscriptionData.name,
    //         amount: Math.round(SubscriptionData.price * 100),
    //         currency: 'INR',
    //         description: SubscriptionData.benefite.join(', '),
    //     },

    // });

    public async CreateSubscription(SubscriptionData: Subscription) {

        const checkName = await SubscriptionModel.find({ name: { $regex: new RegExp(`^${SubscriptionData.name}`) } })
        console.log(checkName)
        if (checkName.length > 0) {
            throw new HttpException(409, `${SubscriptionData.name} name is already exists`)
        }
        console.log("SubscriptionData.type (before saving):", SubscriptionData.type);
        console.log("Allowed values:", Object.values(SUBSCRIPTIONS_TYPES));

        let razorpayPlan;
        try {
            const razorpaySend = { period: SubscriptionData.period, interval: 1, name: SubscriptionData.name, amount: SubscriptionData.price, currency: 'INR', description: SubscriptionData.benefite.join(', ') }
            razorpayPlan = await new Promise((resolve, reject) => {
                paymentClient.createSubscriptionPlan(razorpaySend, (error, response) => {
                    if (error) reject(error)
                    else resolve(response)
                })
            })


            console.log("razorpayPlan", razorpayPlan)
            SubscriptionData.razorpayPlanId = razorpayPlan.planId
        } catch (error) {
            throw new HttpException(500, `Failed to create Razorpay plan: ${error.message}`);
        }


        const newSubscription = await SubscriptionModel.create(SubscriptionData)
        await newSubscription.save()

        await this.notificationService.sendNotification({
            modelName: "Subscription",
            subScriptionId: newSubscription._id.toString(),
            createdBy: 'Admin',
            type: 'SubScription-Created',
            metadata: { type: newSubscription.type }


        })

        return newSubscription;
    }



    public async getById(id: string) {

        const subscription = await SubscriptionModel.findById(id)
        if (!subscription) {
            throw new HttpException(404, `Subscription with id ${id} not found`)
        }
        return subscription
    }

    public async delete(id: string) {

        const subscription = await SubscriptionModel.findById(id)

        if (!subscription) {
            throw new HttpException(404, `Subscription with id ${id} not found`)
        }
        await subscription.deleteOne()
        await this.notificationService.sendNotification({
            modelName: "Subscription",
            subScriptionId: subscription._id.toString(),
            createdBy: 'Admin',
            type: 'SubScription-Deleted',
            metadata: { type: subscription.type }


        })
        return subscription
    }

}