import { Service } from 'typedi';
import { PaymentModel } from '@models/Payment.model';
import { Payment, PaymentDocument } from '@interfaces/Payment.interface';
import { HttpException } from '@exceptions/httpException';
import Razorpay from 'razorpay';

const razorpayInstance = new Razorpay({
    key_secret: "Y2fY65okD7D08aI9AmWXxCX0",
    key_id: "rzp_test_oPTupXhgKYgwXA"
})





@Service()
export class PaymentService {



    public async createRazorpayOrder(amount: number, userId: string, paymentMethod: string, modelName: string): Promise<PaymentDocument> {
        const options = {
            amount: amount * 100,
            currency: 'INR',
            receipt: `order_receipt_${new Date().getTime()}`,
            payment_capture: 1,
            notes: { userId: userId },
        };
        try {
            const order = await razorpayInstance.orders.create(options)
            const paymentData: Payment = {
                userId,
                paymentId: '',
                orderId: order.id,
                amount,
                currency: 'INR',
                status: 'unpaid',
                paymentMethod,
                email: '',
                contact: '',
                vpa: null,
                wallet: null,
                bank: null,
                amountRefunded: 0,
                refundStatus: null,
                fee: 0,
                tax: 0,
                errorCode: null,
                errorDescription: null,
                acquirerData: {
                    rrn: null,
                    upiTransactionId: null,
                },
                createdAt: new Date(),
                updatedAt: new Date(),
                modelName,
                refundId: null
            };
            const newPayment = new PaymentModel(paymentData);
            await newPayment.save()
            return newPayment

        } catch (error) {
            console.log("Error ", error)
            throw new HttpException(404, "Error in Paymnet RazorPay")
        }
    }

    public async createRazorpayPaymentLink(
        amount: number,
        userId: string,
        modelName: string,
        orderId: string,
        userDetails: { name: string; email: string; contact: number }
    ): Promise<any> {
        try {
            const optionsforlink = {
                amount: amount * 100, // Amount in paise
                currency: 'INR',
                accept_partial: false,
                reference_id: orderId, // Razorpay order ID
                description: `Payment for ${modelName}`,
                customer: {
                    name: userDetails.name,
                    contact: userDetails.contact,
                    email: userDetails.email,
                },
                notify: {
                    sms: true,
                    email: true,
                },
                callback_url: 'https://maple-atom-builders-textiles.trycloudflare.com/api/v1/payment/verify/payment',
                callback_method: 'get',
            };

            const link = await razorpayInstance.paymentLink.create(optionsforlink);

            return link;
        } catch (error) {
            console.log("Error in createRazorpayPaymentLink:", error);
            throw new HttpException(500, "Error creating Razorpay Payment Link");
        }
    }


    public async createPayment(paymentData: Payment): Promise<Payment> {
        try {
            const newPayment = new PaymentModel(paymentData);
            console.log("newPayment", newPayment)
            await newPayment.save();
            return newPayment;
        } catch (error) {
            throw new HttpException(500, 'Error creating payment');
        }
    }

    public async updatePaymentStatus(orderId: string, status: string): Promise<Payment | null> {
        try {
            const payment = await PaymentModel.findOneAndUpdate(
                { orderId },
                { status },
                { new: true }
            );

            if (!payment) throw new HttpException(404, 'Payment not found');

            return payment;
        } catch (error) {
            throw new HttpException(500, 'Error updating payment status');
        }
    }





    public async getAllPaymnet() {
        const getAll = await PaymentModel.find()
        return getAll
    }




}
