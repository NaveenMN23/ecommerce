import express, { Application, Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger';
import productRoutes from './interfaces/routes/productRoutes';
import cartRoutes from './interfaces/routes/cartRoutes';
import checkoutRoutes from './interfaces/routes/checkoutRoutes';
import adminRoutes from './interfaces/routes/adminRoutes';
import { errorHandler } from './interfaces/middleware/errorHandler';

const app: Application = express();

app.use(express.json());

// API docs — live at /api-docs, auto-updated as route annotations are added
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global error handler — must be last
app.use(errorHandler);

export default app;
