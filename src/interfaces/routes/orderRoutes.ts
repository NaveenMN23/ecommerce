import { Router } from 'express';
import { OrderController } from '../controllers/OrderController';

const router = Router();

/**
 * @swagger
 * /api/orders/{userId}:
 *   get:
 *     tags: [Orders]
 *     summary: Get order history for a user
 *     description: |
 *       Returns all orders placed by a user, sorted newest-first.
 *
 *       This is the user-facing order history endpoint — distinct from
 *       `GET /api/admin/stats/:userId` which is admin-scoped and mixes stats
 *       with purchase history.
 *
 *       Returns 404 if the user has not placed any orders yet.
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *         example: user1
 *     responses:
 *       200:
 *         description: Order history with summary totals
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:     { type: boolean, example: true }
 *                 totalOrders: { type: integer, example: 3 }
 *                 totalSpend:  { type: number, example: 14994, description: "Sum of all order totals in ₹" }
 *                 orders:
 *                   type: array
 *                   description: Orders sorted newest-first
 *                   items: { $ref: '#/components/schemas/Order' }
 *       404:
 *         description: No orders found for this user
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.get('/:userId', OrderController.getOrderHistory);

export default router;
