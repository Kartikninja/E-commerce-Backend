import { Document } from 'mongoose'
export interface Payment {
    userId: string;
    orderId: string;
    amount: number;
    status: 'paid' | 'unpaid' | 'refunded';
    paymentMethod: string;
    createdAt: Date;
    updatedAt: Date;
    modelName: string;
    paymentId?: string
    currency: string;
    email?: string;
    contact?: string;
    vpa?: string | null;
    wallet?: string | null;
    bank?: string | null;
    amountRefunded?: number;
    // refundStatus?: string | null;
    refundStatus?: 'pending' | 'processed' | 'failed' | 'partial' | 'refunded'
    fee?: number;
    tax?: number;
    errorCode?: string | null;
    errorDescription?: string | null;
    acquirerData: {
        rrn?: string | null;
        upiTransactionId?: string | null;
    };

    refundId?: string


}


export interface PaymentDocument extends Payment, Document {
}