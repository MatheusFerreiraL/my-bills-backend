import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { UserIdGuard } from './common/guards/user-id.guard';
import { DatabaseModule } from './infra/database/database.module';
import { AccountsModule } from './modules/accounts/accounts.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { CreditCardsModule } from './modules/credit-cards/credit-cards.module';
import { BudgetsModule } from './modules/budgets/budgets.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ImportModule } from './modules/import/import.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AccountsModule,
    TransactionsModule,
    CreditCardsModule,
    BudgetsModule,
    CategoriesModule,
    ImportModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: UserIdGuard }],
})
export class AppModule {}
