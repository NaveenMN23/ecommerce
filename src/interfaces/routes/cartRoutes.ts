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

/**
 * @swagger
 * /api/cart/{userId}/items/{productId}:
 *   put:
 *     tags: [Cart]
 *     summary: Update item quantity
 *     description: |
 *       Sets the quantity of an existing cart item to a new absolute value.
 *       Pass `quantity: 0` to remove the item.
 *       Unlike the add endpoint, this is a SET operation — it does not add on top of existing quantity.
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *         example: user2
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: string }
 *         example: p1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [quantity]
 *             properties:
 *               quantity: { type: integer, minimum: 0, example: 46, description: "0 removes the item" }
 *     responses:
 *       200:
 *         description: Cart updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 cart:    { $ref: '#/components/schemas/Cart' }
 *                 total:   { type: number }
 *       400:
 *         description: Invalid quantity or insufficient stock
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       404:
 *         description: Cart or item not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.put('/:userId/items/:productId', CartController.updateItem);

/**
 * @swagger
 * /api/cart/{userId}/items/{productId}:
 *   delete:
 *     tags: [Cart]
 *     summary: Remove item from cart
 *     description: Removes a specific product from the user's cart entirely.
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *         example: user1
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: string }
 *         example: p1
 *     responses:
 *       200:
 *         description: Item removed, updated cart returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 cart:    { $ref: '#/components/schemas/Cart' }
 *                 total:   { type: number }
 *       404:
 *         description: Cart or item not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.delete('/:userId/items/:productId', CartController.removeItem);

export default router;
