import { Router } from 'express';
import { CheckoutController } from '../controllers/CheckoutController';

const router = Router();

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
 *       - Each coupon is single-use.
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
