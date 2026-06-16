import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Uniblox E-Commerce API',
      version: '1.0.0',
      description:
        'E-commerce store with cart management, checkout, and nth-order discount system. ' +
        'Built with TypeScript + Express using Clean Architecture.',
    },
    servers: [{ url: 'http://localhost:3000', description: 'Local development' }],
    tags: [
      { name: 'Cart',     description: 'Add items and manage the shopping cart' },
      { name: 'Checkout', description: 'Place orders and apply discount coupons' },
      { name: 'Admin',    description: 'Generate coupons and view store statistics' },
    ],
    components: {
      schemas: {
        CartItem: {
          type: 'object',
          properties: {
            productId:  { type: 'string', example: 'p1' },
            name:       { type: 'string', example: 'Wireless Headphones' },
            price:      { type: 'number', example: 2999 },
            quantity:   { type: 'integer', example: 2 },
          },
        },
        Cart: {
          type: 'object',
          properties: {
            userId:    { type: 'string', example: 'user1' },
            items:     { type: 'array', items: { $ref: '#/components/schemas/CartItem' } },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Order: {
          type: 'object',
          properties: {
            id:             { type: 'string', format: 'uuid' },
            userId:         { type: 'string', example: 'user1' },
            items:          { type: 'array', items: { $ref: '#/components/schemas/CartItem' } },
            subtotal:       { type: 'number', example: 5998 },
            discountCode:   { type: 'string', example: 'UNIBLOX-AB12CD34', nullable: true },
            discountAmount: { type: 'number', example: 599.8 },
            total:          { type: 'number', example: 5398.2 },
            status:         { type: 'string', enum: ['PLACED', 'CANCELLED', 'COMPLETED'] },
            placedAt:       { type: 'string', format: 'date-time' },
          },
        },
        Coupon: {
          type: 'object',
          properties: {
            code:            { type: 'string', example: 'UNIBLOX-AB12CD34' },
            type:            { type: 'string', enum: ['USER_SPECIFIC', 'GLOBAL'] },
            userId:          { type: 'string', nullable: true, example: 'user1' },
            discountPercent: { type: 'number', example: 10 },
            minOrderAmount:  { type: 'number', example: 1500 },
            isUsed:          { type: 'boolean', example: false },
            createdAt:       { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error:   { type: 'string', example: 'Error message' },
          },
        },
      },
    },
  },
  // Route files will add @swagger JSDoc annotations as they are created
  apis: ['./src/interfaces/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
