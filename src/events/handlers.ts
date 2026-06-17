import { eventBus } from './EventBus';
import { store } from '../infrastructure/store/InMemoryStore';
import {
  isNthOrder,
  generateCouponCode,
  DISCOUNT_CONFIG,
} from '../domain/rules/DiscountRule';

/**
 * Listens for 'order.placed' and auto-generates a USER_SPECIFIC coupon
 * when the user hits an nth-order milestone.
 *
 * Runs after checkout completes — failure here does NOT roll back the order.
 * This is the fan-out: CheckoutUseCase emits once, any number of handlers react.
 */
export function registerCouponHandler(): void {
  eventBus.on('order.placed', ({ userId, userCount }) => {
    if (!isNthOrder(userCount)) return;

    const code = generateCouponCode();
    store.coupons.set(code, {
      code,
      type: 'USER_SPECIFIC',
      userId,
      discountPercent: DISCOUNT_CONFIG.TIERS.USER_SPECIFIC.discountPercent,
      minOrderAmount: DISCOUNT_CONFIG.TIERS.USER_SPECIFIC.minOrderAmount,
      redeemedBy: [],
      createdAt: new Date(),
    });

    console.log(
      `[CouponHandler] 🎉 Coupon ${code} generated for '${userId}' — order #${userCount} milestone`
    );
  });
}

/**
 * Listens for 'order.placed' and logs order analytics.
 * In production this handler would push to a data warehouse or analytics stream.
 */
export function registerAnalyticsHandler(): void {
  eventBus.on('order.placed', ({ order, userId }) => {
    console.log(
      `[AnalyticsHandler] Order ${order.id} placed by '${userId}' — ` +
      `total: ₹${order.total}, discount: ₹${order.discountAmount}`
    );
  });
}

/** Registers all application-level event handlers. Called once at startup. */
export function registerAllHandlers(): void {
  registerCouponHandler();
  registerAnalyticsHandler();
}
