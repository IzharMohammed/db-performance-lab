import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DATABASE, Database } from '../database/database.module';

@Injectable()
export class OrdersRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async findByUser(userId: number, status?: string, from?: string, to?: string): Promise<unknown> {
    const dateFilter = from && to ? sql`AND o.created_at BETWEEN ${from}::timestamptz AND ${to}::timestamptz` : sql``;
    const statusFilter = status ? sql`AND o.status = ${status}` : sql``;
    return this.db.execute(sql`SELECT o.*, COUNT(oi.id) AS item_count, SUM(oi.quantity) AS units
      FROM orders o LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE o.user_id = ${userId} ${statusFilter} ${dateFilter}
      GROUP BY o.id HAVING SUM(oi.quantity) IS NULL OR SUM(oi.quantity) >= 1
      ORDER BY o.created_at DESC LIMIT 100`);
  }

  async findById(id: number): Promise<unknown> {
    const result = await this.db
      .execute(sql`SELECT o.*, u.name AS user_name, u.email, oi.quantity, oi.price, p.name AS product_name
      FROM orders o JOIN users u ON u.id = o.user_id LEFT JOIN order_items oi ON oi.order_id = o.id
      LEFT JOIN products p ON p.id = oi.product_id WHERE o.id = ${id}`);
    if (!result.rows.length) throw new NotFoundException(`Order ${id} was not found`);
    return result.rows;
  }
}
