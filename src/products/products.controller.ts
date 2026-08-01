import { Controller, Get, Param, Query } from '@nestjs/common';
import { ProductFilters, ProductsRepository } from './products.repository';
import { ProductsService } from './products.service';

const numberOrUndefined = (value?: string): number | undefined => value === undefined ? undefined : Number(value);
const filtersFromQuery = (query: Record<string, string>): ProductFilters => ({
  page: numberOrUndefined(query.page), limit: numberOrUndefined(query.limit), category: numberOrUndefined(query.category), brand: numberOrUndefined(query.brand),
  minPrice: numberOrUndefined(query.minPrice), maxPrice: numberOrUndefined(query.maxPrice), minRating: numberOrUndefined(query.minRating), maxRating: numberOrUndefined(query.maxRating),
  createdFrom: query.createdFrom, createdTo: query.createdTo, search: query.q, sortBy: query.sortBy as ProductFilters['sortBy'], sortOrder: query.sortOrder as ProductFilters['sortOrder'],
});

@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}
  @Get() list(@Query() query: Record<string, string>): Promise<unknown> { return this.products.list(filtersFromQuery(query)); }
  @Get('search') search(@Query() query: Record<string, string>): Promise<unknown> { return this.products.list(filtersFromQuery(query)); }
  @Get('cursor') cursor(@Query() query: Record<string, string>): Promise<unknown> { return this.products.cursor(filtersFromQuery(query), numberOrUndefined(query.cursor)); }
  @Get(':id') findOne(@Param('id') id: string): Promise<unknown> { return this.products.findById(Number(id)); }
}
