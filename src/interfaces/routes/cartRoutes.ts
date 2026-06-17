import { Router } from 'express';
import { CartController } from '../controllers/CartController';

const router = Router();

/**
 * @swagger
 * /api/cart/{userId}/items:
 *   post:
 *     tags: [Cart]
 *     summary: Add item to cart
 *     description: Adds a product to the user's cart. Validates stock and snapshots the price at add-time.
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *         example: user1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId, quantity]
 *             properties:
 *               productId: { type: string, example: p1 }
 *               quantity:  { type: integer, minimum: 1, example: 2 }
 *     responses:
 *       200:
 *         description: Item added to cart
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 cart:    { $ref: '#/components/schemas/Cart' }
 *       400:
 *         description: Invalid input or insufficient stock
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       404:
 *         description: Product not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.post('/:userId/items', CartController.addItem);

/**
 * @swagger
 * /api/cart/{userId}:
 *   get:
 *     tags: [Cart]
 *     summary: View cart
 *     description: Returns the current cart for a user. Returns empty cart if none exists.
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *         example: user1
 *     responses:
 *       200:
 *         description: Cart contents with running total
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 cart:    { $ref: '#/components/schemas/Cart' }
 *                 total:   { type: number, example: 5998 }
 */
router.get('/:userId', CartController.viewCart);

export default router;
