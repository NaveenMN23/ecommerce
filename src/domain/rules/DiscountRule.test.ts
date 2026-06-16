import {
  isNthOrder,
  generateCouponCode,
  calculateDiscount,
  applyDiscount,
  nextCouponAt,
  DISCOUNT_CONFIG,
} from './DiscountRule';

describe('isNthOrder', () => {
  it('returns false for 0 orders', () => {
    expect(isNthOrder(0)).toBe(false);
  });

  it('returns true at exactly the Nth order', () => {
    expect(isNthOrder(DISCOUNT_CONFIG.NTH_ORDER)).toBe(true); // 5
  });

  it('returns true at every subsequent multiple of N', () => {
    expect(isNthOrder(10)).toBe(true);
    expect(isNthOrder(15)).toBe(true);
    expect(isNthOrder(20)).toBe(true);
  });

  it('returns false for non-multiples', () => {
    expect(isNthOrder(1)).toBe(false);
    expect(isNthOrder(3)).toBe(false);
    expect(isNthOrder(6)).toBe(false);
    expect(isNthOrder(9)).toBe(false);
  });
});

describe('generateCouponCode', () => {
  it('starts with UNIBLOX-', () => {
    expect(generateCouponCode()).toMatch(/^UNIBLOX-/);
  });

  it('has exactly 8 uppercase characters after the prefix', () => {
    const code = generateCouponCode();
    const suffix = code.replace('UNIBLOX-', '');
    expect(suffix).toHaveLength(8);
    expect(suffix).toBe(suffix.toUpperCase());
  });

  it('generates unique codes on each call', () => {
    const codes = new Set(Array.from({ length: 100 }, generateCouponCode));
    expect(codes.size).toBe(100);
  });
});

describe('calculateDiscount', () => {
  it('calculates 10% discount correctly', () => {
    expect(calculateDiscount(1000, 10)).toBe(100);
  });

  it('calculates 7.5% discount correctly', () => {
    expect(calculateDiscount(2000, 7.5)).toBe(150);
  });

  it('rounds to 2 decimal places', () => {
    // 10% of ₹999.99 = ₹99.999 → rounds to ₹100
    expect(calculateDiscount(999.99, 10)).toBe(100);
  });

  it('handles zero subtotal', () => {
    expect(calculateDiscount(0, 10)).toBe(0);
  });
});

describe('applyDiscount', () => {
  it('subtracts discount from subtotal', () => {
    expect(applyDiscount(1000, 100)).toBe(900);
  });

  it('floors at 0 when discount exceeds subtotal', () => {
    expect(applyDiscount(100, 200)).toBe(0);
  });

  it('returns subtotal unchanged when discount is 0', () => {
    expect(applyDiscount(1500, 0)).toBe(1500);
  });
});

describe('nextCouponAt', () => {
  it('returns N for a user with 0 orders', () => {
    expect(nextCouponAt(0)).toBe(DISCOUNT_CONFIG.NTH_ORDER); // 5
  });

  it('returns 2N for a user who just hit N orders', () => {
    expect(nextCouponAt(5)).toBe(10);
  });

  it('returns the next milestone correctly for mid-range counts', () => {
    expect(nextCouponAt(3)).toBe(5);
    expect(nextCouponAt(7)).toBe(10);
    expect(nextCouponAt(11)).toBe(15);
  });
});
