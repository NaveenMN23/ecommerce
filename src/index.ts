import app from './app';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`\nUniblox E-Commerce API running on http://localhost:${PORT}`);
  console.log('\nRoutes:');
  console.log('  POST   /api/cart/:userId/items');
  console.log('  POST   /api/checkout/:userId');
  console.log('  POST   /api/admin/coupons/generate');
  console.log('  GET    /api/admin/stats\n');
});
