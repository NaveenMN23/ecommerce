export interface Coupon {
  code: string;
  discountPercent: number;
  isUsed: boolean;
  createdAt: Date;
  usedAt?: Date;
}
