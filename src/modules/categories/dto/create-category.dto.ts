import { ApiProperty } from '@nestjs/swagger';
import { IsHexColor, IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { CATEGORY_TYPES } from '../category.schema';

export class CreateCategoryDto {
  @ApiProperty({ maxLength: 255, example: 'Groceries' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiProperty({ maxLength: 255, example: 'shopping-cart', description: 'Icon slug, frontend-interpreted' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  icon!: string;

  @ApiProperty({ example: '#22C55E', description: 'Hex color, "#RGB" or "#RRGGBB"' })
  @IsHexColor()
  color!: string;

  @ApiProperty({ enum: CATEGORY_TYPES, example: 'expense' })
  @IsIn(CATEGORY_TYPES)
  type!: (typeof CATEGORY_TYPES)[number];
}
