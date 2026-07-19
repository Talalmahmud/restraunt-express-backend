import { IsEmail, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { EmployeeRole } from '../../generated/prisma/enums';

export class UpdateEmployeeDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsEnum(EmployeeRole)
  role?: EmployeeRole;

  @IsOptional()
  @IsNumber()
  @Min(0)
  salary?: number;
}
