import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DATABASE, Database } from '../database/database.module';
@Injectable()
export class UsersRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}
  async list(country?: string, city?: string, page = 1, limit = 50): Promise<unknown> {
    const countryFilter = country ? sql`AND country = ${country}` : sql``;
    const cityFilter = city ? sql`AND city = ${city}` : sql``;
    return this.db.execute(sql`SELECT id, name, email, country, city, created_at FROM users WHERE 1 = 1 ${countryFilter} ${cityFilter}
      ORDER BY created_at DESC LIMIT ${Math.min(limit, 500)} OFFSET ${(Math.max(page, 1) - 1) * Math.min(limit, 500)}`);
  }
  async orders(id: number): Promise<unknown> {
    const result = await this.db.execute(sql`SELECT u.id AS user_id, u.name, o.id AS order_id, o.status, o.total_amount, o.created_at
      FROM users u LEFT JOIN orders o ON o.user_id = u.id WHERE u.id = ${id} ORDER BY o.created_at DESC`);
    if (!result.rows.length) throw new NotFoundException(`User ${id} was not found`);
    return result.rows;
  }
}
