export type CouponType = 'USER_SPECIFIC' | 'GLOBAL';

export interface Coupon {
  code: string;
  type: CouponType;
  /** Present only for USER_SPECIFIC coupons — only that user may redeem it */
  userId?: string;
  discountPercent: number;
  minOrderAmount: number; // minimum cart value to apply this coupon
  isUsed: boolean;
  createdAt: Date;
  usedAt?: Date;
}
