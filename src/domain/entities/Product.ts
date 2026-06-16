export interface Product {
  id: string;
  name: string;
  description: string;
  price: number; // in INR (₹)
  stock: number;
}

export const PRODUCT_CATALOG: Map<string, Product> = new Map([
  ['p1', { id: 'p1', name: 'Wireless Headphones', description: 'Noise-cancelling over-ear headphones', price: 2999, stock: 50 }],
  ['p2', { id: 'p2', name: 'Mechanical Keyboard', description: 'TKL mechanical keyboard, blue switches', price: 4499, stock: 30 }],
  ['p3', { id: 'p3', name: 'USB-C Hub',           description: '7-in-1 USB-C hub with HDMI and PD', price: 1799, stock: 100 }],
  ['p4', { id: 'p4', name: 'Webcam HD',            description: '1080p webcam with built-in mic', price: 2499, stock: 20 }],
  ['p5', { id: 'p5', name: 'Desk Lamp',            description: 'LED desk lamp with wireless charging', price: 1299, stock: 75 }],
]);
