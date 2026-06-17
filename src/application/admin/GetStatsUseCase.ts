import { AppStore } from '../../infrastructure/store/AppStore';
import { Coupon } from '../../domain/entities/Coupon';
import { Order } from '../../domain/entities/Order';

interface TopProduct {
  productId: string;
  name: string;
  value: number; // unitsSold or revenue depending on context
}

interface GlobalStatsResult {
  totalOrders: number;
  totalItemsPurchased: number;
  totalRevenue: number;
  totalDiscountGiven: number;
  topSellingProduct: TopProduct | null;
  topRevenueProduct: TopProduct | null;
  coupons: Coupon[];
}

interface UserStatsResult {
  totalOrders: number;
  totalItemsPurchased: number;
  totalRevenue: number;
  totalDiscountGiven: number;
  favoriteProduct: TopProduct | null;
  orders: Order[];
  coupons: Coupon[];
}

export class GetStatsUseCase {
  constructor(private readonly store: AppStore) {}

  /** Overall store-wide stats */
  execute(): GlobalStatsResult {
    const orders = Array.from(this.store.orders.values());
    const base = this.aggregateBase(orders);

    // Tally units sold and revenue per product across all orders
    const unitsSold = new Map<string, { name: string; units: number; revenue: number }>();
    for (const order of orders) {
      for (const item of order.items) {
        const existing = unitsSold.get(item.productId) ?? { name: item.name, units: 0, revenue: 0 };
        existing.units += item.quantity;
        existing.revenue += item.price * item.quantity;
        unitsSold.set(item.productId, existing);
      }
    }

    let topSelling: TopProduct | null = null;
    let topRevenue: TopProduct | null = null;

    for (const [productId, data] of unitsSold) {
      if (!topSelling || data.units > topSelling.value) {
        topSelling = { productId, name: data.name, value: data.units };
      }
      if (!topRevenue || data.revenue > topRevenue.value) {
        topRevenue = { productId, name: data.name, value: Math.round(data.revenue * 100) / 100 };
      }
    }

    return {
      ...base,
      topSellingProduct: topSelling,
      topRevenueProduct: topRevenue,
      coupons: Array.from(this.store.coupons.values()),
    };
  }

  /** Stats scoped to a single user */
  executeForUser(userId: string): UserStatsResult {
    const userOrders = Array.from(this.store.orders.values()).filter(
      (o) => o.userId === userId
    );
    const userCoupons = Array.from(this.store.coupons.values()).filter(
      (c) => c.userId === userId || c.type === 'GLOBAL'
    );
    const base = this.aggregateBase(userOrders);

    // Find this user's most purchased product
    const unitsByProduct = new Map<string, { name: string; units: number }>();
    for (const order of userOrders) {
      for (const item of order.items) {
        const existing = unitsByProduct.get(item.productId) ?? { name: item.name, units: 0 };
        existing.units += item.quantity;
        unitsByProduct.set(item.productId, existing);
      }
    }

    let favorite: TopProduct | null = null;
    for (const [productId, data] of unitsByProduct) {
      if (!favorite || data.units > favorite.value) {
        favorite = { productId, name: data.name, value: data.units };
      }
    }

    return {
      ...base,
      favoriteProduct: favorite,
      orders: userOrders,
      coupons: userCoupons,
    };
  }

  private aggregateBase(orders: Order[]) {
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
    };
  }
}
