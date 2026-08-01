import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { sql, SQL } from 'drizzle-orm';
import { DATABASE, Database } from '../database/database.module';

export interface ProductFilters {
  page?: number; limit?: number; category?: number; brand?: number; minPrice?: number; maxPrice?: number;
  minRating?: number; maxRating?: number; createdFrom?: string; createdTo?: string; search?: string;
  sortBy?: 'name' | 'price' | 'rating' | 'created_at' | 'stock'; sortOrder?: 'asc' | 'desc';
}

@Injectable()
export class ProductsRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  buildListQuery(filters: ProductFilters, cursor?: number): SQL {
    const conditions: SQL[] = [];
    if (filters.category) conditions.push(sql`p.category_id = ${filters.category}`);
    if (filters.brand) conditions.push(sql`p.brand_id = ${filters.brand}`);
    if (filters.minPrice !== undefined && filters.maxPrice !== undefined) conditions.push(sql`p.price BETWEEN ${filters.minPrice} AND ${filters.maxPrice}`);
    else if (filters.minPrice !== undefined) conditions.push(sql`p.price >= ${filters.minPrice}`);
    else if (filters.maxPrice !== undefined) conditions.push(sql`p.price <= ${filters.maxPrice}`);
    if (filters.minRating !== undefined) conditions.push(sql`p.rating >= ${filters.minRating}`);
    if (filters.maxRating !== undefined) conditions.push(sql`p.rating <= ${filters.maxRating}`);
    if (filters.createdFrom && filters.createdTo) conditions.push(sql`p.created_at BETWEEN ${filters.createdFrom}::timestamptz AND ${filters.createdTo}::timestamptz`);
    else if (filters.createdFrom) conditions.push(sql`p.created_at >= ${filters.createdFrom}::timestamptz`);
    else if (filters.createdTo) conditions.push(sql`p.created_at <= ${filters.createdTo}::timestamptz`);
    if (filters.search) conditions.push(sql`(p.name ILIKE ${`%${filters.search}%`} OR p.description LIKE ${`%${filters.search}%`})`);
    if (cursor) conditions.push(sql`p.id > ${cursor}`);

    const where = conditions.length ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``;
    const sortColumns = { name: sql`p.name`, price: sql`p.price`, rating: sql`p.rating`, created_at: sql`p.created_at`, stock: sql`p.stock` };
    const sortBy = sortColumns[filters.sortBy ?? 'created_at'];
    const direction = filters.sortOrder === 'asc' ? sql`ASC` : sql`DESC`;
    const limit = Math.min(Math.max(filters.limit ?? 50, 1), 500);
    const offset = ((Math.max(filters.page ?? 1, 1) - 1) * limit);
    return sql`SELECT p.id, p.name, p.description, p.price, p.stock, p.rating, p.created_at,
      b.name AS brand_name, c.name AS category_name
      FROM products p
      JOIN brands b ON b.id = p.brand_id
      JOIN categories c ON c.id = p.category_id
      ${where} ORDER BY ${sortBy} ${direction}, p.id ${direction} LIMIT ${limit}${cursor ? sql`` : sql` OFFSET ${offset}`}`;
  }

  async list(filters: ProductFilters): Promise<unknown> {
    return this.db.execute(this.buildListQuery(filters));
  }

  async cursor(filters: ProductFilters, cursor?: number): Promise<unknown> {
    return this.db.execute(this.buildListQuery({ ...filters, sortBy: 'created_at', sortOrder: 'asc' }, cursor));
  }

  async findById(id: number): Promise<unknown> {
    const result = await this.db.execute(sql`SELECT p.*, b.name AS brand_name, c.name AS category_name
      FROM products p JOIN brands b ON b.id = p.brand_id JOIN categories c ON c.id = p.category_id WHERE p.id = ${id}`);
    if (result.rows.length === 0) throw new NotFoundException(`Product ${id} was not found`);
    return result.rows[0];
  }
}
