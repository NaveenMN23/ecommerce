import { Router } from 'express';
import { CheckoutController } from '../controllers/CheckoutController';

const router = Router();

/**
 * @swagger
 * /api/checkout/{userId}/preview:
 *   post:
 *     tags: [Checkout]
 *     summary: Preview order total before confirming
 *     description: |
 *       Runs all checkout validations (cart, stock, coupon) and returns the price
 *       breakdown — **without placing an order or consuming the coupon**.
 *
 *       Use this to show users a discount breakdown before they click "Pay Now".
 *       The coupon remains available for the actual checkout call.
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *         example: user1
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               couponCode:
 *                 type: string
 *                 example: UNIBLOX-AB12CD34
 *                 description: Optional coupon to preview discount for.
 *     responses:
 *       200:
 *         description: Price breakdown (no side effects)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 preview:
 *                   type: object
 *                   properties:
 *                     items:          { type: array, items: { $ref: '#/components/schemas/CartItem' } }
 *                     subtotal:       { type: number, example: 2999 }
 *                     discountCode:   { type: string, example: UNIBLOX-AB12CD34, nullable: true }
 *                     discountAmount: { type: number, example: 299.9 }
 *                     total:          { type: number, example: 2699.1 }
 *                     nextCouponAt:   { type: integer, example: 5 }
 *       400:
 *         description: Empty cart, insufficient stock, or invalid coupon
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       404:
 *         description: Cart or coupon not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.post('/:userId/preview', CheckoutController.preview);

/**
 * @swagger
 * /api/checkout/{userId}:
 *   post:
 *     tags: [Checkout]
 *     summary: Place an order
 *     description: |
 *       Checks out the user's cart. Re-validates stock, applies coupon if provided,
 *       decrements inventory, creates the order, and clears the cart.
 *
 *       **Coupon rules:**
 *       - `USER_SPECIFIC` coupons can only be used by the user they were issued to.
 *       - Cart total must meet the coupon's `minOrderAmount`.
 *       - `USER_SPECIFIC` coupons are single-use globally; `GLOBAL` coupons are single-use per user.
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *         example: user1
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               couponCode:
 *                 type: string
 *                 example: UNIBLOX-AB12CD34
 *                 description: Optional. Omit for checkout without discount.
 *     responses:
 *       200:
 *         description: Order placed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:      { type: boolean, example: true }
 *                 order:        { $ref: '#/components/schemas/Order' }
 *                 nextCouponAt: { type: integer, example: 5, description: Orders until next reward }
 *       400:
 *         description: Empty cart, insufficient stock, or invalid coupon
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       403:
 *         description: Coupon belongs to a different user
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       404:
 *         description: Cart or coupon not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.post('/:userId', CheckoutController.checkout);

export default router;
