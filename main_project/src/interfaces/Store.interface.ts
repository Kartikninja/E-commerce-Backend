import { ObjectId } from 'mongoose';
import { Document } from 'mongodb'

interface Location {
    type: string;
    coordinates: [number, number];
}
interface Store extends Document {

    _id?: string;
    storeName: string;
    storeImage?: string[];
    storeDescription?: string;
    location?: Location;
    subscription?: ObjectId;
    discountApplied: ObjectId[];
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    status: 'pending' | 'approved' | 'rejected';
    isVerified: boolean
    profileImage: string
    registrationDate: Date
    verifyToken: string
    token: string
    verificationTokenExpiresAt: Date
    dateOfBirth: Date
    lastLogin: Date
    fullName: string;
    email: string;
    phoneNumber: string;
    address?: string;
    role: number
    password: string
    resetPasswordToken: string;
    resetPasswordTokenExpiresAt: Date,


    // razorpayAccountId:string;

    razorpayContactId?: string;
    razorpayFundAccountId?: string;
    payoutBankDetails?: {
        accountNumber: string;
        ifsc: string;
        // bankName: string;
        accountHolderName: string
    };

}

export interface StoreDocument extends Store, Document { }

