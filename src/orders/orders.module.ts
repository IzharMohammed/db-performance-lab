import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersRepository } from './orders.repository';
@Module({ controllers: [OrdersController], providers: [OrdersRepository], exports: [OrdersRepository] })
export class OrdersModule {}
