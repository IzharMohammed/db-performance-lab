import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export const DATABASE = Symbol('DATABASE');
export type Database = NodePgDatabase<typeof schema>;

@Global()
@Module({
  imports: [ConfigModule],
  providers: [{
    provide: DATABASE,
    inject: [ConfigService],
    useFactory: (config: ConfigService): Database => {
      const connectionString = config.getOrThrow<string>('DATABASE_URL');
      return drizzle(new Pool({ connectionString, max: 20 }), { schema });
    },
  }],
  exports: [DATABASE],
})
export class DatabaseModule {}
