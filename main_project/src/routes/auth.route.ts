import { Router } from "express";
import { AuthController } from "@controllers/auth.controller";
import { Routes } from "@interfaces/routes.interface";
import { CreateUserDto, LoginUserDto } from "@dtos/user.dto";
import { ValidationMiddleware } from "@middlewares/validation.middleware";
import { AuthMiddleware } from "@middlewares/auth.middleware";

export class AuthRoute implements Routes {
  public path = "/auth";
  public router = Router();
  public auth = new AuthController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {

    this.router.post(`${this.path}/signup`, ValidationMiddleware(CreateUserDto, true), this.auth.signUp);

    this.router.post(`${this.path}/login`, ValidationMiddleware(LoginUserDto, true), this.auth.logIn);
    this.router.post(`${this.path}/verify/otp`, AuthMiddleware, this.auth.verifyOtp)
    this.router.get(`${this.path}/logout`, AuthMiddleware, this.auth.logout);
    this.router.get(`${this.path}/`, AuthMiddleware, this.auth.checkLogggedIn);
    this.router.post(`${this.path}/social/login`, ValidationMiddleware(LoginUserDto, true), this.auth.socialLogin);
    this.router.post(`${this.path}/admin/login`, ValidationMiddleware(CreateUserDto, true), this.auth.adminLogin);
    this.router.post(`${this.path}/forgotPassword`, ValidationMiddleware(CreateUserDto, true), this.auth.forgotPassword);
    this.router.get(`${this.path}/verifyEmail/:token`, this.auth.verifyEmail);

    this.router.post(`${this.path}/resetPassword`, ValidationMiddleware(CreateUserDto, true), this.auth.resetPassword);
  }
}
