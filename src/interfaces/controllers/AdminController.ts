import { Request, Response, NextFunction } from 'express';
import { store } from '../../infrastructure/store/InMemoryStore';
import { GenerateCouponUseCase } from '../../application/admin/GenerateCouponUseCase';
import { GetStatsUseCase } from '../../application/admin/GetStatsUseCase';
import { AppError } from '../../domain/errors/AppError';
import { CouponType } from '../../domain/entities/Coupon';

export class AdminController {
  static generateCoupon(req: Request, res: Response, next: NextFunction): void {
    try {
      const { type, userId, tier } = req.body;

      if (!type || !['USER_SPECIFIC', 'GLOBAL'].includes(type)) {
        throw new AppError('type must be USER_SPECIFIC or GLOBAL.', 400);
      }

      const result = new GenerateCouponUseCase(store).execute({
        type: type as CouponType,
        userId,
        tier,
      });

      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  static getStats(_req: Request, res: Response, next: NextFunction): void {
    try {
      const stats = new GetStatsUseCase(store).execute();
      res.json({ success: true, stats });
    } catch (err) {
      next(err);
    }
  }

  static getUserStats(req: Request, res: Response, next: NextFunction): void {
    try {
      const { userId } = req.params;
      const stats = new GetStatsUseCase(store).executeForUser(userId);
      res.json({ success: true, userId, stats });
    } catch (err) {
      next(err);
    }
  }

  static listCoupons(_req: Request, res: Response, next: NextFunction): void {
    try {
      const coupons = Array.from(store.coupons.values());
      res.json({ success: true, total: coupons.length, coupons });
    } catch (err) {
      next(err);
    }
  }
}
