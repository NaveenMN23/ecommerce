import { AppStore } from '../../infrastructure/store/AppStore';
import { Coupon } from '../../domain/entities/Coupon';
import { Order } from '../../domain/entities/Order';

interface TopProduct {
  productId: string;
  name: string;
  value: number;
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

  execute(): GlobalStatsResult {
    const orders = Array.from(this.store.orders.values());
    const base = this.aggregateBase(orders);

    const unitsSold = new Map<string, { name: string; units: number; revenue: number }>();
    for (const order of orders) {
      for (const item of order.items) {
        const entry = unitsSold.get(item.productId) ?? { name: item.name, units: 0, revenue: 0 };
        entry.units += item.quantity;
        entry.revenue += item.price * item.quantity;
        unitsSold.set(item.productId, entry);
      }
    }

    return {
      ...base,
      topSellingProduct: this.findTopBy(unitsSold, 'units'),
      topRevenueProduct: this.findTopBy(unitsSold, 'revenue'),
      coupons: Array.from(this.store.coupons.values()),
    };
  }

  executeForUser(userId: string): UserStatsResult {
    const userOrders = Array.from(this.store.orders.values()).filter(
      (o) => o.userId === userId
    );
    const userCoupons = Array.from(this.store.coupons.values()).filter(
      (c) => c.userId === userId || c.type === 'GLOBAL'
    );
    const base = this.aggregateBase(userOrders);

    const unitsByProduct = new Map<string, { name: string; units: number; revenue: number }>();
    for (const order of userOrders) {
      for (const item of order.items) {
        const entry = unitsByProduct.get(item.productId) ?? { name: item.name, units: 0, revenue: 0 };
        entry.units += item.quantity;
        entry.revenue += item.price * item.quantity;
        unitsByProduct.set(item.productId, entry);
      }
    }

    return {
      ...base,
      favoriteProduct: this.findTopBy(unitsByProduct, 'units'),
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
      totalRevenue: this.roundMoney(totalRevenue),
      totalDiscountGiven: this.roundMoney(totalDiscountGiven),
    };
  }

  private findTopBy(
    map: Map<string, { name: string; units: number; revenue: number }>,
    key: 'units' | 'revenue'
  ): TopProduct | null {
    let top: TopProduct | null = null;
    for (const [productId, data] of map) {
      const value = this.roundMoney(data[key]);
      if (!top || value > top.value) {
        top = { productId, name: data.name, value };
      }
    }
    return top;
  }

  private roundMoney(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
