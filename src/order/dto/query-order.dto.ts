import { Transform } from 'class-transformer';
import { IsDateString, IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { OrderStatus } from '../../generated/prisma/enums';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

const emptyToUndefined = ({ value }: { value: unknown }) => (value === '' ? undefined : value);

/** Order list filters; every field is optional and they combine. */
export class QueryOrderDto extends PaginationQueryDto {
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  /** Payment state; UNPAID means the order has no payment yet. */
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsIn(['UNPAID', 'PENDING', 'PAID', 'FAILED', 'REFUNDED'])
  payment?: 'UNPAID' | 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

  /** Matches the order number or the customer's name or phone. */
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  tableId?: string;

  /** Inclusive day range, YYYY-MM-DD. */
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsDateString()
  from?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsDateString()
  to?: string;
}
