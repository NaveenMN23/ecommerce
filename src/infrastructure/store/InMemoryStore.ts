import { AppStore } from './AppStore';
import { Product } from '../../domain/entities/Product';
import { Cart } from '../../domain/entities/Cart';
import { Order } from '../../domain/entities/Order';
import { Coupon } from '../../domain/entities/Coupon';
import { PRODUCT_CATALOG } from '../../domain/entities/Product';

/**
 * Singleton in-memory store.
 *
 * Singleton: all use cases share the same instance — mutations in one use case
 * are immediately visible to the next, which is the expected behaviour for an
 * in-memory system. In production, this role is filled by a shared Redis cluster
 * or a connection-pooled Postgres; the AppStore interface makes that swap trivial.
 */
class InMemoryStore implements AppStore {
  products: Map<string, Product>;
  carts: Map<string, Cart>;
  orders: Map<string, Order>;
  coupons: Map<string, Coupon>;
  orderCount: number;
  userOrderCounts: Map<string, number>;

  constructor() {
    // Seed the product catalog so the API works out of the box without a setup step
    this.products = new Map(PRODUCT_CATALOG);
    this.carts = new Map();
    this.orders = new Map();
    this.coupons = new Map();
    this.orderCount = 0;
    this.userOrderCounts = new Map();
  }
}

// Single shared instance — exported as the interface type so callers
// cannot access implementation details beyond the contract.
export const store: AppStore = new InMemoryStore();
