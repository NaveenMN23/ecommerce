import { Request, Response, NextFunction } from 'express';
import { store } from '../../infrastructure/store/InMemoryStore';
import { GetOrderHistoryUseCase } from '../../application/orders/GetOrderHistoryUseCase';

export class OrderController {
  static getOrderHistory(req: Request<{ userId: string }>, res: Response, next: NextFunction): void {
    try {
      const { userId } = req.params;
      const result = new GetOrderHistoryUseCase(store).execute({ userId });
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }
}
