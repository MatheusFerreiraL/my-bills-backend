import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { transactionStatusEnum, transactionTypeEnum } from '../transaction.schema';

const TRANSACTION_TYPES = transactionTypeEnum.enumValues;
const TRANSACTION_STATUSES = transactionStatusEnum.enumValues;

export class CreateTransactionDto {
  @ApiProperty({ enum: TRANSACTION_TYPES, example: 'expense' })
  @IsIn(TRANSACTION_TYPES)
  type!: (typeof TRANSACTION_TYPES)[number];

  @ApiProperty({ enum: TRANSACTION_STATUSES, example: 'pending' })
  @IsIn(TRANSACTION_STATUSES)
  status!: (typeof TRANSACTION_STATUSES)[number];

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  accountId!: string;

  @ApiProperty({ format: 'uuid', required: false, nullable: true })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiProperty({ example: '2026-08-08', description: 'Date-only ISO string (YYYY-MM-DD)' })
  @IsDateString({ strict: true }, { message: 'date must be a date-only ISO string (YYYY-MM-DD)' })
  date!: string;

  @ApiProperty({ example: 4200, description: 'Positive integer, minor units (AD-4)' })
  @IsInt()
  @IsPositive()
  amountMinor!: number;

  @ApiProperty({ maxLength: 255, required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  isIgnored?: boolean;

  @ApiProperty({ type: [String], format: 'uuid', required: false })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  tagIds?: string[];
}
