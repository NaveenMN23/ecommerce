export type CouponType = 'USER_SPECIFIC' | 'GLOBAL';

export interface Coupon {
  code: string;
  type: CouponType;
  /** Present only for USER_SPECIFIC coupons — only that user may redeem it */
  userId?: string;
  discountPercent: number;
  minOrderAmount: number; // minimum cart value to apply this coupon
  /** Tracks who has redeemed this coupon.
   *  USER_SPECIFIC: max 1 entry (the owner). GLOBAL: one entry per user who has redeemed it. */
  redeemedBy: string[];
  createdAt: Date;
}
