import { Router } from 'express';
import { AddressController } from '@controllers/address.controller';
import { AuthMiddleware } from '@/middlewares/auth.middleware';

export class AddressRouter {
    public router = Router();
    public path = '/address'
    public addressController = new AddressController()
    constructor() {

        this.initializeRoutes();
    }

    private initializeRoutes() {

        this.router.post(`${this.path}`, AuthMiddleware, this.addressController.createAddress);
        this.router.get(`${this.path}`, AuthMiddleware, this.addressController.getAddresses);
        this.router.put('/:addressId', AuthMiddleware, this.addressController.updateAddress);
        this.router.delete('/:addressId', AuthMiddleware, this.addressController.deleteAddress);
        this.router.post(`${this.path}/:addressId/update-location`, AuthMiddleware, this.addressController.updateLocation)
        
    }
}


