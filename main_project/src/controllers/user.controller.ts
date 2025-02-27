import { NextFunction, Request, Response } from "express";
import { Container } from "typedi";
import { User } from "@interfaces/users.interface";
import { UserService } from "@services/user.service";
import { HttpException } from "@/exceptions/httpException";

export class UserController {
  public user = Container.get(UserService);

  public getUserById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId: string = req.params.id;
      const findOneUserData: User = await this.user.findUserById(userId);

      return res.status(200).json({ data: findOneUserData, message: "User Fetch Success" });
    } catch (error) {
      next(error);
    }
  };

  public updateUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId: string = req.params.id;
      const userData = req.body;
      userData.profileImage = req.file;
      const updatedUserData: User = await this.user.updateUser(userId, userData);
      return res.status(200).json({ data: updatedUserData, message: "User Update Success" });
    } catch (error) {
      next(error);
    }
  }

  public resetPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId: string = req.user._id;
      const { oldPassword, newPassword } = req.body;
      await this.user.resetPasswrod(userId, oldPassword, newPassword);
      return res.status(200).json({ message: "User Update Success" });
    } catch (error) {
      next(error);
    }
  }

  public deleteUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId: string = req.params.id;
      const deletedUserData: Boolean = await this.user.deleteUser(userId);
      return res.status(200).json({ data: deletedUserData, message: "User Delete Success" });
    } catch (error) {
      next(error);
    }
  }

  public listUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const params = req.body;
      const users = await this.user.listUsers(params);
      return res.status(200).json({ data: users.data, total: users.total[0].total });
    } catch (error) {
      next(error);
    }
  }

  public uploadImage = async (req: Request, res: Response, next: NextFunction): Promise<object> => {
    try {
      const data = await this.user.uploadImage(req.file);
      return res.status(200).json({ data });
    } catch (error) {
      throw new HttpException(500, error.message);
    }
  }
}