import { Controller, DefaultValuePipe, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { UsersRepository } from './users.repository';
@Controller('users')
export class UsersController {
  constructor(private readonly repository: UsersRepository) {}

@Get()
list(
  @Query('country') country?: string,
  @Query('city') city?: string,
  @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
  @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
) {
  return this.repository.list(country, city, page, limit);
}

  @Get(':id/orders') orders(@Param('id') id: string): Promise<unknown> {
    return this.repository.orders(Number(id));
  }
}
