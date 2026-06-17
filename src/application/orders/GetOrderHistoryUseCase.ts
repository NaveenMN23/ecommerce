import { AppStore } from '../../infrastructure/store/AppStore';
import { Order } from '../../domain/entities/Order';
import { AppError } from '../../domain/errors/AppError';

interface GetOrderHistoryInput {
  userId: string;
}

export interface OrderHistoryResult {
  orders: Order[];
  totalOrders: number;
  totalSpend: number;
}

export class GetOrderHistoryUseCase {
  constructor(private readonly store: AppStore) {}

  execute({ userId }: GetOrderHistoryInput): OrderHistoryResult {
    const orders = Array.from(this.store.orders.values())
      .filter(o => o.userId === userId)
      .sort((a, b) => b.placedAt.getTime() - a.placedAt.getTime());

    if (orders.length === 0) {
      throw new AppError(`No orders found for user '${userId}'.`, 404);
    }

    return {
      orders,
      totalOrders: orders.length,
      totalSpend: orders.reduce((sum, o) => sum + o.total, 0),
    };
  }
}
