import { Document, Types } from 'mongoose';

export interface Address extends Document {
    userId: Types.ObjectId; // Reference to User
    fullName: string;
    phoneNumber: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    location: {
        type: 'Point';
        coordinates: [number, number]; // [longitude, latitude]
    };
    isDefault: boolean;
    addressType: 'home' | 'work' | 'other';
    createdAt: Date;
    updatedAt: Date;
}
