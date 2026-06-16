import express, { Application, Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger';

const app: Application = express();

app.use(express.json());

// API docs — live at /api-docs, auto-updated as route annotations are added
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check — useful for load balancers and readiness probes in production
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default app;
