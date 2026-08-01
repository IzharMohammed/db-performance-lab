import { Controller, Get, Param, Query, Inject } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DATABASE, Database } from '../database/database.module';
@Controller('reviews')
export class ReviewsController {
  constructor(@Inject(DATABASE) private readonly db: Database) {}
  @Get('product/:id')
  findForProduct(@Param('id') id: string, @Query('minRating') minRating?: string): Promise<unknown> {
    const ratingFilter = minRating ? sql`AND r.rating >= ${Number(minRating)}` : sql``;
    return this.db.execute(sql`SELECT r.*, u.name AS user_name FROM reviews r JOIN users u ON u.id = r.user_id
      WHERE r.product_id = ${Number(id)} ${ratingFilter} ORDER BY r.created_at DESC LIMIT 100`);
  }
}
