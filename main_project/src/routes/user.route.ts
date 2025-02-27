import { Router } from "express";
import { UserController } from "@controllers/user.controller";
import { CreateUserDto } from "@dtos/user.dto";
import { Routes } from "@interfaces/routes.interface";
import { ValidationMiddleware } from "@middlewares/validation.middleware";
import { isAdmin, AuthMiddleware } from "@middlewares/auth.middleware";
import multer from "multer";

const upload = multer({
    storage: multer.memoryStorage()
});

export class UserRoute implements Routes {
    public path = "/users";
    public router = Router();
    public user = new UserController();

    constructor() {
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.get(`${this.path}/:id`, AuthMiddleware, this.user.getUserById);
        this.router.post(`${this.path}/pre-signed`, upload.single('file'), this.user.uploadImage);
        this.router.put(`${this.path}/:id`, AuthMiddleware, upload.single('profileImage'), this.user.updateUser);
        this.router.put(`${this.path}/change-password/:id`, AuthMiddleware, this.user.resetPassword);
        this.router.post(`${this.path}/admin/getAll`, isAdmin, this.user.listUsers);
        this.router.delete(`${this.path}/:id`, AuthMiddleware, this.user.deleteUser);
    }
}