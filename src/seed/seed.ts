import { faker } from '@faker-js/faker';
import { Pool } from 'pg';

type SeedScale = 'full' | 'small';
type SeedTargets = Record<'users' | 'categories' | 'brands' | 'products' | 'orders' | 'orderItems' | 'reviews' | 'wishlists', number>;

const FULL: SeedTargets = { users: 100_000, categories: 100, brands: 500, products: 1_000_000, orders: 5_000_000, orderItems: 20_000_000, reviews: 3_000_000, wishlists: 2_000_000 };
const SMALL: SeedTargets = { users: 1_000, categories: 20, brands: 50, products: 10_000, orders: 50_000, orderItems: 200_000, reviews: 30_000, wishlists: 20_000 };
const BATCH_SIZE = Number(process.env.SEED_BATCH_SIZE ?? 5_000);
const statuses = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'];

function targetScale(): SeedScale { return process.argv.includes('--scale=small') ? 'small' : 'full'; }
function randomDate(): Date { return faker.date.between({ from: '2021-01-01T00:00:00.000Z', to: new Date() }); }
function money(min: number, max: number): string { return faker.number.float({ min, max, fractionDigits: 2 }).toFixed(2); }
function placeholders(rows: unknown[][]): { text: string; values: unknown[] } {
  const values = rows.flat();
  const text = rows.map((row, rowIndex) => `(${row.map((_, columnIndex) => `$${rowIndex * row.length + columnIndex + 1}`).join(', ')})`).join(', ');
  return { text, values };
}
async function insertBatches(pool: Pool, table: string, columns: string[], count: number, row: (index: number) => unknown[]): Promise<void> {
  for (let start = 1; start <= count; start += BATCH_SIZE) {
    const end = Math.min(start + BATCH_SIZE - 1, count);
    const rows: unknown[][] = [];
    for (let index = start; index <= end; index++) rows.push(row(index));
    const query = placeholders(rows);
    await pool.query(`INSERT INTO ${table} (${columns.join(', ')}) VALUES ${query.text}`, query.values);
    if (end === count || end % (BATCH_SIZE * 20) === 0) console.log(`${table}: ${end.toLocaleString()}/${count.toLocaleString()}`);
  }
}

async function seed(): Promise<void> {
  const targets = targetScale() === 'small' ? SMALL : FULL;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/performance_lab' });
  console.log(`Seeding ${targetScale()} dataset (${Object.values(targets).reduce((total, count) => total + count, 0).toLocaleString()} rows).`);
  try {
    await insertBatches(pool, 'categories', ['name'], targets.categories, () => [faker.commerce.department()]);
    await insertBatches(pool, 'brands', ['name'], targets.brands, () => [faker.company.name()]);
    await insertBatches(pool, 'users', ['name', 'email', 'country', 'city', 'created_at'], (targets.users), (index) => {
      const country = faker.location.country(); return [faker.person.fullName(), `user-${index}@performance-lab.test`, country, faker.location.city(), randomDate()];
    });
    await insertBatches(pool, 'products', ['name', 'description', 'brand_id', 'category_id', 'price', 'stock', 'rating', 'created_at'], targets.products, () => [
      faker.commerce.productName(), faker.commerce.productDescription(), faker.number.int({ min: 1, max: targets.brands }), faker.number.int({ min: 1, max: targets.categories }), money(2, 2_000), faker.number.int({ min: 0, max: 1_000 }), money(1, 5), randomDate(),
    ]);
    await insertBatches(pool, 'orders', ['user_id', 'status', 'total_amount', 'created_at'], targets.orders, () => [
      faker.number.int({ min: 1, max: targets.users }), faker.helpers.arrayElement(statuses), money(10, 10_000), randomDate(),
    ]);
    await insertBatches(pool, 'order_items', ['order_id', 'product_id', 'quantity', 'price'], targets.orderItems, (index) => [
      Math.min(Math.ceil(index / 4), targets.orders), faker.number.int({ min: 1, max: targets.products }), faker.number.int({ min: 1, max: 5 }), money(2, 2_000),
    ]);
    await insertBatches(pool, 'reviews', ['user_id', 'product_id', 'rating', 'comment', 'created_at'], targets.reviews, () => [
      faker.number.int({ min: 1, max: targets.users }), faker.number.int({ min: 1, max: targets.products }), faker.number.int({ min: 1, max: 5 }), faker.lorem.sentences({ min: 1, max: 3 }), randomDate(),
    ]);
    await insertBatches(pool, 'wishlists', ['user_id', 'product_id'], targets.wishlists, () => [
      faker.number.int({ min: 1, max: targets.users }), faker.number.int({ min: 1, max: targets.products }),
    ]);
  } finally { await pool.end(); }
}
void seed().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
