import { PreviewCheckoutUseCase } from './PreviewCheckoutUseCase';
import { AppStore } from '../../infrastructure/store/AppStore';
import { Coupon } from '../../domain/entities/Coupon';
import {
  CartNotFoundError,
  CartEmptyError,
  InsufficientStockError,
  CouponNotFoundError,
  CouponAlreadyUsedError,
  AppError,
} from '../../domain/errors/AppError';

function makeStore(overrides: Partial<AppStore> = {}): AppStore {
  return {
    products: new Map(),
    carts: new Map(),
    orders: new Map(),
    coupons: new Map(),
    orderCount: 0,
    userOrderCounts: new Map(),
    ...overrides,
  };
}

const product = { id: 'p1', name: 'Headphones', description: '', price: 3000, stock: 10 };

function cartWithItems(quantity = 1) {
  return {
    userId: 'user1',
    items: [{ productId: 'p1', name: 'Headphones', price: 3000, quantity }],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function makeCoupon(overrides: Partial<Coupon> = {}): Coupon {
  return {
    code: 'TEST-COUPON',
    type: 'USER_SPECIFIC',
    userId: 'user1',
    discountPercent: 10,
    minOrderAmount: 1000,
    redeemedBy: [],
    createdAt: new Date(),
    ...overrides,
  };
}

describe('PreviewCheckoutUseCase', () => {
  it('throws CartNotFoundError when user has no cart', () => {
    const store = makeStore();
    expect(() =>
      new PreviewCheckoutUseCase(store).execute({ userId: 'user1' })
    ).toThrow(CartNotFoundError);
  });

  it('throws CartEmptyError when cart has no items', () => {
    const store = makeStore();
    store.carts.set('user1', { userId: 'user1', items: [], createdAt: new Date(), updatedAt: new Date() });
    expect(() =>
      new PreviewCheckoutUseCase(store).execute({ userId: 'user1' })
    ).toThrow(CartEmptyError);
  });

  it('throws InsufficientStockError when stock is below cart quantity', () => {
    const store = makeStore({ products: new Map([['p1', { ...product, stock: 0 }]]) });
    store.carts.set('user1', cartWithItems(1));
    expect(() =>
      new PreviewCheckoutUseCase(store).execute({ userId: 'user1' })
    ).toThrow(InsufficientStockError);
  });

  it('throws CouponNotFoundError for unknown coupon code', () => {
    const store = makeStore({ products: new Map([['p1', { ...product }]]) });
    store.carts.set('user1', cartWithItems(1));
    expect(() =>
      new PreviewCheckoutUseCase(store).execute({ userId: 'user1', couponCode: 'FAKE' })
    ).toThrow(CouponNotFoundError);
  });

  it('throws CouponAlreadyUsedError when USER_SPECIFIC coupon is already redeemed', () => {
    const coupon = makeCoupon({ redeemedBy: ['user1'] });
    const store = makeStore({ products: new Map([['p1', { ...product }]]), coupons: new Map([['TEST-COUPON', coupon]]) });
    store.carts.set('user1', cartWithItems(1));
    expect(() =>
      new PreviewCheckoutUseCase(store).execute({ userId: 'user1', couponCode: 'TEST-COUPON' })
    ).toThrow(CouponAlreadyUsedError);
  });

  it('throws AppError when GLOBAL coupon already redeemed by this user', () => {
    const coupon = makeCoupon({ type: 'GLOBAL', userId: undefined, redeemedBy: ['user1'] });
    const store = makeStore({ products: new Map([['p1', { ...product }]]), coupons: new Map([['TEST-COUPON', coupon]]) });
    store.carts.set('user1', cartWithItems(1));
    expect(() =>
      new PreviewCheckoutUseCase(store).execute({ userId: 'user1', couponCode: 'TEST-COUPON' })
    ).toThrow(AppError);
  });

  it('throws 403 AppError when USER_SPECIFIC coupon belongs to a different user', () => {
    const coupon = makeCoupon({ userId: 'user2' });
    const store = makeStore({ products: new Map([['p1', { ...product }]]), coupons: new Map([['TEST-COUPON', coupon]]) });
    store.carts.set('user1', cartWithItems(1));
    expect(() =>
      new PreviewCheckoutUseCase(store).execute({ userId: 'user1', couponCode: 'TEST-COUPON' })
    ).toThrow(AppError);
  });

  it('throws AppError when subtotal is below coupon minOrderAmount', () => {
    const coupon = makeCoupon({ minOrderAmount: 5000 });
    const store = makeStore({ products: new Map([['p1', { ...product }]]), coupons: new Map([['TEST-COUPON', coupon]]) });
    store.carts.set('user1', cartWithItems(1)); // subtotal = 3000, below 5000
    expect(() =>
      new PreviewCheckoutUseCase(store).execute({ userId: 'user1', couponCode: 'TEST-COUPON' })
    ).toThrow(AppError);
  });

  it('returns correct preview without coupon', () => {
    const store = makeStore({ products: new Map([['p1', { ...product }]]) });
    store.carts.set('user1', cartWithItems(2)); // subtotal = 6000
    const result = new PreviewCheckoutUseCase(store).execute({ userId: 'user1' });
    expect(result.subtotal).toBe(6000);
    expect(result.discountAmount).toBe(0);
    expect(result.total).toBe(6000);
    expect(result.discountCode).toBeUndefined();
  });

  it('returns correct discount breakdown with a valid coupon', () => {
    const coupon = makeCoupon({ discountPercent: 10, minOrderAmount: 1000 });
    const store = makeStore({ products: new Map([['p1', { ...product }]]), coupons: new Map([['TEST-COUPON', coupon]]) });
    store.carts.set('user1', cartWithItems(1)); // subtotal = 3000, 10% = 300
    const result = new PreviewCheckoutUseCase(store).execute({ userId: 'user1', couponCode: 'TEST-COUPON' });
    expect(result.subtotal).toBe(3000);
    expect(result.discountAmount).toBe(300);
    expect(result.total).toBe(2700);
    expect(result.discountCode).toBe('TEST-COUPON');
  });

  it('does NOT mutate coupon redeemedBy — preview has zero side effects', () => {
    const coupon = makeCoupon();
    const store = makeStore({ products: new Map([['p1', { ...product }]]), coupons: new Map([['TEST-COUPON', coupon]]) });
    store.carts.set('user1', cartWithItems(1));
    new PreviewCheckoutUseCase(store).execute({ userId: 'user1', couponCode: 'TEST-COUPON' });
    expect(store.coupons.get('TEST-COUPON')!.redeemedBy).toHaveLength(0);
  });
});
