import { CartItem } from './Cart';

// All three states defined even though only PLACED is used in this exercise.
// Signals state-machine thinking: a future /orders/:id/status endpoint slots in
// without touching the domain.
export type OrderStatus = 'PLACED' | 'CANCELLED' | 'COMPLETED';

export interface Order {
  id: string;
  userId: string;
  items: CartItem[];
  subtotal: number;
  discountCode?: string;
  discountAmount: number; // 0 when no coupon applied
  total: number;
  status: OrderStatus;
  placedAt: Date;
}
