import { Transform } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString, Min } from 'class-validator';

function parseFacilityIds(value: unknown): unknown {
  if (value === undefined || value === '') return undefined;
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return value;
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export class ListRoomsDto {
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  minCapacity?: number;

  @IsOptional()
  @Transform(({ value }) => parseFacilityIds(value))
  @IsArray()
  @IsString({ each: true })
  facilityIds?: string[];
}
