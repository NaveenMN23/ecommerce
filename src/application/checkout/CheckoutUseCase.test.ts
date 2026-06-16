import { CheckoutUseCase } from './CheckoutUseCase';
import { AppStore } from '../../infrastructure/store/AppStore';
import { Product } from '../../domain/entities/Product';
import { Cart } from '../../domain/entities/Cart';
import { Coupon } from '../../domain/entities/Coupon';
import {
  CartNotFoundError,
  CartEmptyError,
  CouponNotFoundError,
  CouponAlreadyUsedError,
  InsufficientStockError,
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

const product: Product = { id: 'p1', name: 'Headphones', description: '', price: 2000, stock: 10 };

function cartWith(productId: string, quantity: number, price = 2000): Cart {
  return {
    userId: 'user1',
    items: [{ productId, name: 'Headphones', price, quantity }],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function validCoupon(overrides: Partial<Coupon> = {}): Coupon {
  return {
    code: 'UNIBLOX-TEST01',
    type: 'GLOBAL',
    discountPercent: 10,
    minOrderAmount: 1500,
    isUsed: false,
    createdAt: new Date(),
    ...overrides,
  };
}

describe('CheckoutUseCase', () => {
  describe('cart validation', () => {
    it('throws CartNotFoundError when user has no cart', () => {
      const store = makeStore();
      expect(() => new CheckoutUseCase(store).execute({ userId: 'user1' })).toThrow(
        CartNotFoundError
      );
    });

    it('throws CartEmptyError when cart has no items', () => {
      const store = makeStore();
      store.carts.set('user1', { userId: 'user1', items: [], createdAt: new Date(), updatedAt: new Date() });
      expect(() => new CheckoutUseCase(store).execute({ userId: 'user1' })).toThrow(CartEmptyError);
    });
  });

  describe('stock re-validation', () => {
    it('throws InsufficientStockError when stock was depleted after cart add', () => {
      const store = makeStore({ products: new Map([['p1', { ...product, stock: 1 }]]) });
      store.carts.set('user1', cartWith('p1', 3)); // wants 3, only 1 left
      expect(() => new CheckoutUseCase(store).execute({ userId: 'user1' })).toThrow(
        InsufficientStockError
      );
    });
  });

  describe('successful checkout without coupon', () => {
    it('creates an order with correct subtotal and zero discount', () => {
      const store = makeStore({ products: new Map([['p1', { ...product }]]) });
      store.carts.set('user1', cartWith('p1', 2)); // 2 × ₹2000 = ₹4000
      const { order } = new CheckoutUseCase(store).execute({ userId: 'user1' });

      expect(order.subtotal).toBe(4000);
      expect(order.discountAmount).toBe(0);
      expect(order.total).toBe(4000);
      expect(order.status).toBe('PLACED');
      expect(order.discountCode).toBeUndefined();
    });

    it('decrements product stock after checkout', () => {
      const store = makeStore({ products: new Map([['p1', { ...product }]]) });
      store.carts.set('user1', cartWith('p1', 3));
      new CheckoutUseCase(store).execute({ userId: 'user1' });

      expect(store.products.get('p1')!.stock).toBe(7); // 10 - 3
    });

    it('clears the cart after checkout', () => {
      const store = makeStore({ products: new Map([['p1', { ...product }]]) });
      store.carts.set('user1', cartWith('p1', 1));
      new CheckoutUseCase(store).execute({ userId: 'user1' });

      expect(store.carts.has('user1')).toBe(false);
    });

    it('increments both global and per-user order counts', () => {
      const store = makeStore({ products: new Map([['p1', { ...product }]]) });
      store.carts.set('user1', cartWith('p1', 1));
      new CheckoutUseCase(store).execute({ userId: 'user1' });

      expect(store.orderCount).toBe(1);
      expect(store.userOrderCounts.get('user1')).toBe(1);
    });
  });

  describe('coupon validation', () => {
    it('throws CouponNotFoundError for unknown coupon code', () => {
      const store = makeStore({ products: new Map([['p1', { ...product }]]) });
      store.carts.set('user1', cartWith('p1', 1));
      expect(() =>
        new CheckoutUseCase(store).execute({ userId: 'user1', couponCode: 'FAKE-CODE' })
      ).toThrow(CouponNotFoundError);
    });

    it('throws CouponAlreadyUsedError for a used coupon', () => {
      const store = makeStore({ products: new Map([['p1', { ...product }]]) });
      store.carts.set('user1', cartWith('p1', 1));
      store.coupons.set('UNIBLOX-TEST01', validCoupon({ isUsed: true }));
      expect(() =>
        new CheckoutUseCase(store).execute({ userId: 'user1', couponCode: 'UNIBLOX-TEST01' })
      ).toThrow(CouponAlreadyUsedError);
    });

    it('throws AppError when USER_SPECIFIC coupon belongs to another user', () => {
      const store = makeStore({ products: new Map([['p1', { ...product }]]) });
      store.carts.set('user1', cartWith('p1', 1));
      store.coupons.set('UNIBLOX-TEST01', validCoupon({ type: 'USER_SPECIFIC', userId: 'user2' }));
      expect(() =>
        new CheckoutUseCase(store).execute({ userId: 'user1', couponCode: 'UNIBLOX-TEST01' })
      ).toThrow(AppError);
    });

    it('throws AppError when subtotal is below coupon minOrderAmount', () => {
      const store = makeStore({ products: new Map([['p1', { ...product, price: 500 }]]) });
      store.carts.set('user1', cartWith('p1', 1, 500)); // ₹500 < ₹1500 minimum
      store.coupons.set('UNIBLOX-TEST01', validCoupon({ minOrderAmount: 1500 }));
      expect(() =>
        new CheckoutUseCase(store).execute({ userId: 'user1', couponCode: 'UNIBLOX-TEST01' })
      ).toThrow(AppError);
    });
  });

  describe('successful checkout with coupon', () => {
    it('applies discount and returns correct total', () => {
      const store = makeStore({ products: new Map([['p1', { ...product }]]) });
      store.carts.set('user1', cartWith('p1', 1)); // ₹2000
      store.coupons.set('UNIBLOX-TEST01', validCoupon({ discountPercent: 10 }));

      const { order } = new CheckoutUseCase(store).execute({
        userId: 'user1',
        couponCode: 'UNIBLOX-TEST01',
      });

      expect(order.discountAmount).toBe(200);  // 10% of ₹2000
      expect(order.total).toBe(1800);
      expect(order.discountCode).toBe('UNIBLOX-TEST01');
    });

    it('marks coupon as used after checkout', () => {
      const store = makeStore({ products: new Map([['p1', { ...product }]]) });
      store.carts.set('user1', cartWith('p1', 1));
      store.coupons.set('UNIBLOX-TEST01', validCoupon());
      new CheckoutUseCase(store).execute({ userId: 'user1', couponCode: 'UNIBLOX-TEST01' });

      expect(store.coupons.get('UNIBLOX-TEST01')!.isUsed).toBe(true);
    });

    it('prevents double-use of the same coupon', () => {
      const store = makeStore({ products: new Map([['p1', { ...product }]]) });
      store.coupons.set('UNIBLOX-TEST01', validCoupon());

      // First checkout
      store.carts.set('user1', cartWith('p1', 1));
      new CheckoutUseCase(store).execute({ userId: 'user1', couponCode: 'UNIBLOX-TEST01' });

      // Second checkout with same coupon
      store.carts.set('user1', cartWith('p1', 1));
      expect(() =>
        new CheckoutUseCase(store).execute({ userId: 'user1', couponCode: 'UNIBLOX-TEST01' })
      ).toThrow(CouponAlreadyUsedError);
    });
  });

});
