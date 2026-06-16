import { Product } from '../../domain/entities/Product';
import { Cart } from '../../domain/entities/Cart';
import { Order } from '../../domain/entities/Order';
import { Coupon } from '../../domain/entities/Coupon';

/**
 * AppStore is the contract every use case depends on — never the concrete impl.
 * Swapping InMemoryStore → RedisStore → PostgresStore = change one file in /infrastructure.
 */
export interface AppStore {
  products: Map<string, Product>;
  carts: Map<string, Cart>;
  orders: Map<string, Order>;
  coupons: Map<string, Coupon>;

  /** Total orders placed store-wide. Used for global stats. */
  orderCount: number;

  /**
   * Per-user order counts — drives USER_SPECIFIC nth-order coupon eligibility.
   * Kept separate from global orderCount so the two triggers stay independent.
   * In production: Redis HINCRBY on a hash keyed by userId.
   */
  userOrderCounts: Map<string, number>;
}
