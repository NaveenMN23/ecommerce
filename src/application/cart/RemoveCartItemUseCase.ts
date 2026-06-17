import { AppStore } from '../../infrastructure/store/AppStore';
import { Cart } from '../../domain/entities/Cart';
import { CartNotFoundError, CartItemNotFoundError } from '../../domain/errors/AppError';

interface RemoveCartItemInput {
  userId: string;
  productId: string;
}

export class RemoveCartItemUseCase {
  constructor(private readonly store: AppStore) {}

  execute(input: RemoveCartItemInput): Cart {
    const { userId, productId } = input;

    const cart = this.store.carts.get(userId);
    if (!cart) throw new CartNotFoundError(userId);

    const itemIndex = cart.items.findIndex((i) => i.productId === productId);
    if (itemIndex === -1) throw new CartItemNotFoundError(productId);

    cart.items.splice(itemIndex, 1);
    cart.updatedAt = new Date();
    this.store.carts.set(userId, cart);
    return cart;
  }
}
