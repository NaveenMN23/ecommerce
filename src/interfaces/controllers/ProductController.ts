import { Request, Response } from 'express';
import { store } from '../../infrastructure/store/InMemoryStore';

export class ProductController {
  static list(_req: Request, res: Response): void {
    const products = Array.from(store.products.values());
    res.json({ success: true, products });
  }
}
