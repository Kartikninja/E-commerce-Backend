import { SECRET_KEY, FRONT_END_URL } from '@config';
import { HttpException } from '@exceptions/httpException';
import { DataStoredInToken, TokenData } from '@interfaces/auth.interface';
import { User, GoogleSignInBody } from '@interfaces/users.interface';
import { UserModel } from '@models/users.model';
import { compare, hash } from 'bcrypt';
import { sign, verify } from 'jsonwebtoken';
import Container, { Service } from 'typedi';
import { sendForgotPasswordEmail, sendOtpEmail, sendWelcomEmail } from '../utils/mailer';
import { verifyGoogleToken } from '../utils/utils'
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { NotificationService } from './Notification.service';



const createToken = (user: User): TokenData => {
  const dataStoredInToken: DataStoredInToken = {
    _id: user._id,
    role: user.role,
    email: user.email
  };
  const expiresIn: string = '3d';

  return {
    expiresIn,
    token: sign(dataStoredInToken, SECRET_KEY, { expiresIn }),
  };
};

const verifyToken = (token: string): DataStoredInToken => {
  try {
    const decoded = verify(token, SECRET_KEY) as DataStoredInToken;
    return decoded;
  } catch (error) {
    throw new HttpException(401, 'Invalid token');
  }
};
@Service()
export class AuthService {

  private notificationService = Container.get(NotificationService)

  public async signup(userData: User): Promise<{ user: User, token: string }> {

    const findUser: User = await UserModel.findOne({ email: userData.email, isActive: true });

    if (findUser) throw new HttpException(409, `This email ${userData.email} already exists`)
    else {
      userData.password = await hash(userData.password, 10);
      userData.email = userData.email.toLowerCase();
      const otp = crypto.randomInt(100000, 999999).toString();
      const hashedOtp = await bcrypt.hash(otp, 10);
      const otpExpiration = new Date();
      otpExpiration.setMinutes(otpExpiration.getMinutes() + 15);

      const createUserData: User = await UserModel.create({
        ...userData,
        verifyToken: hashedOtp,
        verificationTokenExpiresAt: otpExpiration,
        isVerified: false,
        role: 1
      });
      await sendOtpEmail(userData.email, otp, userData.fullName);

      const tokenData = await createToken(createUserData).token;



      await this.notificationService.sendNotification({
        modelName: 'User',
        type: 'user-registered',
        createdBy: 'Admin',
        userId: createUserData._id,
        metadata: { email: createUserData.email },
      });
      await UserModel.updateOne({ _id: createUserData._id }, { token: tokenData })
      return { user: createUserData, token: tokenData };
    }
  }


  public async verifyOtp(email: string, otp: string) {
    try {
      const user = await UserModel.findOne({ email: email });
      console.log(user)
      if (!user.verificationTokenExpiresAt || new Date() > new Date(user.verificationTokenExpiresAt)) {
        throw new HttpException(400, 'OTP has expired');
      }
      console.log("user.verifyToken", user.verifyToken)
      const isOtpVerify = await bcrypt.compare(otp, user.verifyToken);
      if (!isOtpVerify) {
        throw new HttpException(400, 'Invalid OTP');
      }
      user.isVerified = true;
      user.verifyToken = '';
      user.verificationTokenExpiresAt = null;
      await user.save();
      await sendWelcomEmail(user.email, user.fullName);

      return user;
    } catch (error) {
      throw new HttpException(400, 'Invalid OTP');
    }
  }


  // https://accounts.google.com/o/oauth2/v2/auth?client_id=280000882284-fmkmhiiqvj6po5i7h5caokiu7d1it54u.apps.googleusercontent.com&redirect_uri=http://localhost:3020/api/v1/auth/google/callback&response_type=code&scope=openid%20email%20profile

  public async googleSignIn(body: { code: string }): Promise<{ user: User, token: string }> {
    const { code } = body;

    const userInfo = await verifyGoogleToken(code);
    const { sub: googleId, name, picture, email } = userInfo;

    let user = await UserModel.findOne({ email });

    if (user) {
      if (user.password && !user.googleId) {
        throw new HttpException(409, `You have manually signed in with Email: ${user.email} and password. Please use manual login.`);
      }

      if (!user.googleId) {
        await UserModel.updateOne({ _id: user._id }, { googleId });
      }
    } else {
      user = await UserModel.create({ email, fullName: name, profileImage: picture, googleId });
    }

    const tokenData = await createToken(user).token;
    await UserModel.updateOne({ _id: user._id }, { token: tokenData });

    return { user, token: tokenData };
  }
  public async login(userData: User): Promise<{ findUser: User, tokenData: string }> {
    const { email, password } = userData

    const findUser: User = await UserModel.findOne({ email, isActive: true }).lean()
    if (!findUser) throw new HttpException(401, `Email Does not Exist, Please Sing Up`);
    if (!findUser.password) throw new HttpException(401, `You are logged-in via social platform. Please login in with your social account`);
    if (!findUser.isVerified) throw new HttpException(401, `User is not verified. Please verify your email to log in.`);

    const data = await compare(password, findUser.password)
    if (!data) throw new HttpException(409, `Invalid Password`);
    else {
      const tokenData = await createToken(findUser).token;
      await UserModel.updateOne({ _id: findUser._id }, { token: tokenData })
      delete findUser.password
      delete findUser.token



      await this.notificationService.sendNotification({
        modelName: 'User',
        type: 'user-login',
        createdBy: 'Admin',
        userId: findUser._id,
        metadata: { email: findUser.email },
      });


      return { findUser, tokenData };
    }
  }

  public async logout(user: User): Promise<boolean> {
    await UserModel.updateOne({ _id: user._id }, { token: '' })


    await this.notificationService.sendNotification({
      modelName: 'User',
      type: 'user-logout',
      createdBy: 'User',
      userId: user._id,
      metadata: { email: user.email },
    });

    return true
  }

  public async adminLogin(userData: User): Promise<{ findUser: User, tokenData: string }> {
    const { email, password } = userData

    const findUser: User = await UserModel.findOne({ email, isActive: true, role: { $in: [1, 2] } });
    if (!findUser) throw new HttpException(401, `Email Doesnot Exist, Please Sing Up`);

    const isPasswordMatching: boolean = await compare(password, findUser.password);
    if (!isPasswordMatching) throw new HttpException(409, 'Invalid Password');

    const tokenData = await createToken(findUser).token;
    return { findUser, tokenData };
  }

  public async forgotPassword(userData: User): Promise<User> {
    const { email, isActive } = userData;

    const user = await UserModel.findOne({ email, isActive });
    if (!user) throw new HttpException(409, "User doesn't exist");
    const token = await createToken(user).token;
    user.token = token
    console.log('resetToken', token);
    user.resetPasswordTokenExpiresAt = new Date(Date.now() + 3600000);
    await user.save()

    const link = `${FRONT_END_URL}/reset-password/${token}`;
    await sendForgotPasswordEmail(user.email, user.fullName, link);


    await this.notificationService.sendNotification({
      modelName: 'User',
      type: 'User-Forgot-password',
      createdBy: 'User',
      userId: user._id,
      metadata: { email: user.email },
    });


    return user;
  }

  public async verifyuserToken(token: string): Promise<{ findUser: User, tokenData: string }> {
    const findUser: User = await UserModel.findOne({ token: token, isActive: true });
    if (!findUser) throw new HttpException(409, `This token was not valid`);
    const tokenData = await createToken(findUser).token;

    return { findUser, tokenData };
  }

  public async resetPassword(userData: User): Promise<User> {
    const { token, password } = userData;
    const decoded = verifyToken(token);
    const { email } = decoded;
    const user = await UserModel.findOne({ email, isActive: true });
    if (!user) throw new HttpException(409, "User doesn't exist");
    const hashedPassword = await hash(password, 10);
    const updatedUser = await UserModel.findByIdAndUpdate(user._id, { password: hashedPassword });


    await this.notificationService.sendNotification({
      modelName: 'User',
      type: 'User-Reset-password',
      createdBy: 'User',
      userId: user._id,
      metadata: { email: user.email },
    });


    return updatedUser;
  }
}
