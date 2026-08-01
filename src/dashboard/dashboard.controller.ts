import { Controller, Get, Inject, Query } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DATABASE, Database } from '../database/database.module';

@Controller('dashboard')
export class DashboardController {
  constructor(@Inject(DATABASE) private readonly db: Database) {}
  @Get('top-products')
  topProducts(@Query('limit') limit = '20'): Promise<unknown> {
    return this.db.execute(sql`SELECT p.id, p.name, COUNT(oi.id) AS times_ordered, SUM(oi.quantity) AS units_sold,
      SUM(oi.quantity * oi.price) AS revenue, AVG(r.rating) AS average_review_rating
      FROM products p LEFT JOIN order_items oi ON oi.product_id = p.id LEFT JOIN reviews r ON r.product_id = p.id
      GROUP BY p.id, p.name HAVING COUNT(oi.id) > 0 ORDER BY revenue DESC NULLS LAST LIMIT ${Math.min(Number(limit), 100)}`);
  }
  @Get('top-categories')
  topCategories(): Promise<unknown> {
    return this.db
      .execute(sql`SELECT c.id, c.name, COUNT(DISTINCT o.id) AS order_count, SUM(oi.quantity * oi.price) AS revenue,
      MIN(p.price) AS cheapest_product, MAX(p.price) AS most_expensive_product, AVG(p.rating) AS average_rating
      FROM categories c JOIN products p ON p.category_id = c.id LEFT JOIN order_items oi ON oi.product_id = p.id
      LEFT JOIN orders o ON o.id = oi.order_id GROUP BY c.id, c.name HAVING COUNT(DISTINCT p.id) > 0 ORDER BY revenue DESC NULLS LAST`);
  }
  @Get('monthly-sales')
  monthlySales(@Query('from') from?: string, @Query('to') to?: string): Promise<unknown> {
    const range = from && to ? sql`WHERE o.created_at BETWEEN ${from}::timestamptz AND ${to}::timestamptz` : sql``;
    return this.db.execute(sql`SELECT date_trunc('month', o.created_at) AS month, COUNT(o.id) AS orders,
      SUM(o.total_amount) AS sales, AVG(o.total_amount) AS average_order_value FROM orders o ${range}
      GROUP BY date_trunc('month', o.created_at) ORDER BY month`);
  }
  @Get('top-customers')
  topCustomers(@Query('countries') countries?: string): Promise<unknown> {
    const countryFilter = countries
      ? sql`WHERE u.country IN (${sql.join(
          countries.split(',').map((country) => sql`${country.trim()}`),
          sql`, `,
        )})`
      : sql``;
    return this.db
      .execute(sql`SELECT u.id, u.name, u.country, COUNT(o.id) AS order_count, SUM(o.total_amount) AS lifetime_value
      FROM users u LEFT JOIN orders o ON o.user_id = u.id ${countryFilter} GROUP BY u.id, u.name, u.country
      HAVING COUNT(o.id) > 0 ORDER BY lifetime_value DESC LIMIT 100`);
  }
  @Get('orders-per-country')
  ordersPerCountry(): Promise<unknown> {
    return this.db.execute(sql`SELECT u.country, COUNT(o.id) AS order_count, COUNT(DISTINCT u.id) AS customer_count,
      SUM(o.total_amount) AS sales FROM users u LEFT JOIN orders o ON o.user_id = u.id GROUP BY u.country ORDER BY order_count DESC`);
  }
}
