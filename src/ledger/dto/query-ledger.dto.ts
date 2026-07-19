import { IsEnum, IsOptional } from 'class-validator';
import { LedgerType } from '../../generated/prisma/enums';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class QueryLedgerDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(LedgerType)
  type?: LedgerType;
}
