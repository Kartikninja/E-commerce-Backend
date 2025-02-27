import { StoreDocument } from "@/interfaces/Store.interface";
import { StoreModel } from "@/models/Store.model";
import { StoreService } from "@/services/Store.service";
import { pick } from "@/utils/utils";
import { NextFunction, Request, Response } from "express";
import { token } from "morgan";
import Container from "typedi";

export class StoreController {
    private storeService = Container.get(StoreService)



    public CreateStore = async (req: Request, res: Response, next: NextFunction) => {
        const { storeName, storeDescription, location, dateOfBirth, password, profileImage, subscription, discountApplied, fullName, email, phoneNumber, address,
            storeImage } = req.body;

        try {
            // const store = await this.storeService.createStore({
            //     storeName,
            //     storeDescription,
            //     location,
            //     storeImage,
            //     fullName,
            //     email,
            //     phoneNumber,
            //     address,
            //     role: 3,
            //     profileImage,
            //     dateOfBirth,
            //     password

            // });
            const store = await this.storeService.createStore(req.body)
            res.status(201).json({
                data: { store },
                message: 'Store created and user updated successfully',
                status: true
            });
        } catch (error) {
            next(error);
        }
    }


    public verifyOtp = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { otp } = req.body
            console.log("otp", otp)
            if (!otp) {
                return res.status(400).json({ message: ' OTP are required.' });
            }
            const user = req.store;

            console.log('Authenticated User:', user);
            if (!user || !user.email) {
                return res.status(400).json({ message: 'User not authenticated.' });
            }

            console.log('Authenticated User:', user);
            const result = await this.storeService.verifyOtp(user.email, otp)
            if (result) {
                res.status(200).json({ message: 'Email verified successfully.', status: true });
            } else {
                res.status(400).json({ message: 'Invalid or expired verification token.' });
            }
        } catch (error) {
            next(error);
        }
    }

    public logIn = async (req: Request, res: Response, next: NextFunction) => {
        try {
            req.body = pick(req.body);
            const loginUserData: { findUser: StoreDocument, tokenData: string } | string = await this.storeService.login(req.body);
            if (loginUserData?.findUser) return res.status(200).json({ message: "User Logged in", data: { user: loginUserData?.findUser, token: loginUserData?.tokenData } });
            else return res.status(401).json({ message: loginUserData });
        } catch (error) {
            next(error);
        }
    };


    public forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { email } = req.body
            if (!email) {
                return res.status(400).json({ message: 'Email is required.' })
            }
            const forgotPassword: StoreDocument = await this.storeService.forgotPassword(req.body)
            res.status(200).json({ message: "Mail sent for the User", status: true })
        } catch (error) {
            next(error)
        }
    }


    public verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { token } = req.params;

            const verifyEmailUserData = await this.storeService.verifyToken(token);
            res.status(200).json({ data: verifyEmailUserData, message: "Verification Success" });
        } catch (error) {
            next(error);
        }
    }
    public resetPassword = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { token } = req.params
            const { password } = req.body
            const user = await this.storeService.resetPassword(token, password);
            res.status(200).json({ message: "Reset Password successfully" });
        } catch (error) {
            next(error);
        }
    };

    public getAll = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const getAll = await this.storeService.getAll()
            res.json({ status: true, message: "Get All", getAll })
        } catch (error) {
            next(error);
        }
    }

    public getById = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id
            const store = await this.storeService.getById(id)
            res.json({ status: true, message: "Get By Id", store })
        } catch (error) {
            next(error);
        }
    }

    public delete = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = req.params.id
            const store = await this.storeService.delete(id)
            res.json({ status: true, message: "Delete", store })
        } catch (error) {
            next(error)
        }
    }

    public UpdateStore = async (req: Request, res: Response, next: NextFunction) => {
        const storeId = req.params.storeId;
        const { storeName, storeDescription, location, isActive } = req.body;

        try {
            const updatedStore = await this.storeService.updateStore(storeId, req.body)

            if (!updatedStore) {
                return res.status(404).json({ message: 'Store not found', status: false });
            }

            res.status(200).json({
                data: updatedStore,
                message: 'Store updated successfully',
                status: true
            });
        } catch (error) {
            next(error);
        }
    };


    public approveStore = async (req: Request, res: Response, next: NextFunction) => {
        const { storeId } = req.params;

        try {

            const updatedStore = await this.storeService.approveStore(storeId);

            res.status(200).json({
                data: updatedStore,
                message: 'Store has been approved successfully.',
            });
        } catch (error) {
            next(error);
        }
    };

    public rejectStore = async (req: Request, res: Response, next: NextFunction) => {
        const { storeId } = req.params;
        try {
            const updatedStore = await this.storeService.rejectStore(storeId);
            res.status(200).json({
                data: updatedStore,
                message: 'Store has been rejected successfully.',
            });
        } catch (error) {
            next(error);

        }
    }






    public getNearbyStores = async (req: Request, res: Response) => {
        try {
            const { userId } = req.query;
            const maxDistance = parseInt(req.query.maxDistance as string) || 5000;
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            if (!userId) {
                return res.status(400).json({ message: 'User ID is required' });
            }

            const result = await this.storeService.getNearbyStores(
                userId as string,
                maxDistance,
                page,
                limit
            );

            res.status(200).json(result);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    };



}