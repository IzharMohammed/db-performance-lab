import { bigint, integer, numeric, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  name: varchar('name', { length: 200 }).notNull(),
  email: varchar('email', { length: 320 }).notNull().unique(),
  country: varchar('country', { length: 100 }).notNull(),
  city: varchar('city', { length: 100 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const categories = pgTable('categories', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  name: varchar('name', { length: 120 }).notNull(),
});

export const brands = pgTable('brands', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  name: varchar('name', { length: 160 }).notNull(),
});

export const products = pgTable('products', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  name: varchar('name', { length: 300 }).notNull(),
  description: text('description').notNull(),
  brandId: integer('brand_id').notNull().references(() => brands.id),
  categoryId: integer('category_id').notNull().references(() => categories.id),
  price: numeric('price', { precision: 12, scale: 2 }).notNull(),
  stock: integer('stock').notNull(),
  rating: numeric('rating', { precision: 3, scale: 2 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
});

export const orders = pgTable('orders', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  userId: bigint('user_id', { mode: 'number' }).notNull().references(() => users.id),
  status: varchar('status', { length: 30 }).notNull(),
  totalAmount: numeric('total_amount', { precision: 14, scale: 2 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
});

export const orderItems = pgTable('order_items', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  orderId: bigint('order_id', { mode: 'number' }).notNull().references(() => orders.id),
  productId: bigint('product_id', { mode: 'number' }).notNull().references(() => products.id),
  quantity: integer('quantity').notNull(),
  price: numeric('price', { precision: 12, scale: 2 }).notNull(),
});

export const reviews = pgTable('reviews', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  userId: bigint('user_id', { mode: 'number' }).notNull().references(() => users.id),
  productId: bigint('product_id', { mode: 'number' }).notNull().references(() => products.id),
  rating: integer('rating').notNull(),
  comment: text('comment').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
});

export const wishlists = pgTable('wishlists', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  userId: bigint('user_id', { mode: 'number' }).notNull().references(() => users.id),
  productId: bigint('product_id', { mode: 'number' }).notNull().references(() => products.id),
});
