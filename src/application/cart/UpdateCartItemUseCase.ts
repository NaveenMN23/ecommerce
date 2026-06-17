import { AppStore } from '../../infrastructure/store/AppStore';
import { Cart } from '../../domain/entities/Cart';
import {
  CartNotFoundError,
  CartItemNotFoundError,
  InsufficientStockError,
} from '../../domain/errors/AppError';

interface UpdateCartItemInput {
  userId: string;
  productId: string;
  /** New absolute quantity. Pass 0 to remove the item from cart. */
  quantity: number;
}

export class UpdateCartItemUseCase {
  constructor(private readonly store: AppStore) {}

  execute(input: UpdateCartItemInput): Cart {
    const { userId, productId, quantity } = input;

    const cart = this.store.carts.get(userId);
    if (!cart) throw new CartNotFoundError(userId);

    const itemIndex = cart.items.findIndex((i) => i.productId === productId);
    if (itemIndex === -1) throw new CartItemNotFoundError(productId);

    if (quantity === 0) {
      // Remove item — user explicitly cleared it
      cart.items.splice(itemIndex, 1);
    } else {
      // Set to new absolute quantity — validate against live stock
      // Key difference from AddToCart: this is a SET, not an ADD.
      // User2 setting 46 should check stock >= 46, not stock >= (49 + 46).
      const product = this.store.products.get(productId);
      if (!product || product.stock < quantity) {
        throw new InsufficientStockError(
          cart.items[itemIndex].name,
          quantity,
          product?.stock ?? 0
        );
      }
      cart.items[itemIndex] = { ...cart.items[itemIndex], quantity };
    }

    cart.updatedAt = new Date();
    this.store.carts.set(userId, cart);
    return cart;
  }
}
