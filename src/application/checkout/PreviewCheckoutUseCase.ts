import { AppStore } from '../../infrastructure/store/AppStore';
import { CartItem } from '../../domain/entities/Cart';
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

interface PreviewInput {
  userId: string;
  couponCode?: string;
}

export interface PreviewResult {
  items: CartItem[];
  subtotal: number;
  discountCode?: string;
  discountAmount: number;
  total: number;
  /** Orders until this user earns their next USER_SPECIFIC coupon. */
  nextCouponAt: number;
}

/**
 * Read-only preview of what a checkout would produce.
 *
 * Runs identical validation to CheckoutUseCase (steps 1–4) but stops before
 * any mutations — no stock decrement, no order created, no coupon consumed.
 *
 * Use this to show users a price breakdown before they confirm payment.
 * The actual checkout call remains the single atomic write operation.
 */
export class PreviewCheckoutUseCase {
  constructor(private readonly store: AppStore) {}

  execute(input: PreviewInput): PreviewResult {
    const { userId, couponCode } = input;

    // 1. Cart must exist and be non-empty
    const cart = this.store.carts.get(userId);
    if (!cart) throw new CartNotFoundError(userId);
    if (cart.items.length === 0) throw new CartEmptyError();

    // 2. Validate stock — identical check to checkout so preview accurately
    //    reflects what will succeed or fail at checkout time
    for (const item of cart.items) {
      const product = this.store.products.get(item.productId);
      if (!product || product.stock < item.quantity) {
        throw new InsufficientStockError(item.name, item.quantity, product?.stock ?? 0);
      }
    }

    // 3. Calculate subtotal from snapshotted prices
    const subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // 4. Validate coupon — same rules as checkout, but do NOT record redemption
    let discountAmount = 0;
    let appliedCouponCode: string | undefined;

    if (couponCode) {
      const coupon = this.store.coupons.get(couponCode);
      if (!coupon) throw new CouponNotFoundError(couponCode);

      if (coupon.type === 'USER_SPECIFIC' && coupon.redeemedBy.length > 0) {
        throw new CouponAlreadyUsedError(couponCode);
      }
      if (coupon.type === 'GLOBAL' && coupon.redeemedBy.includes(userId)) {
        throw new AppError(`You have already used coupon '${couponCode}'.`, 400);
      }
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
      // No mutation — coupon.redeemedBy is NOT updated here
    }

    const total = applyDiscount(subtotal, discountAmount);
    const userCount = this.store.userOrderCounts.get(userId) ?? 0;

    return {
      items: cart.items,
      subtotal,
      discountCode: appliedCouponCode,
      discountAmount,
      total,
      nextCouponAt: nextCouponAt(userCount),
    };
  }
}
