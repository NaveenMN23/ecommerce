import { Request, Response, NextFunction } from 'express';
import { store } from '../../infrastructure/store/InMemoryStore';
import { AddToCartUseCase } from '../../application/cart/AddToCartUseCase';
import { UpdateCartItemUseCase } from '../../application/cart/UpdateCartItemUseCase';
import { RemoveCartItemUseCase } from '../../application/cart/RemoveCartItemUseCase';
import { AppError, CartNotFoundError } from '../../domain/errors/AppError';

type UserParams = { userId: string };
type ItemParams = { userId: string; productId: string };

export class CartController {
  static addItem(req: Request<UserParams>, res: Response, next: NextFunction): void {
    try {
      const { userId } = req.params;
      const { productId, quantity } = req.body;

      if (!productId || quantity === undefined) {
        throw new AppError('productId and quantity are required.', 400);
      }
      if (typeof quantity !== 'number') {
        throw new AppError('quantity must be a number.', 400);
      }

      const cart = new AddToCartUseCase(store).execute({ userId, productId, quantity });
      res.json({ success: true, cart });
    } catch (err) {
      next(err);
    }
  }

  static viewCart(req: Request<UserParams>, res: Response, next: NextFunction): void {
    try {
      const { userId } = req.params;
      const cart = store.carts.get(userId);
      if (!cart) throw new CartNotFoundError(userId);

      const total = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      res.json({ success: true, cart, total });
    } catch (err) {
      next(err);
    }
  }

  static updateItem(req: Request<ItemParams>, res: Response, next: NextFunction): void {
    try {
      const { userId, productId } = req.params;
      const { quantity } = req.body;

      if (quantity === undefined || typeof quantity !== 'number' || quantity < 0) {
        throw new AppError('quantity must be a non-negative number (0 to remove).', 400);
      }

      const cart = new UpdateCartItemUseCase(store).execute({ userId, productId, quantity });
      const total = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      res.json({ success: true, cart, total });
    } catch (err) {
      next(err);
    }
  }

  static removeItem(req: Request<ItemParams>, res: Response, next: NextFunction): void {
    try {
      const { userId, productId } = req.params;
      const cart = new RemoveCartItemUseCase(store).execute({ userId, productId });
      const total = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      res.json({ success: true, cart, total });
    } catch (err) {
      next(err);
    }
  }
}
