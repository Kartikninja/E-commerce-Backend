import { IsString, IsNumber, IsArray, IsOptional, IsBoolean, Min, MaxLength, MinLength, IsNotEmpty } from "class-validator";

export class CreateSubscriptionDto {
    @IsString()
    @IsNotEmpty()
    @MinLength(3, {
        message: "Name must be at least 3 characters long",
    })
    @MaxLength(50, {
        message: "Name must not exceed 50 characters",
    })
    public name: string;

    @IsNumber()
    @Min(1)
    @IsNotEmpty({
        message: "Type is required and must be 1 (FREE), 2 (MONTHLY), or 3 (YEARLY)",
    })
    public type: number;

    @IsNumber()
    @Min(0, {
        message: "Price must be a non-negative value",
    })
    public price: number;

    @IsArray()
    @IsOptional()
    @IsString({ each: true })
    public benefite?: string[];

    @IsBoolean()
    @IsOptional()
    public isMonthly?: boolean;

    @IsBoolean()
    @IsOptional()
    public isYearly?: boolean;

    @IsBoolean()
    @IsOptional()
    public isDaily?: boolean;
    @IsNumber()
    @Min(1)
    @IsNotEmpty({
        message: "Duration is required and must be at least 1",
    })
    public duration: number;

    @IsBoolean()
    @IsOptional()
    public isActive?: boolean;

    @IsBoolean()
    @IsOptional()
    public isAutoRenew?: boolean;
}
