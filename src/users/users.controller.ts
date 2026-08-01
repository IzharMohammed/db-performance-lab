import { Controller, Get, Param, Query } from '@nestjs/common';
import { UsersRepository } from './users.repository';
@Controller('users')
export class UsersController {
  constructor(private readonly repository: UsersRepository) {}
  @Get() list(
    @Query('country') country?: string,
    @Query('city') city?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<unknown> {
    return this.repository.list(country, city, Number(page ?? 1), Number(limit ?? 50));
  }
  @Get(':id/orders') orders(@Param('id') id: string): Promise<unknown> {
    return this.repository.orders(Number(id));
  }
}
