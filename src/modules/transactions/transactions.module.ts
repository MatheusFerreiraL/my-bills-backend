import { Module } from '@nestjs/common';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';

// Transactions, installments, and recurring fixed expenses (AD-5). See transactions-and-recurrence.md.
// Installments/recurrence/import-batch linkage are out of scope for the current CRUD — see that doc.
@Module({
  controllers: [TransactionsController],
  providers: [TransactionsService],
})
export class TransactionsModule {}
