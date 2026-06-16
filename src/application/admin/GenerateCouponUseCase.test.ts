import { GenerateCouponUseCase } from './GenerateCouponUseCase';
import { AppStore } from '../../infrastructure/store/AppStore';
import { AppError } from '../../domain/errors/AppError';
import { DISCOUNT_CONFIG } from '../../domain/rules/DiscountRule';

function makeStore(userOrderCounts: Record<string, number> = {}): AppStore {
  return {
    products: new Map(),
    carts: new Map(),
    orders: new Map(),
    coupons: new Map(),
    orderCount: 0,
    userOrderCounts: new Map(Object.entries(userOrderCounts)),
  };
}

const N = DISCOUNT_CONFIG.NTH_ORDER; // 5

describe('GenerateCouponUseCase — USER_SPECIFIC', () => {
  it('throws AppError when userId is missing', () => {
    const store = makeStore();
    const useCase = new GenerateCouponUseCase(store);
    expect(() => useCase.execute({ type: 'USER_SPECIFIC' })).toThrow(AppError);
  });

  it('returns success:false when user has no orders', () => {
    const store = makeStore({ user1: 0 });
    const result = new GenerateCouponUseCase(store).execute({ type: 'USER_SPECIFIC', userId: 'user1' });
    expect(result.success).toBe(false);
  });

  it('returns success:false when user has not reached nth-order milestone', () => {
    const store = makeStore({ user1: N - 1 }); // 4 orders — not yet
    const result = new GenerateCouponUseCase(store).execute({ type: 'USER_SPECIFIC', userId: 'user1' });
    expect(result.success).toBe(false);
    expect(result.message).toContain(`#${N}`); // tells them when next coupon is
  });

  it('generates a USER_SPECIFIC coupon when user hits nth-order milestone', () => {
    const store = makeStore({ user1: N }); // exactly 5
    const result = new GenerateCouponUseCase(store).execute({ type: 'USER_SPECIFIC', userId: 'user1' });

    expect(result.success).toBe(true);
    expect(result.coupon?.code).toMatch(/^UNIBLOX-/);
    expect(result.coupon?.type).toBe('USER_SPECIFIC');
    expect(result.coupon?.userId).toBe('user1');
    expect(result.coupon?.discountPercent).toBe(DISCOUNT_CONFIG.TIERS.USER_SPECIFIC.discountPercent);
    expect(result.coupon?.minOrderAmount).toBe(DISCOUNT_CONFIG.TIERS.USER_SPECIFIC.minOrderAmount);
  });

  it('persists the generated coupon to the store', () => {
    const store = makeStore({ user1: N });
    const result = new GenerateCouponUseCase(store).execute({ type: 'USER_SPECIFIC', userId: 'user1' });

    expect(store.coupons.has(result.coupon!.code)).toBe(true);
  });

  it('generates at 2× and 3× milestones too', () => {
    const store = makeStore({ user1: N * 2 });
    const result = new GenerateCouponUseCase(store).execute({ type: 'USER_SPECIFIC', userId: 'user1' });
    expect(result.success).toBe(true);
  });
});

describe('GenerateCouponUseCase — GLOBAL', () => {
  it('defaults to TIER1 when no tier is specified', () => {
    const store = makeStore();
    const result = new GenerateCouponUseCase(store).execute({ type: 'GLOBAL' });

    expect(result.success).toBe(true);
    expect(result.coupon?.type).toBe('GLOBAL');
    expect(result.coupon?.userId).toBeUndefined();
    expect(result.coupon?.discountPercent).toBe(DISCOUNT_CONFIG.TIERS.GLOBAL_TIER1.discountPercent);
    expect(result.coupon?.minOrderAmount).toBe(DISCOUNT_CONFIG.TIERS.GLOBAL_TIER1.minOrderAmount);
  });

  it('generates TIER2 coupon when explicitly requested', () => {
    const store = makeStore();
    const result = new GenerateCouponUseCase(store).execute({ type: 'GLOBAL', tier: 'TIER2' });

    expect(result.success).toBe(true);
    expect(result.coupon?.discountPercent).toBe(DISCOUNT_CONFIG.TIERS.GLOBAL_TIER2.discountPercent);
    expect(result.coupon?.minOrderAmount).toBe(DISCOUNT_CONFIG.TIERS.GLOBAL_TIER2.minOrderAmount);
  });

  it('TIER2 has higher discount and higher minimum than TIER1', () => {
    expect(DISCOUNT_CONFIG.TIERS.GLOBAL_TIER2.discountPercent).toBeGreaterThan(
      DISCOUNT_CONFIG.TIERS.GLOBAL_TIER1.discountPercent
    );
    expect(DISCOUNT_CONFIG.TIERS.GLOBAL_TIER2.minOrderAmount).toBeGreaterThan(
      DISCOUNT_CONFIG.TIERS.GLOBAL_TIER1.minOrderAmount
    );
  });

  it('persists the global coupon to the store', () => {
    const store = makeStore();
    const result = new GenerateCouponUseCase(store).execute({ type: 'GLOBAL' });
    expect(store.coupons.has(result.coupon!.code)).toBe(true);
  });
});
