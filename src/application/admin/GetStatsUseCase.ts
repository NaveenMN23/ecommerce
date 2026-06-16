import { AppStore } from '../../infrastructure/store/AppStore';
import { Coupon } from '../../domain/entities/Coupon';
import { Order } from '../../domain/entities/Order';

interface StatsResult {
  totalOrders: number;
  totalItemsPurchased: number;
  totalRevenue: number;
  totalDiscountGiven: number;
  coupons: Coupon[];
}

export class GetStatsUseCase {
  constructor(private readonly store: AppStore) {}

  /** Overall store-wide stats */
  execute(): StatsResult {
    return this.aggregate(Array.from(this.store.orders.values()));
  }

  /** Stats scoped to a single user */
  executeForUser(userId: string): StatsResult {
    const userOrders = Array.from(this.store.orders.values()).filter(
      (o) => o.userId === userId
    );
    const userCoupons = Array.from(this.store.coupons.values()).filter(
      (c) => c.userId === userId || c.type === 'GLOBAL'
    );

    return this.aggregate(userOrders, userCoupons);
  }

  private aggregate(orders: Order[], coupons?: Coupon[]): StatsResult {
    let totalItemsPurchased = 0;
    let totalRevenue = 0;
    let totalDiscountGiven = 0;

    for (const order of orders) {
      totalItemsPurchased += order.items.reduce((sum, item) => sum + item.quantity, 0);
      totalRevenue += order.total;
      totalDiscountGiven += order.discountAmount;
    }

    return {
      totalOrders: orders.length,
      totalItemsPurchased,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalDiscountGiven: Math.round(totalDiscountGiven * 100) / 100,
      coupons: coupons ?? Array.from(this.store.coupons.values()),
    };
  }
}
