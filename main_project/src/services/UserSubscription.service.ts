import { HttpException } from "@/exceptions/httpException";
import { SubscriptionModel } from "@/models/Subscription.model";
import { UserModel } from "@/models/users.model";
import { UserSubscriptionModel } from "@/models/UserSubscriptionSchema.model";
import Container, { Service } from "typedi";
import { PaymentService } from "./Paymnet.Service";
import { PaymentModel } from "@/models/Payment.model";
import { NotificationService } from "./Notification.service";
import { sendCancelSubscriptionEmail, sendpurchaseSubscriptionemail, sendSubscriptionExpiryEmail } from "@/utils/mailer";
import { User } from "@/interfaces/users.interface";
import { UserPurchaseSubScription, UserSubscription } from "@/interfaces/UserSubscription.interface";
import { RazorpayService } from "./razorpay.service";
import Razorpay from "razorpay";
import mongoose from "mongoose";
import paymentClient from "@/grpc/grpcClient";


const razorpay = new Razorpay({
    key_id: "rzp_test_oPTupXhgKYgwXA",
    key_secret: "Y2fY65okD7D08aI9AmWXxCX0",
})


@Service()
export class UserSubscriptionService {

    private payment = Container.get(PaymentService)
    private notification = Container.get(NotificationService)
    private razorpayService = Container.get(RazorpayService)

    public async UserPurchase(userId: string, subscriptionId: string, startDate: Date, isAutoRenew: boolean, subscriptionType: number) {


        const checkSub = await SubscriptionModel.findById({ _id: subscriptionId, isActive: true, type: subscriptionType })

        if (!checkSub) {
            throw new HttpException(409, 'Subscription not found')
        }
        const price = checkSub.price
        const checkUser = await UserModel.findOne({ _id: userId, isActive: true })
        if (!checkUser) {
            throw new HttpException(409, 'User not found')
        }

        const checkSubUser = await UserSubscriptionModel.findOne({ userId, subscriptionId, isActive: true })
        if (checkSubUser) {
            throw new HttpException(409, 'Subscription already exists')
        }

        const startDateSelect = startDate || new Date();
        const endDate = new Date(startDate)
        switch (checkSub.period) {
            case 'monthly':
                endDate.setMonth(endDate.getMonth() + 1)
                break
            case 'yearly':
                endDate.setFullYear(endDate.getFullYear() + 1);
                break;
            case 'weekly':
                endDate.setDate(endDate.getDate() + 7)
                break
        }
        // const newPayment = await this.payment.createRazorpayOrder(price, userId, 'razorpay', 'UserSubScription')
        const newPaymentRequest = { userId, amount: price, paymentMethod: 'razorpay', modelName: 'UserSubScription' }
        const newPayment: any = await new Promise((resolve, reject) => {
            paymentClient.CreateRazorpayOrder(newPaymentRequest, (error, response) => {
                if (error) reject(error)
                else resolve(response)
            })
        })
        // const paymentLink = await this.payment.createRazorpayPaymentLink(
        //     checkSub.price,
        //     userId,
        //     'UserSubScription',
        //     newPayment.orderId,
        //     {
        //         name: checkUser.fullName,
        //         email: checkUser.email,
        //         contact: checkUser.phoneNumber,
        //     }
        // );


        // endDate.setMonth(endDate.getMonth() + (checkSub.type === 2 ? 1 : 12))
        // endDate.setMinutes(endDate.getMonth() + 2);

        const userSubscriptionData = {
            userId,
            subscriptionId,
            startDate: startDate || new Date(),
            endDate,
            isActive: false,
            isAutoRenew,
            expiry: endDate,
            price,
            orderId: newPayment.orderId,
            subscriptionType


        };

        console.log("userSubscriptionData", userSubscriptionData)
        const newUserSubscription = new UserSubscriptionModel(userSubscriptionData);

        const savedSubscription = await newUserSubscription.save();

        await UserModel.findByIdAndUpdate(userId, { $push: { subscription: newUserSubscription._id } })

        await this.notification.sendNotification({
            modelName: 'UserSubscription',
            usersubScriptionId: newUserSubscription._id.toString(),
            createdBy: 'User',
            type: 'User-Purchase-SubScription',
            metadata: { expiry: userSubscriptionData.expiry },
            userId: newUserSubscription.userId,
            subScriptionId: subscriptionId,
        })


        const populatedUser = await UserModel.findById(userId).select('fullName email');
        const emailData = {
            userName: populatedUser?.fullName || 'Valued User',
            email: populatedUser?.email,
            subscriptionDetails: {
                startDate: startDateSelect,
                endDate: endDate,
                price,
                isAutoRenew,
                subscriptionId,
            },
            subscriptionId: subscriptionId,
            subscriptionType
        };

        await sendpurchaseSubscriptionemail(emailData)

        const UserSubScriptionData = {
            razorpayPlanId: checkSub.razorpayPlanId,
            isAutoRenew: savedSubscription.isAutoRenew,
            start_date: savedSubscription.startDate,
            end_date: savedSubscription.endDate,
            userId: savedSubscription.userId,
            name: checkSub.name,
            price: savedSubscription.price,
            subscriptionType
        }







        const userSubscriptionPayment = await this.razorpayService.subscriptionPaymnet(UserSubScriptionData)

        savedSubscription.razorpaySubscriptionId = userSubscriptionPayment.id;




        await savedSubscription.save();




        return {
            subscription: savedSubscription, paymentDetails: newPayment,
            // paymentLink: paymentLink.short_url
        };
    };



    public async activateUserSubscription(orderId: string): Promise<void> {
        try {
            const payment = await PaymentModel.findOne({ orderId });

            if (!payment) {
                throw new Error('Payment not found');
            }

            if (payment.status !== 'paid') {
                throw new Error('Payment not successful');
            }


            const userSubscription = await UserSubscriptionModel.findOne({
                userId: payment.userId,
                subscriptionId: payment.orderId,
                isActive: false
            });

            if (!userSubscription) {
                throw new Error('Subscription not found');
            }


            userSubscription.isActive = true;
            await userSubscription.save();

            await UserModel.findByIdAndUpdate(payment.userId, { $push: { subscription: userSubscription._id } });

            console.log('Subscription activated successfully!');
        } catch (error) {
            console.error('Error activating subscription:', error);
        }
    }


    public async getAllSubscriptions() {
        const result = await UserSubscriptionModel.find()
        return result
    }


    public async getSubscriptionById(id: string) {
        const result = await UserSubscriptionModel.findById(id)
        return result

    }

    public async deleteSubscription(id: string) {
        const result = await UserSubscriptionModel.findByIdAndDelete(id)
        return result
    }



    public async checkSubscriptionExpiry() {
        const currentDate = new Date();
        const reminderDate = new Date(currentDate.setDate(currentDate.getDate() + 7));

        const expiringSubscriptions = await UserSubscriptionModel.find({
            paymentStatus: 'paid',
            expiry: { $lt: reminderDate },
            isActive: true
        }).populate<{ subscriptionId: UserSubscription, userId: UserPurchaseSubScription }>('subscriptionId userId');

        for (const sub of expiringSubscriptions) {
            const user = sub.userId;
            const subscription = sub.subscriptionId;


            const emailData = {
                userName: user.fullName,
                email: user.email,
                subscriptionDetails: {
                    startDate: sub.startDate.toDateString(),
                    endDate: sub.expiry.toDateString(),
                    price: subscription.price,
                    isAutoRenew: sub.isAutoRenew ? 'Enabled' : 'Disabled',
                    subscriptionId: subscription._id
                }
            };

            try {
                await sendSubscriptionExpiryEmail(emailData);
                console.log("Email sent successfully.");
            } catch (error) {
                console.error("Error sending email:", error);
            }
        }

        const expiredSubscriptions = await UserSubscriptionModel.find({
            endDate: { $lt: currentDate },
            isActive: true
        });

        for (const sub of expiredSubscriptions) {
            if (!sub.isAutoRenew) {
                sub.isActive = false;
                sub.startDate = null;
                sub.endDate = null;
                sub.expiry = null;
                await sub.save();

                await UserModel.findByIdAndUpdate(sub.userId, {
                    $pull: { subscription: sub._id },
                });
            } else {
                sub.isActive = true;
                await sub.save();
            }
        }

    }

    public async cancleSubscription(userId: string, subscriptionId: string, cancellationReason?: string) {

        const checkSub = await UserSubscriptionModel.findOne({
            subscriptionId: new mongoose.Types.ObjectId(subscriptionId),
            userId: new mongoose.Types.ObjectId(userId),
            isActive: true
        }).populate('subscriptionId');
        console.log("userId", userId)
        const user = await UserModel.findOne({ _id: userId })
        if (!checkSub) {
            throw new HttpException(404, 'Subscription not found');
        }

        if (checkSub.refundStatus === 'pending' || checkSub.refundStatus === 'refunded') {
            throw new HttpException(400, 'Refund already initiated or completed');
        }


        const purchaseDate = checkSub.createdAt
        const cancellationWindow = 24 * 60 * 60 * 1000
        const isEligible = Date.now() - purchaseDate.getTime() < cancellationWindow
        if (!isEligible) {
            throw new HttpException(400, 'Refund window expired');

        }


        const daysUsed = Math.floor(
            (Date.now() - checkSub.startDate.getTime()) / (1000 * 60 * 60 * 24)
        )
        const refundAmount = daysUsed > 0 ?
            Math.max(0, checkSub.price - (daysUsed * (checkSub.price / 30))) :
            checkSub.price;



        try {


            // const cancelResponse = await razorpay.subscriptions.cancel(checkSub.razorpaySubscriptionId, false)
            const cancelResponse: any = await new Promise((resolve, reject) => {
                paymentClient.CancelSubscription({ razorpaySubscriptionId: checkSub.razorpaySubscriptionId }, (error, response) => {
                    if (error) reject(error)
                    else resolve(response)
                })
            })
            console.log("cancelResponse", cancelResponse)
            if (cancelResponse.status === 'cancelled') {
                const notesContent = {
                    reason: String(cancellationReason || 'user_requested'),
                    cancelled_by: String(userId)
                }

                const refund: any = await new Promise((resolve, reject) => {
                    paymentClient.CancelOrder(
                        {
                            paymentId: checkSub.paymentId,
                            amount: Math.round(refundAmount * 100),
                            notes: notesContent
                        },
                        (error, response) => {
                            if (error) reject(error)
                            else resolve(response)
                        }
                    )
                })

                // const refund = await razorpay.payments.refund(checkSub.paymentId, {
                //     amount: refundAmount * 100,
                //     speed: 'normal',
                //     notes: {
                //         reason: String(cancellationReason || 'user_requested'),
                //         cancelled_by: String(userId)

                //     }
                // })
                checkSub.refundStatus = 'pending'
                checkSub.refundId = refund.refundId;
                await checkSub.save()
                console.log("refund", refund)




            } else {
                throw new HttpException(400, 'Failed to cancel subscription');
            }


            await this.notification.sendNotification({
                modelName: 'UserSubscription',
                usersubScriptionId: checkSub._id.toString(),
                createdBy: 'User',
                type: 'User-Cancel-SubScription',
                metadata: { refundAmount: refundAmount },
                userId: checkSub.userId,
                subScriptionId: subscriptionId,
            })

            await sendCancelSubscriptionEmail({
                userName: user.fullName,
                email: user.email,
                subscriptionDetails: {
                    subscriptionId: checkSub._id.toString(),
                    transactionId: checkSub.paymentId,
                    refundAmount,
                    cancellationReason,
                },
            });


            return {
                success: true,

                amount: refundAmount,
                message: 'Refund initiated successfully'
            };
        } catch (error) {
            console.error('Refund error:', error);
            checkSub.refundStatus = 'failed';
            await checkSub.save();

            throw new HttpException(500, 'Refund processing failed');
        }


    }


}




