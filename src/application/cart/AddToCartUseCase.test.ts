import { AddToCartUseCase } from './AddToCartUseCase';
import { AppStore } from '../../infrastructure/store/AppStore';
import { Product } from '../../domain/entities/Product';
import {
  AppError,
  ProductNotFoundError,
  InsufficientStockError,
} from '../../domain/errors/AppError';

// Minimal mock store — only what AddToCartUseCase needs
function makeStore(products: Product[] = []): AppStore {
  return {
    products: new Map(products.map((p) => [p.id, { ...p }])),
    carts: new Map(),
    orders: new Map(),
    coupons: new Map(),
    orderCount: 0,
    userOrderCounts: new Map(),
  };
}

const sampleProduct: Product = {
  id: 'p1',
  name: 'Wireless Headphones',
  description: 'Test product',
  price: 2999,
  stock: 10,
};

describe('AddToCartUseCase', () => {
  it('adds a new item to an empty cart', () => {
    const store = makeStore([sampleProduct]);
    const useCase = new AddToCartUseCase(store);

    const cart = useCase.execute({ userId: 'user1', productId: 'p1', quantity: 2 });

    expect(cart.userId).toBe('user1');
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0]).toMatchObject({ productId: 'p1', quantity: 2, price: 2999 });
  });

  it('increments quantity when the same product is added again', () => {
    const store = makeStore([sampleProduct]);
    const useCase = new AddToCartUseCase(store);

    useCase.execute({ userId: 'user1', productId: 'p1', quantity: 3 });
    const cart = useCase.execute({ userId: 'user1', productId: 'p1', quantity: 2 });

    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].quantity).toBe(5);
  });

  it('adds a different product as a separate cart item', () => {
    const p2: Product = { id: 'p2', name: 'Keyboard', description: '', price: 4499, stock: 5 };
    const store = makeStore([sampleProduct, p2]);
    const useCase = new AddToCartUseCase(store);

    useCase.execute({ userId: 'user1', productId: 'p1', quantity: 1 });
    const cart = useCase.execute({ userId: 'user1', productId: 'p2', quantity: 1 });

    expect(cart.items).toHaveLength(2);
  });

  it('snapshots the product price at time of add', () => {
    const store = makeStore([sampleProduct]);
    const useCase = new AddToCartUseCase(store);

    const cart = useCase.execute({ userId: 'user1', productId: 'p1', quantity: 1 });

    // Simulate a price change after cart add
    store.products.get('p1')!.price = 9999;

    // Price in cart should still be the original snapshot
    expect(cart.items[0].price).toBe(2999);
  });

  it('throws ProductNotFoundError for an unknown productId', () => {
    const store = makeStore([]);
    const useCase = new AddToCartUseCase(store);

    expect(() =>
      useCase.execute({ userId: 'user1', productId: 'unknown', quantity: 1 })
    ).toThrow(ProductNotFoundError);
  });

  it('throws AppError when quantity is less than 1', () => {
    const store = makeStore([sampleProduct]);
    const useCase = new AddToCartUseCase(store);

    expect(() =>
      useCase.execute({ userId: 'user1', productId: 'p1', quantity: 0 })
    ).toThrow(AppError);
  });

  it('throws InsufficientStockError when requested quantity exceeds stock', () => {
    const store = makeStore([sampleProduct]); // stock: 10
    const useCase = new AddToCartUseCase(store);

    expect(() =>
      useCase.execute({ userId: 'user1', productId: 'p1', quantity: 11 })
    ).toThrow(InsufficientStockError);
  });

  it('throws InsufficientStockError when cumulative cart quantity exceeds stock', () => {
    const store = makeStore([sampleProduct]); // stock: 10
    const useCase = new AddToCartUseCase(store);

    useCase.execute({ userId: 'user1', productId: 'p1', quantity: 8 });

    // 8 already in cart + 3 more = 11, exceeds stock of 10
    expect(() =>
      useCase.execute({ userId: 'user1', productId: 'p1', quantity: 3 })
    ).toThrow(InsufficientStockError);
  });

  it('persists the cart to the store after each add', () => {
    const store = makeStore([sampleProduct]);
    const useCase = new AddToCartUseCase(store);

    useCase.execute({ userId: 'user1', productId: 'p1', quantity: 2 });

    expect(store.carts.has('user1')).toBe(true);
    expect(store.carts.get('user1')!.items[0].quantity).toBe(2);
  });
});
