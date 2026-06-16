import express, { Application, Request, Response } from 'express';

const app: Application = express();

app.use(express.json());

// Health check — useful for load balancers and readiness probes in production
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default app;
