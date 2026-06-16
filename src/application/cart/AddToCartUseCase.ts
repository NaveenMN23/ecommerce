import { AppStore } from '../../infrastructure/store/AppStore';
import { Cart, CartItem } from '../../domain/entities/Cart';
import {
  AppError,
  ProductNotFoundError,
  InsufficientStockError,
} from '../../domain/errors/AppError';

interface AddToCartInput {
  userId: string;
  productId: string;
  quantity: number;
}

export class AddToCartUseCase {
  constructor(private readonly store: AppStore) {}

  execute(input: AddToCartInput): Cart {
    const { userId, productId, quantity } = input;

    if (quantity < 1) {
      throw new AppError('Quantity must be at least 1', 400);
    }

    const product = this.store.products.get(productId);
    if (!product) {
      throw new ProductNotFoundError(productId);
    }

    // Get or create cart for this user
    const cart: Cart = this.store.carts.get(userId) ?? {
      userId,
      items: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const existingItem = cart.items.find((i) => i.productId === productId);
    const currentQuantityInCart = existingItem ? existingItem.quantity : 0;
    const totalRequested = currentQuantityInCart + quantity;

    // Validate total quantity (what's already in cart + new request) against live stock
    if (product.stock < totalRequested) {
      throw new InsufficientStockError(product.name, totalRequested, product.stock);
    }

    if (existingItem) {
      existingItem.quantity = totalRequested;
    } else {
      // Price is snapshotted from catalog — immune to price changes after cart add
      const newItem: CartItem = {
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity,
      };
      cart.items.push(newItem);
    }

    cart.updatedAt = new Date();
    this.store.carts.set(userId, cart);

    return cart;
  }
}
