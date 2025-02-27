import { NextFunction, Request, response, Response } from 'express';
import { Container } from 'typedi';
import { AddressService } from '@services/Address.service'
import ipinfo from 'ipinfo'
import axios from 'axios';
export class AddressController {
    public addressService = Container.get(AddressService)


    public createAddress = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = req.user._id;
            const addressData = req.body;

            const newAddress = await this.addressService.createAddress(userId, addressData);

            res.status(201).json({ message: 'Address created successfully', address: newAddress });
        } catch (error) {
            next(error)
        }
    }

    public getAddresses = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = req.user._id;

            const addresses = await this.addressService.getAddresses(userId);

            res.status(200).json({ message: 'Addresses fetched successfully', addresses });
        } catch (error) {
            next(error)
        }
    }


    public updateAddress = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { addressId } = req.params;
            const userId = req.user._id;
            const addressData = req.body;

            const updatedAddress = await this.addressService.updateAddress(userId, addressId, addressData);

            res.status(200).json({ message: 'Address updated successfully', address: updatedAddress });
        } catch (error) {
            next(error)
        }
    }


    public deleteAddress = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { addressId } = req.params;
            const userId = req.user._id;

            await this.addressService.deleteAddress(userId, addressId);

            res.status(200).json({ message: 'Address deleted successfully' });
        } catch (error) {
            next(error)
        }
    }

    public updateLocation = async (req: Request, res: Response, next: NextFunction) => {
        const userId = req.user._id;
        const ipAddress = req.ip;
        console.log("ipAddress", ipAddress);
        const { addressId } = req.params;

        try {

            // const locationResponse = await axios.get(`http://ip-api.com/json/${ipAddress}`);
            const locationResponse = { status: 'success', lat: 37.7749, lon: -122.4194 };

            console.log("locationResponse", locationResponse)
            // if (locationResponse.data.status !== 'fail') {
            //     const { lat, lon } = locationResponse.data;

            //     console.log("Fetched Location:", lat, lon);

            //     const updateLocation = await this.addressService.updateLocation(addressId, userId, lat.toString(), lon.toString());
            //     res.status(200).json(updateLocation);
            if (locationResponse.status !== 'fail') {
                const { lat, lon } = locationResponse;

                console.log("Fetched Location:", lat, lon);

                const updateLocation = await this.addressService.updateLocation(addressId, userId, lat.toString(), lon.toString());
                res.status(200).json(updateLocation);
            } else {
                return res.status(400).json({ message: 'Location information not available' });
            }
        } catch (error) {
            return res.status(500).json({ message: 'Error fetching location', error: error.message });
        }
    };

}

