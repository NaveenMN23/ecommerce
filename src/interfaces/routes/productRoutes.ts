import { Router } from 'express';
import { ProductController } from '../controllers/ProductController';

const router = Router();

/**
 * @swagger
 * /api/products:
 *   get:
 *     tags: [Products]
 *     summary: List all products
 *     description: Returns all products in the catalog with current stock levels.
 *     responses:
 *       200:
 *         description: Product list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 products:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:          { type: string, example: p1 }
 *                       name:        { type: string, example: Wireless Headphones }
 *                       description: { type: string }
 *                       price:       { type: number, example: 2999 }
 *                       stock:       { type: integer, example: 50 }
 */
router.get('/', ProductController.list);

export default router;
