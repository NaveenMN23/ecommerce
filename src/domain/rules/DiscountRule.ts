import { randomUUID } from 'crypto';
import { config } from '../../config';

/**
 * Re-export config as DISCOUNT_CONFIG so callers don't change.
 * Values come from environment variables via src/config/index.ts —
 * no code deploy needed to tune NTH_ORDER or discount percentages.
 */
export const DISCOUNT_CONFIG = {
  NTH_ORDER: config.NTH_ORDER,
  TIERS: config.DISCOUNT_TIERS,
};

/**
 * Returns true when a user has hit an nth-order milestone.
 * Uses the user's personal order count — not the global store counter.
 *
 * Design choice: per-user count (not global) so every loyal customer is
 * rewarded at their own 5th, 10th, 15th order — not just whoever happens
 * to be the store's 5th, 10th order overall.
 */
export function isNthOrder(userOrderCount: number): boolean {
  return userOrderCount > 0 && userOrderCount % DISCOUNT_CONFIG.NTH_ORDER === 0;
}

/**
 * Generates a human-readable coupon code.
 * Format: UNIBLOX-XXXXXXXX (first 8 chars of a UUID, uppercased)
 * Guaranteed unique enough for an in-memory store; in production
 * a DB unique constraint is the actual safety net.
 */
export function generateCouponCode(): string {
  return `UNIBLOX-${randomUUID().replace(/-/g, '').substring(0, 8).toUpperCase()}`;
}

/**
 * Calculates the discount amount from a subtotal and a percentage.
 * Rounded to 2 decimal places to avoid floating-point drift in money.
 */
export function calculateDiscount(subtotal: number, discountPercent: number): number {
  return Math.round((subtotal * discountPercent) / 100 * 100) / 100;
}

/**
 * Applies a discount amount to a subtotal.
 * Floors at 0 — a discount can never make an order negative.
 */
export function applyDiscount(subtotal: number, discountAmount: number): number {
  return Math.max(0, subtotal - discountAmount);
}

/**
 * Returns the next order count at which the user will earn a coupon.
 * Used in API responses so users know how close they are.
 */
export function nextCouponAt(userOrderCount: number): number {
  return (Math.floor(userOrderCount / DISCOUNT_CONFIG.NTH_ORDER) + 1) * DISCOUNT_CONFIG.NTH_ORDER;
}
