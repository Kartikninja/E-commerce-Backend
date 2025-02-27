import mongoose, { Document, Types } from "mongoose";

export interface Verification {
  token: String;
  expireTime: Date;
  isVerified: Boolean;
}



interface Location {
  type: string
  coordinates: [number, number]
}

export interface User {
  _id: string;
  email: string;
  password?: string;
  fullName: string;
  isVerified: Boolean;
  isSubscribed: Boolean;
  googleId: string;
  country: string;  
  about: string;
  registrationDate: string;
  subscription: mongoose.Types.ObjectId[];
  profileImage: string;
  phoneNumber: number;
  verifyToken: string;
  role?: number;
  isActive: Boolean;
  token: string;
  data?: object[]
  total?: number;
  lastLogin: Date;
  storeDetails: Object[]
  preferences: Object[]
  paymentHistory: string
  dateOfBirth: Date
  currentLocation: Location;
  resetPasswordToken: string;
  resetPasswordTokenExpiresAt: Date,
  verificationToken: string,
  verificationTokenExpiresAt: Date,
  customerId?: string
  addresses: mongoose.Types.ObjectId[]
}
export interface UserList {
  data: [User];
}

export interface GoogleSignInBody {
  code: string;
}