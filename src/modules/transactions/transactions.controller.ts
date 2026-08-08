import { Body, Controller, Delete, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiUserIdHeader } from '../../common/decorators/api-user-id-header.decorator';
import { UserId } from '../../common/decorators/user-id.decorator';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

@ApiTags('transactions')
@ApiUserIdHeader()
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  create(@UserId() userId: string, @Body() dto: CreateTransactionDto) {
    return this.transactionsService.create(userId, dto);
  }

  @Patch(':id')
  update(@UserId() userId: string, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTransactionDto) {
    return this.transactionsService.update(userId, id, dto);
  }

  @Patch(':id/status')
  toggleStatus(@UserId() userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.transactionsService.toggleStatus(userId, id);
  }

  @Delete(':id')
  remove(@UserId() userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.transactionsService.remove(userId, id);
  }
}
