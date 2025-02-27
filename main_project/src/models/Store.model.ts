import { model, Schema, Document } from 'mongoose';
import { StoreDocument } from '@interfaces/Store.interface';
import { USER_ROLES } from '@/utils/constant';

const StoreSchema: Schema = new Schema(
    {

        fullName: {
            type: String,
            required: true,
            trim: true,
        },
        isVerified: { type: Boolean, default: false },
        profileImage: { type: String },
        registrationDate: { type: String },
        verifyToken: { type: String },
        token: { type: String },
        verificationTokenExpiresAt: {
            type: Date,
            allowNull: true,
        },
        dateOfBirth: { type: Date },
        lastLogin: { type: Date },

        role: {
            type: Number,
            enum: USER_ROLES,
            default: 3
        },
        email: {
            type: String,
            required: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
            unique: true
        },
        password: {
            type: String,
            required: true,
        },
        phoneNumber: {
            type: String,
            required: true,
            trim: true,
            match: [/^\+?\d{7,15}$/, 'Invalid phone number format'],
            unique: true
        },
        address: {
            type: String,
            required: false,
            trim: true,

        },


        storeName: {
            type: String,
            required: true
        },
        storeImage: [{
            type: String,
            required: false
        }],
        storeDescription: {
            type: String,
            required: false
        },
        location: {
            type: {
                type: String,
                enum: ['Point'],
                required: true,
            },
            coordinates: {
                type: [Number],
                required: true,
            },
        },
        status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
        isActive: {
            type: Boolean,
            default: false
        },
        resetPasswordToken: {
            type: String,
            required: false
        },
        resetPasswordTokenExpiresAt: { type: Date, required: false },

        createdAt: {
            type: Date,
            default: Date.now
        },
        updatedAt: {
            type: Date,
            default: Date.now
        },
        razorpayContactId: { type: String, required: false },
        razorpayFundAccountId: { type: String, required: false },
        payoutBankDetails: {
            accountNumber: String,
            ifsc: String,

            accountHolderName: String
        },
        // razorpayAccountId: { type: String, required: true },
    },
    { timestamps: true, versionKey: false }
);

StoreSchema.index({ location: '2dsphere' })

export const StoreModel = model<StoreDocument & Document>('Store', StoreSchema, 'Stores');
