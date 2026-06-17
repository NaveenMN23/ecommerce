import { Request, Response, NextFunction } from 'express';
import { store } from '../../infrastructure/store/InMemoryStore';
import { AddToCartUseCase } from '../../application/cart/AddToCartUseCase';
import { AppError, CartNotFoundError } from '../../domain/errors/AppError';

export class CartController {
  static addItem(req: Request<{ userId: string }>, res: Response, next: NextFunction): void {
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

  static viewCart(req: Request<{ userId: string }>, res: Response, next: NextFunction): void {
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
}
