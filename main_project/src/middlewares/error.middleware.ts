import { NextFunction, Request, Response } from 'express';
import { HttpException } from '@exceptions/httpException';

export const ErrorMiddleware = (error: HttpException, req: Request, res: Response, next: NextFunction) => {
  try {
    const status: number = error.status || 400;
    const message: string = error.message || 'Something went wrong';
    console.log('Error', error);
    return res.status(status).json({
      status: status,
      message: message,
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
};
