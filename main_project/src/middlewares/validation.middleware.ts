import { plainToInstance } from 'class-transformer';
import { validateOrReject, ValidationError } from 'class-validator';
import { NextFunction, Request, Response } from 'express';
import { HttpException } from '@exceptions/httpException';

/**
 * @name ValidationMiddleware
 * @description Allows use of decorator and non-decorator based validation
 * @param type dto
 * @param skipMissingProperties When skipping missing properties
 * @param whitelist Even if your object is an instance of a validation class it can contain additional properties that are not defined
 * @param forbidNonWhitelisted If you would rather to have an error thrown when any non-whitelisted properties are present
 */
export const ValidationMiddleware = (type: any, skipMissingProperties = false, whitelist = false, forbidNonWhitelisted = false) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const dto = plainToInstance(type, req.body);
    validateOrReject(dto, { skipMissingProperties, whitelist, forbidNonWhitelisted })
      .then(() => {
        req.body = dto;
        next();
      })
      .catch((errors: ValidationError[]) => {
        const message = errors.map((error: ValidationError) => Object.values(error.constraints)).join(', ');
        next(new HttpException(400, message));
      });
  };
};


// import { plainToInstance } from "class-transformer";
// import { validateOrReject, ValidationError } from "class-validator";
// import { NextFunction, Request, Response } from "express";
// import { HttpException } from "@exceptions/httpException";

// /**
//  * @name ValidationMiddleware
//  * @description Allows use of decorator and non-decorator based validation
//  * @param type DTO class type for validation
//  * @param skipMissingProperties Whether to skip missing properties
//  * @param whitelist Remove non-whitelisted properties
//  * @param forbidNonWhitelisted Throw an error for non-whitelisted properties
//  */
// export const ValidationMiddleware = (type: any, skipMissingProperties = false, whitelist = false, forbidNonWhitelisted = false) => {
//   return async (req: Request, res: Response, next: NextFunction) => {
//     try {
//       // Transform the request body to an instance of the DTO class
//       const dto = plainToInstance(type, req.body);
//       // Validate the DTO instance
//       await validateOrReject(dto, { skipMissingProperties, whitelist, forbidNonWhitelisted });
//       // If validation passes, assign the DTO back to the request body
//       req.body = dto;
//       next();
//     } catch (errors) {
//       // Collect validation error messages
//       const message = errors instanceof ValidationError
//         ? errors.map((error: ValidationError) => Object.values(error.constraints)).flat().join(", ")
//         : "Validation error occurred.";
//       // Pass the error to the next middleware
//       next(new HttpException(400, message));
//     }
//   };
// };
