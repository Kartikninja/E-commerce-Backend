import { Request } from "express";
import { User } from "@interfaces/users.interface";

export interface DataStoredInToken {
  _id: string;
  role: Number;
  email: string;
}

export interface TokenData {
  token: string;
  expiresIn: string;
}

export interface RequestWithUser extends Request {
  user: User;
}
