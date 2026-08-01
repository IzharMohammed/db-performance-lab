import { Module } from '@nestjs/common';
import { ProductsModule } from '../products/products.module';
import { ExplainController } from './explain.controller';
@Module({ imports: [ProductsModule], controllers: [ExplainController] })
export class ExplainModule {}
