import { Transform } from "class-transformer";
import { IsString, IsBoolean, IsDate, IsNotEmpty, IsOptional, IsNumber } from "class-validator";

export class CreateUserSubscriptionDto {

    @Transform(({ value }) => new Date(value), { toClassOnly: true })
    @IsNotEmpty()
    @IsOptional()
    public startDate: Date;


    @IsBoolean()
    @IsOptional()
    public isAutoRenew?: boolean;

    @IsBoolean()
    @IsOptional()
    public isCustomDuration?: boolean;

    @IsNumber()
    @IsOptional()
    public customDuration?: number;

    @IsNumber()
    @IsOptional()
    @IsNotEmpty()
    public duration: number;
}
