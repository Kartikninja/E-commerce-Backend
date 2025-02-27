import { PaymentDocument } from '../interface/Payment.interface';
import { Document } from 'mongoose';
export declare const PaymentModel: import("mongoose").Model<PaymentDocument, {}, {}, {}, Document<unknown, {}, PaymentDocument> & PaymentDocument & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
