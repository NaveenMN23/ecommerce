import { GetOrderHistoryUseCase } from './GetOrderHistoryUseCase';
import { AppStore } from '../../infrastructure/store/AppStore';
import { Order } from '../../domain/entities/Order';
import { AppError } from '../../domain/errors/AppError';

function makeStore(overrides: Partial<AppStore> = {}): AppStore {
  return {
    products: new Map(),
    carts: new Map(),
    orders: new Map(),
    coupons: new Map(),
    orderCount: 0,
    userOrderCounts: new Map(),
    ...overrides,
  };
}

function makeOrder(id: string, userId: string, total: number, placedAt: Date): Order {
  return {
    id,
    userId,
    items: [{ productId: 'p1', name: 'Headphones', price: total, quantity: 1 }],
    subtotal: total,
    discountAmount: 0,
    total,
    status: 'PLACED',
    placedAt,
  };
}

describe('GetOrderHistoryUseCase', () => {
  it('throws 404 when user has no orders', () => {
    const store = makeStore();
    expect(() =>
      new GetOrderHistoryUseCase(store).execute({ userId: 'user1' })
    ).toThrow(AppError);
    expect(() =>
      new GetOrderHistoryUseCase(store).execute({ userId: 'user1' })
    ).toThrow("No orders found for user 'user1'.");
  });

  it('returns only orders belonging to the specified user', () => {
    const o1 = makeOrder('o1', 'user1', 1000, new Date('2024-01-01'));
    const o2 = makeOrder('o2', 'user2', 2000, new Date('2024-01-02'));
    const store = makeStore({ orders: new Map([['o1', o1], ['o2', o2]]) });

    const result = new GetOrderHistoryUseCase(store).execute({ userId: 'user1' });
    expect(result.orders).toHaveLength(1);
    expect(result.orders[0].id).toBe('o1');
  });

  it('returns orders sorted newest-first', () => {
    const older = makeOrder('o1', 'user1', 1000, new Date('2024-01-01'));
    const newer = makeOrder('o2', 'user1', 2000, new Date('2024-06-01'));
    const store = makeStore({ orders: new Map([['o1', older], ['o2', newer]]) });

    const result = new GetOrderHistoryUseCase(store).execute({ userId: 'user1' });
    expect(result.orders[0].id).toBe('o2');
    expect(result.orders[1].id).toBe('o1');
  });

  it('returns correct totalOrders', () => {
    const o1 = makeOrder('o1', 'user1', 1000, new Date('2024-01-01'));
    const o2 = makeOrder('o2', 'user1', 2000, new Date('2024-02-01'));
    const store = makeStore({ orders: new Map([['o1', o1], ['o2', o2]]) });

    const result = new GetOrderHistoryUseCase(store).execute({ userId: 'user1' });
    expect(result.totalOrders).toBe(2);
  });

  it('returns correct totalSpend as sum of order totals', () => {
    const o1 = makeOrder('o1', 'user1', 1500, new Date('2024-01-01'));
    const o2 = makeOrder('o2', 'user1', 2500, new Date('2024-02-01'));
    const store = makeStore({ orders: new Map([['o1', o1], ['o2', o2]]) });

    const result = new GetOrderHistoryUseCase(store).execute({ userId: 'user1' });
    expect(result.totalSpend).toBe(4000);
  });
});
