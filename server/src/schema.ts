import { z } from 'zod';

// Payment type enum
export const paymentTypeSchema = z.enum(['cash', 'card']);
export type PaymentType = z.infer<typeof paymentTypeSchema>;

// Order status enum
export const orderStatusSchema = z.enum(['pending', 'completed', 'cancelled']);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

// Product schema
export const productSchema = z.object({
  id: z.number(),
  qr_code: z.string(), // Unique QR code identifier
  name: z.string(),
  price: z.number(), // Price in decimal format
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Product = z.infer<typeof productSchema>;

// Input schema for creating products
export const createProductInputSchema = z.object({
  qr_code: z.string().min(1, "QR code is required"),
  name: z.string().min(1, "Product name is required"),
  price: z.number().positive("Price must be positive")
});

export type CreateProductInput = z.infer<typeof createProductInputSchema>;

// Input schema for updating products
export const updateProductInputSchema = z.object({
  id: z.number(),
  qr_code: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  price: z.number().positive().optional()
});

export type UpdateProductInput = z.infer<typeof updateProductInputSchema>;

// Order schema
export const orderSchema = z.object({
  id: z.number(),
  total_amount: z.number(), // Total amount for the order
  payment_type: paymentTypeSchema,
  status: orderStatusSchema,
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Order = z.infer<typeof orderSchema>;

// Order item schema (individual products in an order)
export const orderItemSchema = z.object({
  id: z.number(),
  order_id: z.number(),
  product_id: z.number(),
  quantity: z.number().int().positive(),
  unit_price: z.number(), // Price at the time of order
  subtotal: z.number(), // quantity * unit_price
  created_at: z.coerce.date()
});

export type OrderItem = z.infer<typeof orderItemSchema>;

// Cart item schema for building orders
export const cartItemInputSchema = z.object({
  product_id: z.number(),
  quantity: z.number().int().positive("Quantity must be positive")
});

export type CartItemInput = z.infer<typeof cartItemInputSchema>;

// Input schema for creating orders
export const createOrderInputSchema = z.object({
  items: z.array(cartItemInputSchema).min(1, "Order must contain at least one item"),
  payment_type: paymentTypeSchema
});

export type CreateOrderInput = z.infer<typeof createOrderInputSchema>;

// Input schema for updating order status
export const updateOrderStatusInputSchema = z.object({
  id: z.number(),
  status: orderStatusSchema
});

export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusInputSchema>;

// Schema for product lookup by QR code
export const productByQrCodeInputSchema = z.object({
  qr_code: z.string().min(1, "QR code is required")
});

export type ProductByQrCodeInput = z.infer<typeof productByQrCodeInputSchema>;