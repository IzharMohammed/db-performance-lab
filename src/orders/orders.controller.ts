import { Controller, Get, Param, Query } from '@nestjs/common';
import { OrdersRepository } from './orders.repository';
@Controller('orders')
export class OrdersController {
  constructor(private readonly repository: OrdersRepository) {}
  @Get(':id') byId(@Param('id') id: string): Promise<unknown> { return this.repository.findById(Number(id)); }
  @Get('user/:userId') byUser(@Param('userId') userId: string, @Query('status') status?: string, @Query('from') from?: string, @Query('to') to?: string): Promise<unknown> { return this.repository.findByUser(Number(userId), status, from, to); }
}
