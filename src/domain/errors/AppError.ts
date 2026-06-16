export class AppError extends Error {
  constructor(
    public readonly message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = this.constructor.name;
    // Restores prototype chain broken by extending built-in Error in TypeScript
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ProductNotFoundError extends AppError {
  constructor(productId: string) {
    super(`Product not found: ${productId}`, 404);
  }
}

export class InsufficientStockError extends AppError {
  constructor(productName: string, requested: number, available: number) {
    super(
      `Insufficient stock for '${productName}': requested ${requested}, available ${available}`,
      400
    );
  }
}

export class CartNotFoundError extends AppError {
  constructor(userId: string) {
    super(`No cart found for user: ${userId}`, 404);
  }
}

export class CartEmptyError extends AppError {
  constructor() {
    super('Cart is empty. Add items before checkout.', 400);
  }
}

export class CouponNotFoundError extends AppError {
  constructor(code: string) {
    super(`Coupon not found: ${code}`, 404);
  }
}

export class CouponAlreadyUsedError extends AppError {
  constructor(code: string) {
    super(`Coupon '${code}' has already been used.`, 400);
  }
}
