import { Request, Response, NextFunction } from 'express';
import { store } from '../../infrastructure/store/InMemoryStore';

export class ProductController {
  static list(_req: Request, res: Response, next: NextFunction): void {
    try {
      const products = Array.from(store.products.values());
      res.json({ success: true, products });
    } catch (err) {
      next(err);
    }
  }
}
