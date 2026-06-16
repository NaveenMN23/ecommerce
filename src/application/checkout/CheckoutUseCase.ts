import { randomUUID } from 'crypto';
import { AppStore } from '../../infrastructure/store/AppStore';
import { Order } from '../../domain/entities/Order';
import {
  AppError,
  CartNotFoundError,
  CartEmptyError,
  CouponNotFoundError,
  CouponAlreadyUsedError,
  InsufficientStockError,
} from '../../domain/errors/AppError';
import {
  calculateDiscount,
  applyDiscount,
  nextCouponAt,
} from '../../domain/rules/DiscountRule';

interface CheckoutInput {
  userId: string;
  couponCode?: string;
}

export interface CheckoutResult {
  order: Order;
  /**
   * How many orders until this user earns their next USER_SPECIFIC coupon.
   * Pure math — no side effect. Useful for a frontend "X more orders to your reward" nudge.
   */
  nextCouponAt: number;
}

export class CheckoutUseCase {
  constructor(private readonly store: AppStore) {}

  execute(input: CheckoutInput): CheckoutResult {
    const { userId, couponCode } = input;

    // 1. Load and validate cart
    const cart = this.store.carts.get(userId);
    if (!cart) throw new CartNotFoundError(userId);
    if (cart.items.length === 0) throw new CartEmptyError();

    // 2. Re-validate stock for every item — cart can be stale
    for (const item of cart.items) {
      const product = this.store.products.get(item.productId);
      if (!product || product.stock < item.quantity) {
        const available = product?.stock ?? 0;
        throw new InsufficientStockError(item.name, item.quantity, available);
      }
    }

    // 3. Calculate subtotal from cart price snapshots (not live catalog prices)
    const subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // 4. Validate and apply coupon if provided
    let discountAmount = 0;
    let appliedCouponCode: string | undefined;

    if (couponCode) {
      const coupon = this.store.coupons.get(couponCode);
      if (!coupon) throw new CouponNotFoundError(couponCode);
      if (coupon.isUsed) throw new CouponAlreadyUsedError(couponCode);

      // USER_SPECIFIC coupons are bound to the user who earned them
      if (coupon.type === 'USER_SPECIFIC' && coupon.userId !== userId) {
        throw new AppError('This coupon is not valid for your account.', 403);
      }

      if (subtotal < coupon.minOrderAmount) {
        throw new AppError(
          `Minimum order amount for this coupon is ₹${coupon.minOrderAmount}. Your cart total is ₹${subtotal}.`,
          400
        );
      }

      discountAmount = calculateDiscount(subtotal, coupon.discountPercent);
      appliedCouponCode = couponCode;

      // Mark coupon consumed — in production this is an atomic CAS to prevent double-spend
      coupon.isUsed = true;
      coupon.usedAt = new Date();
      this.store.coupons.set(couponCode, coupon);
    }

    const total = applyDiscount(subtotal, discountAmount);

    // 5. Deduct stock — only after all validations pass (all-or-nothing)
    for (const item of cart.items) {
      const product = this.store.products.get(item.productId)!;
      product.stock -= item.quantity;
      this.store.products.set(item.productId, product);
    }

    // 6. Create and persist the order
    const order: Order = {
      id: randomUUID(),
      userId,
      items: [...cart.items],
      subtotal,
      discountCode: appliedCouponCode,
      discountAmount,
      total,
      status: 'PLACED',
      placedAt: new Date(),
    };
    this.store.orders.set(order.id, order);

    // 7. Update counters — global and per-user
    this.store.orderCount += 1;
    const userCount = (this.store.userOrderCounts.get(userId) ?? 0) + 1;
    this.store.userOrderCounts.set(userId, userCount);

    // 8. Clear cart
    this.store.carts.delete(userId);

    // Post-order side effects (coupon generation, stats) are handled by
    // EventBus listeners on the 'order.placed' event — not here.
    // CheckoutUseCase responsibility ends at placing the order.

    return {
      order,
      nextCouponAt: nextCouponAt(userCount),
    };
  }
}
