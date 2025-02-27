import { IsEmail, IsString, IsNotEmpty, MinLength, MaxLength } from "class-validator";

export class CreateUserDto {
    @IsEmail()
    public email: string;

    @IsNotEmpty()
    public fullname: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(8, {
        message: "Password must be longer than or equal to 8 characters",
    })
    @MaxLength(32)
    public password: string;
}

export class LoginUserDto {
    @IsEmail()
    public email: string;
    @IsString()
    @IsNotEmpty()
    @MinLength(8, {
      message: "Password must be longer than or equal to 8 characters",
    })
    @MaxLength(32)
    public password: string;
  }