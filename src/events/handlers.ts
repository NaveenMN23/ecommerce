import { eventBus } from './EventBus';
import { store } from '../infrastructure/store/InMemoryStore';
import { isNthOrder } from '../domain/rules/DiscountRule';
import { GenerateCouponUseCase } from '../application/admin/GenerateCouponUseCase';
import { logger } from '../utils/logger';

/**
 * Listens for 'order.placed' and auto-generates a USER_SPECIFIC coupon
 * when the user hits an nth-order milestone.
 *
 * Delegates to GenerateCouponUseCase — single source of truth for coupon creation.
 * Failure here does NOT roll back the order (fire-and-forget semantics).
 */
export function registerCouponHandler(): void {
  eventBus.on('order.placed', ({ userId, userCount }) => {
    if (!isNthOrder(userCount)) return;

    const result = new GenerateCouponUseCase(store).execute({
      type: 'USER_SPECIFIC',
      userId,
    });

    if (result.success && result.coupon) {
      logger.info('Coupon generated via nth-order milestone', {
        couponCode: result.coupon.code,
        userId,
        orderCount: userCount,
      });
    }
  });
}

/**
 * Listens for 'order.placed' and logs order analytics.
 * In production this handler would push to a data warehouse or analytics stream.
 */
export function registerAnalyticsHandler(): void {
  eventBus.on('order.placed', ({ order, userId }) => {
    logger.info('Order placed', {
      orderId: order.id,
      userId,
      total: order.total,
      discountAmount: order.discountAmount,
    });
  });
}

/** Registers all application-level event handlers. Called once at startup. */
export function registerAllHandlers(): void {
  registerCouponHandler();
  registerAnalyticsHandler();
}
