import { AppStore } from '../../infrastructure/store/AppStore';
import { Coupon, CouponType } from '../../domain/entities/Coupon';
import { AppError } from '../../domain/errors/AppError';
import {
  isNthOrder,
  generateCouponCode,
  nextCouponAt,
  DISCOUNT_CONFIG,
} from '../../domain/rules/DiscountRule';

export type GlobalTier = 'TIER1' | 'TIER2';

interface GenerateCouponInput {
  type: CouponType;
  userId?: string;    // required when type is USER_SPECIFIC
  tier?: GlobalTier;  // only relevant for GLOBAL — defaults to TIER1
}

interface GenerateCouponResult {
  success: boolean;
  coupon?: Coupon;
  message: string;
}

export class GenerateCouponUseCase {
  constructor(private readonly store: AppStore) {}

  execute(input: GenerateCouponInput): GenerateCouponResult {
    const { type, userId, tier = 'TIER1' } = input;

    if (type === 'USER_SPECIFIC') {
      return this.generateUserSpecific(userId);
    }
    return this.generateGlobal(tier);
  }

  private generateUserSpecific(userId: string | undefined): GenerateCouponResult {
    if (!userId) {
      throw new AppError('userId is required for USER_SPECIFIC coupon generation.', 400);
    }

    const userOrderCount = this.store.userOrderCounts.get(userId) ?? 0;

    if (userOrderCount === 0) {
      return {
        success: false,
        message: `User '${userId}' has no orders yet. Place at least ${DISCOUNT_CONFIG.NTH_ORDER} orders to earn a coupon.`,
      };
    }

    if (!isNthOrder(userOrderCount)) {
      const next = nextCouponAt(userOrderCount);
      return {
        success: false,
        message: `Condition not met for '${userId}'. They have ${userOrderCount} order(s). Next coupon at order #${next}.`,
      };
    }

    const code = generateCouponCode();
    const coupon: Coupon = {
      code,
      type: 'USER_SPECIFIC',
      userId,
      discountPercent: DISCOUNT_CONFIG.TIERS.USER_SPECIFIC.discountPercent,
      minOrderAmount: DISCOUNT_CONFIG.TIERS.USER_SPECIFIC.minOrderAmount,
      redeemedBy: [],
      createdAt: new Date(),
    };

    this.store.coupons.set(code, coupon);

    return {
      success: true,
      coupon,
      message: `USER_SPECIFIC coupon generated for '${userId}': ${DISCOUNT_CONFIG.TIERS.USER_SPECIFIC.discountPercent}% off on orders above ₹${DISCOUNT_CONFIG.TIERS.USER_SPECIFIC.minOrderAmount}.`,
    };
  }

  private generateGlobal(tier: GlobalTier): GenerateCouponResult {
    // TIER1: 7.5% off ₹1500+ (broader reach, lower discount)
    // TIER2: 10% off ₹2000+  (higher discount, higher spend threshold)
    const tierConfig =
      tier === 'TIER2'
        ? DISCOUNT_CONFIG.TIERS.GLOBAL_TIER2
        : DISCOUNT_CONFIG.TIERS.GLOBAL_TIER1;

    const code = generateCouponCode();
    const coupon: Coupon = {
      code,
      type: 'GLOBAL',
      discountPercent: tierConfig.discountPercent,
      minOrderAmount: tierConfig.minOrderAmount,
      redeemedBy: [],
      createdAt: new Date(),
    };

    this.store.coupons.set(code, coupon);

    return {
      success: true,
      coupon,
      message: `GLOBAL coupon generated (${tier}): ${tierConfig.discountPercent}% off on orders above ₹${tierConfig.minOrderAmount}.`,
    };
  }
}
