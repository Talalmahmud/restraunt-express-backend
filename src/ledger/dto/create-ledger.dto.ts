import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { LedgerType } from '../../generated/prisma/enums';

export class CreateLedgerDto {
  @IsEnum(LedgerType)
  type: LedgerType;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  employeeId?: string;
}
