import { UpdateCartItemUseCase } from './UpdateCartItemUseCase';
import { RemoveCartItemUseCase } from './RemoveCartItemUseCase';
import { AppStore } from '../../infrastructure/store/AppStore';
import { Cart } from '../../domain/entities/Cart';
import { CartNotFoundError, CartItemNotFoundError, InsufficientStockError } from '../../domain/errors/AppError';

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

const product = { id: 'p1', name: 'Headphones', description: '', price: 2000, stock: 50 };

function cartWithItem(quantity: number): Cart {
  return {
    userId: 'user1',
    items: [{ productId: 'p1', name: 'Headphones', price: 2000, quantity }],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('UpdateCartItemUseCase', () => {
  it('throws CartNotFoundError when user has no cart', () => {
    const store = makeStore();
    expect(() =>
      new UpdateCartItemUseCase(store).execute({ userId: 'user1', productId: 'p1', quantity: 2 })
    ).toThrow(CartNotFoundError);
  });

  it('throws CartItemNotFoundError when item is not in cart', () => {
    const store = makeStore();
    store.carts.set('user1', { userId: 'user1', items: [], createdAt: new Date(), updatedAt: new Date() });
    expect(() =>
      new UpdateCartItemUseCase(store).execute({ userId: 'user1', productId: 'p1', quantity: 2 })
    ).toThrow(CartItemNotFoundError);
  });

  it('removes item when quantity is 0', () => {
    const store = makeStore({ products: new Map([['p1', { ...product }]]) });
    store.carts.set('user1', cartWithItem(5));
    const cart = new UpdateCartItemUseCase(store).execute({ userId: 'user1', productId: 'p1', quantity: 0 });
    expect(cart.items).toHaveLength(0);
  });

  it('updates item to new quantity', () => {
    const store = makeStore({ products: new Map([['p1', { ...product }]]) });
    store.carts.set('user1', cartWithItem(49)); // was 49, stock 50
    const cart = new UpdateCartItemUseCase(store).execute({ userId: 'user1', productId: 'p1', quantity: 46 });
    expect(cart.items[0].quantity).toBe(46);
  });

  it('throws InsufficientStockError when new quantity exceeds stock', () => {
    const store = makeStore({ products: new Map([['p1', { ...product, stock: 46 }]]) });
    store.carts.set('user1', cartWithItem(49));
    expect(() =>
      new UpdateCartItemUseCase(store).execute({ userId: 'user1', productId: 'p1', quantity: 47 })
    ).toThrow(InsufficientStockError);
  });

  it('allows updating to exactly available stock', () => {
    const store = makeStore({ products: new Map([['p1', { ...product, stock: 46 }]]) });
    store.carts.set('user1', cartWithItem(49));
    const cart = new UpdateCartItemUseCase(store).execute({ userId: 'user1', productId: 'p1', quantity: 46 });
    expect(cart.items[0].quantity).toBe(46);
  });

  it('does NOT add quantity on top of existing — it sets absolutely', () => {
    const store = makeStore({ products: new Map([['p1', { ...product, stock: 46 }]]) });
    store.carts.set('user1', cartWithItem(49));
    // Setting to 30 should check stock >= 30, NOT stock >= (49 + 30)
    const cart = new UpdateCartItemUseCase(store).execute({ userId: 'user1', productId: 'p1', quantity: 30 });
    expect(cart.items[0].quantity).toBe(30);
  });
});

describe('RemoveCartItemUseCase', () => {
  it('throws CartNotFoundError when user has no cart', () => {
    const store = makeStore();
    expect(() =>
      new RemoveCartItemUseCase(store).execute({ userId: 'user1', productId: 'p1' })
    ).toThrow(CartNotFoundError);
  });

  it('throws CartItemNotFoundError when item is not in cart', () => {
    const store = makeStore();
    store.carts.set('user1', { userId: 'user1', items: [], createdAt: new Date(), updatedAt: new Date() });
    expect(() =>
      new RemoveCartItemUseCase(store).execute({ userId: 'user1', productId: 'p1' })
    ).toThrow(CartItemNotFoundError);
  });

  it('removes the item from cart', () => {
    const store = makeStore();
    store.carts.set('user1', cartWithItem(3));
    const cart = new RemoveCartItemUseCase(store).execute({ userId: 'user1', productId: 'p1' });
    expect(cart.items).toHaveLength(0);
  });

  it('persists the updated cart', () => {
    const store = makeStore();
    store.carts.set('user1', cartWithItem(3));
    new RemoveCartItemUseCase(store).execute({ userId: 'user1', productId: 'p1' });
    expect(store.carts.get('user1')!.items).toHaveLength(0);
  });
});
