import { Payout, PayoutModel } from '@/models/Payout.model';
import { HttpException } from '@/exceptions/httpException';
import { StoreModel } from '@/models/Store.model';
import { Service } from 'typedi';
import Razorpay from 'razorpay';
import { RAZORPAY_API_KEY, RAZORPAY_API_SECRET } from '@config'
import axios from 'axios';
import { RAZORPAYX_API_KEY, RAZORPAYX_API_SECRET, RAZORPAYX_ACCOUNT_NUMBER } from '@config'
import { PaymentDocument } from '@/interfaces/Payment.interface';
import { Payoutinterface } from '@/interfaces/Payout.interface';
import mongoose from 'mongoose';

const razorpay = new Razorpay({
    key_id: "rzp_test_kghAwVX1ISLmoi",
    key_secret: "NnB5pXhUXLranWMEUPuF31L4",
})



const razorpayX = new Razorpay({
    key_id: "rzp_test_kghAwVX1ISLmoi",
    key_secret: "NnB5pXhUXLranWMEUPuF31L4",

})


const RAZORPAYX_API_BASE = 'https://api.razorpay.com/v1';
const RAZORPAYX_KEY_ID = 'rzp_test_kghAwVX1ISLmoi';
const RAZORPAYX_KEY_SECRET = 'NnB5pXhUXLranWMEUPuF31L4';

const razorpayXAuthHeader = {
    Authorization: `Basic ${Buffer.from(`${RAZORPAYX_KEY_ID}:${RAZORPAYX_KEY_SECRET}`).toString('base64')}`,
    'Content-Type': 'application/json',
};



@Service()
export class PayoutService {

    public async createRazorpayAccount(storeData: any) {
        const auth = {
            username: RAZORPAY_API_KEY!,
            password: RAZORPAY_API_SECRET!,
        };

        const bankDetails = storeData.payoutBankDetails;

        const payload = {
            email: storeData.email,
            phone: storeData.phoneNumber,
            legal_business_name: storeData.storeName,
            business_type: 'individual',
            profile: {
                category: 'ecommerce',
                addresses: {
                    operation: {
                        street1: storeData.address || 'N/A',
                        city: 'City Name',
                        state: 'State Name',
                        postal_code: 560000,
                        country: 'IN'
                    }
                }
            },
            bank_account: {
                beneficiary_name: storeData.fullName,
                account_number: bankDetails.accountNumber,
                ifsc: bankDetails.ifsc
            }
        };

        try {
            const response = await axios.post(
                'https://api.razorpay.com/v2/accounts',
                payload,
                { auth }
            );
            return response.data;
        } catch (error) {
            console.error('Razorpay account creation failed:', error.response?.data);
            throw error;
        }




    };


    public async amoutToSeller(fundAccountId: string, amout: number, sellerData: any) {
        const payoutData = {

            account_number: RAZORPAYX_ACCOUNT_NUMBER,
            fund_account_id: fundAccountId,
            amount: amout * 100,
            currency: "INR",
            mode: "IMPS",
            purpose: "payout",
            queue_if_low_balance: true,
            reference_id: `PO_${Date.now()}_${sellerData.storeId}`,
            narration: "Acme Corp Fund Transfer",
            notes: {
                store_id: sellerData._id,
            }
        }
        try {
            const response = await axios.post(`${RAZORPAYX_API_BASE}/payouts`, payoutData, { headers: razorpayXAuthHeader })


            return response.data
        } catch (error) {
            throw new Error(`Payout failed: ${error.response.data.error.description}`);
        }

    }


    public async getPayoutStatus(payoutId: string) {
        try {
            const response = await axios.get(`https://api.razorpay.com/v1/payouts/${payoutId}`, {
                headers: razorpayXAuthHeader,
            });
            return response.data;
        } catch (error) {
            throw new HttpException(500, 'Failed to fetch payout status');
        }
    }


}



