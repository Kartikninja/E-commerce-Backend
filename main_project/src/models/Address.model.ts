import { model, Schema, Document } from 'mongoose';
import { Address } from '@interfaces/Address.interface'
const ObjectId = Schema.Types.ObjectId;

const AddressSchema: Schema = new Schema(
    {
        userId: { type: ObjectId, ref: 'User', required: true },
        fullName: { type: String, required: true },
        phoneNumber: { type: String, required: true },
        addressLine1: { type: String, required: true },
        addressLine2: { type: String },
        city: { type: String, required: true },
        state: { type: String, required: true },
        postalCode: { type: String, required: true },
        country: { type: String, required: true },
        location: {
            type: { type: String, enum: ['Point'], default: 'Point' },
            coordinates: { type: [Number], default: [0, 0] },
        },
        isDefault: { type: Boolean, default: false },
        addressType: { type: String, enum: ['home', 'work', 'other'], default: 'home' },
    },
    { timestamps: true, versionKey: false }
);

AddressSchema.index({ location: '2dsphere' });

export const AddressModel = model<Document & Address>('Address', AddressSchema, 'Addresses');
