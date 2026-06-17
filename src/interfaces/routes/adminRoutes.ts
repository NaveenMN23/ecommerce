import { Router } from 'express';
import { AdminController } from '../controllers/AdminController';

const router = Router();

/**
 * @swagger
 * /api/admin/coupons/generate:
 *   post:
 *     tags: [Admin]
 *     summary: Generate a discount coupon
 *     description: |
 *       Generates a coupon based on type:
 *
 *       - **USER_SPECIFIC**: Manual override / fallback only. USER_SPECIFIC coupons are
 *         **auto-generated** by the checkout event handler on every nth order (default every 5th)
 *         — no admin action is required. Use this endpoint only if auto-generation failed or to
 *         test manually. Requires `userId`. Returns `success: false` if the user hasn't hit
 *         the milestone yet (this is a valid business state, not an error).
 *
 *       - **GLOBAL**: Always manual — admin decides when to run a discount campaign.
 *         Usable by any user, but each user can only redeem it once (`redeemedBy` tracks this).
 *         Use `tier: TIER2` for 10% off ₹2000+ (default TIER1 is 7.5% off ₹1500+).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type]
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [USER_SPECIFIC, GLOBAL]
 *                 example: USER_SPECIFIC
 *               userId:
 *                 type: string
 *                 example: user1
 *                 description: Required when type is USER_SPECIFIC
 *               tier:
 *                 type: string
 *                 enum: [TIER1, TIER2]
 *                 example: TIER1
 *                 description: Only for GLOBAL. TIER1=7.5% off ₹1500+, TIER2=10% off ₹2000+
 *     responses:
 *       200:
 *         description: Result (success true or false — both are 200, not an error)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 coupon:  { $ref: '#/components/schemas/Coupon' }
 *                 message: { type: string, example: "Condition not met. Next coupon at order #10." }
 *       400:
 *         description: Invalid type or missing userId
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.post('/coupons/generate', AdminController.generateCoupon);

/**
 * @swagger
 * /api/admin/coupons:
 *   get:
 *     tags: [Admin]
 *     summary: List all coupons
 *     description: Returns every coupon in the store with its current usage status.
 *     responses:
 *       200:
 *         description: All coupons
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 total:   { type: integer }
 *                 coupons:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Coupon' }
 */
router.get('/coupons', AdminController.listCoupons);

/**
 * @swagger
 * /api/admin/stats:
 *   get:
 *     tags: [Admin]
 *     summary: Store-wide stats
 *     description: Returns total orders, items purchased, revenue, and discounts given across all users.
 *     responses:
 *       200:
 *         description: Aggregated store stats
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 stats:
 *                   type: object
 *                   properties:
 *                     totalOrders:        { type: integer, example: 6 }
 *                     totalItemsPurchased: { type: integer, example: 12 }
 *                     totalRevenue:       { type: number, example: 31609.1 }
 *                     totalDiscountGiven: { type: number, example: 179.9 }
 *                     topSellingProduct:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         productId: { type: string, example: p5 }
 *                         name:      { type: string, example: "Desk Lamp" }
 *                         value:     { type: integer, example: 8, description: "Units sold" }
 *                     topRevenueProduct:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         productId: { type: string, example: p2 }
 *                         name:      { type: string, example: "Mechanical Keyboard" }
 *                         value:     { type: number, example: 8998, description: "Total revenue in ₹" }
 *                     coupons:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/Coupon' }
 */
router.get('/stats', AdminController.getStats);

/**
 * @swagger
 * /api/admin/stats/{userId}:
 *   get:
 *     tags: [Admin]
 *     summary: Stats for a specific user
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *         example: user1
 *     responses:
 *       200:
 *         description: User-scoped stats
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 userId:  { type: string }
 *                 stats:
 *                   type: object
 *                   properties:
 *                     totalOrders:        { type: integer }
 *                     totalItemsPurchased: { type: integer }
 *                     totalRevenue:       { type: number }
 *                     totalDiscountGiven: { type: number }
 *                     favoriteProduct:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         productId: { type: string, example: p1 }
 *                         name:      { type: string, example: "Wireless Headphones" }
 *                         value:     { type: integer, example: 3, description: "Units purchased by this user" }
 *                     orders:
 *                       type: array
 *                       description: Full purchase history for this user
 *                       items: { $ref: '#/components/schemas/Order' }
 *                     coupons:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/Coupon' }
 */
router.get('/stats/:userId', AdminController.getUserStats);

export default router;
