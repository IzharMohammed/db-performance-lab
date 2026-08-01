import { Injectable } from '@nestjs/common';
import { ProductFilters, ProductsRepository } from './products.repository';

@Injectable()
export class ProductsService {
  constructor(private readonly repository: ProductsRepository) {}
  list(filters: ProductFilters): Promise<unknown> { return this.repository.list(filters); }
  cursor(filters: ProductFilters, cursor?: number): Promise<unknown> { return this.repository.cursor(filters, cursor); }
  findById(id: number): Promise<unknown> { return this.repository.findById(id); }
}
