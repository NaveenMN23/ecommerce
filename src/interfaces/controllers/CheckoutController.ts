import { Request, Response, NextFunction } from 'express';
import { store } from '../../infrastructure/store/InMemoryStore';
import { CheckoutUseCase } from '../../application/checkout/CheckoutUseCase';

export class CheckoutController {
  static checkout(req: Request<{ userId: string }>, res: Response, next: NextFunction): void {
    try {
      const { userId } = req.params;
      const { couponCode } = req.body;

      const result = new CheckoutUseCase(store).execute({ userId, couponCode });
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }
}
