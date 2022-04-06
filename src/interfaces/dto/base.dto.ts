import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PageOptionsDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  readonly pageIndex?: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(50)
  @IsOptional()
  readonly pageSize?: number = 10;

  get skip(): number {
    return (this.pageIndex - 1) * this.pageSize;
  }
}
