import { Controller, Get, Inject, Query } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DATABASE, Database } from '../database/database.module';
import { ProductFilters, ProductsRepository } from '../products/products.repository';

@Controller('explain')
export class ExplainController {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly products: ProductsRepository,
  ) {}

  @Get('products')
  async productsPlan(@Query() query: Record<string, string>): Promise<unknown> {
    const filters: ProductFilters = {
      page: Number(query.page ?? 1),
      limit: Number(query.limit ?? 50),
      search: query.q,
      category: query.category ? Number(query.category) : undefined,
      brand: query.brand ? Number(query.brand) : undefined,
      minPrice: query.minPrice ? Number(query.minPrice) : undefined,
      maxPrice: query.maxPrice ? Number(query.maxPrice) : undefined,
      sortBy: query.sortBy as ProductFilters['sortBy'],
      sortOrder: query.sortOrder as ProductFilters['sortOrder'],
    };
    const generated = this.products.buildListQuery(filters);
    return this.db.execute(sql`EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT JSON) ${generated}`);
  }
}
