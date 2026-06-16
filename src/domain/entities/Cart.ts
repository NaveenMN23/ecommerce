export interface CartItem {
  productId: string;
  name: string;
  price: number; // price snapshot at time of add — protects against price changes
  quantity: number;
}

export interface Cart {
  userId: string;
  items: CartItem[];
  createdAt: Date;
  updatedAt: Date;
}
