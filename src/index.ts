import app from './app';
import { registerAllHandlers } from './events/handlers';
import { config } from './config';
import { logger } from './utils/logger';

registerAllHandlers();

app.listen(config.PORT, () => {
  logger.info('Uniblox E-Commerce API started', { port: config.PORT, nthOrder: config.NTH_ORDER });
  console.log(`\nUniblox E-Commerce API running on http://localhost:${config.PORT}`);
  console.log('\nRoutes:');
  console.log('  GET    /api/products');
  console.log('  POST   /api/cart/:userId/items');
  console.log('  GET    /api/cart/:userId');
  console.log('  POST   /api/checkout/:userId');
  console.log('  POST   /api/admin/coupons/generate');
  console.log('  GET    /api/admin/coupons');
  console.log('  GET    /api/admin/stats');
  console.log('  GET    /api/admin/stats/:userId');
  console.log('  GET    /health');
  console.log(`\n  API Docs: http://localhost:${config.PORT}/api-docs\n`);
});
