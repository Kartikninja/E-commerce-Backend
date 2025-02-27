import { AddressModel } from '@models/Address.model';
import { UserModel } from '@models/users.model'
import { Address } from '@interfaces/Address.interface';
import { Service } from 'typedi';

@Service()
export class AddressService {
    public async createAddress(userId: string, addressData: Address): Promise<Address> {
        const newAddress = new AddressModel({
            userId,
            ...addressData
        });

        const savedAddress = await newAddress.save();

        await UserModel.findByIdAndUpdate(userId, { $push: { addresses: savedAddress._id } });

        return savedAddress;
    }

    public async getAddresses(userId: string): Promise<Address[]> {
        return await AddressModel.find({ userId }).populate('userId', 'fullName email');
    }

    public async updateAddress(userId: string, addressId: string, addressData: Address): Promise<Address | null> {
        const address = await AddressModel.findOne({ _id: addressId, userId });

        if (!address) {
            throw new Error('Address not found or does not belong to this user');
        }

        address.set(addressData);
        return await address.save();
    }

    public async deleteAddress(userId: string, addressId: string): Promise<void> {
        const address = await AddressModel.findOne({ _id: addressId, userId });

        if (!address) {
            throw new Error('Address not found or does not belong to this user');
        }

        await AddressModel.findByIdAndDelete(addressId);

        await UserModel.findByIdAndUpdate(userId, { $pull: { addresses: addressId } });

    }

    public async updateLocation(addressId: string, userId: string, latitude: string, longitude: string): Promise<Address | null> {
        const address = await AddressModel.findOne({ _id: addressId, userId: userId });

        if (!address) {
            throw new Error('Address not found for this user');
        }

        address.location = {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)],
        };

        return await address.save();
    }



}

