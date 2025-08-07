import { z } from 'zod';

// Product schema
export const productSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  stock_quantity: z.number().int().nonnegative(),
  purchase_price: z.number().nonnegative(), // Harga beli
  selling_price: z.number().positive(), // Harga jual
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Product = z.infer<typeof productSchema>;

// Input schema for creating products
export const createProductInputSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  description: z.string().nullable(),
  stock_quantity: z.number().int().nonnegative(),
  purchase_price: z.number().nonnegative(),
  selling_price: z.number().positive()
});

export type CreateProductInput = z.infer<typeof createProductInputSchema>;

// Input schema for updating products
export const updateProductInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  stock_quantity: z.number().int().nonnegative().optional(),
  purchase_price: z.number().nonnegative().optional(),
  selling_price: z.number().positive().optional()
});

export type UpdateProductInput = z.infer<typeof updateProductInputSchema>;

// Customer schema
export const customerSchema = z.object({
  id: z.number(),
  name: z.string(),
  phone: z.string().nullable(),
  email: z.string().email().nullable(),
  address: z.string().nullable(),
  created_at: z.coerce.date()
});

export type Customer = z.infer<typeof customerSchema>;

// Input schema for creating customers
export const createCustomerInputSchema = z.object({
  name: z.string().min(1, "Customer name is required"),
  phone: z.string().nullable(),
  email: z.string().email().nullable(),
  address: z.string().nullable()
});

export type CreateCustomerInput = z.infer<typeof createCustomerInputSchema>;

// Transaction schema
export const transactionSchema = z.object({
  id: z.number(),
  customer_id: z.number().nullable(),
  total_amount: z.number().positive(),
  transaction_date: z.coerce.date(),
  created_at: z.coerce.date()
});

export type Transaction = z.infer<typeof transactionSchema>;

// Transaction item schema
export const transactionItemSchema = z.object({
  id: z.number(),
  transaction_id: z.number(),
  product_id: z.number(),
  quantity: z.number().int().positive(),
  unit_price: z.number().positive(),
  subtotal: z.number().positive()
});

export type TransactionItem = z.infer<typeof transactionItemSchema>;

// Input schema for creating transactions
export const createTransactionInputSchema = z.object({
  customer_id: z.number().nullable(),
  items: z.array(z.object({
    product_id: z.number(),
    quantity: z.number().int().positive(),
    unit_price: z.number().positive()
  })).min(1, "At least one item is required")
});

export type CreateTransactionInput = z.infer<typeof createTransactionInputSchema>;

// Sales report schemas
export const dailySalesReportSchema = z.object({
  date: z.coerce.date(),
  total_transactions: z.number().int().nonnegative(),
  total_revenue: z.number().nonnegative(),
  total_items_sold: z.number().int().nonnegative()
});

export type DailySalesReport = z.infer<typeof dailySalesReportSchema>;

export const monthlySalesReportSchema = z.object({
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  total_transactions: z.number().int().nonnegative(),
  total_revenue: z.number().nonnegative(),
  total_items_sold: z.number().int().nonnegative()
});

export type MonthlySalesReport = z.infer<typeof monthlySalesReportSchema>;

// Query schemas
export const getProductByIdSchema = z.object({
  id: z.number()
});

export type GetProductByIdInput = z.infer<typeof getProductByIdSchema>;

export const getCustomerByIdSchema = z.object({
  id: z.number()
});

export type GetCustomerByIdInput = z.infer<typeof getCustomerByIdSchema>;

export const getTransactionByIdSchema = z.object({
  id: z.number()
});

export type GetTransactionByIdInput = z.infer<typeof getTransactionByIdSchema>;

export const getDailySalesReportSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
});

export type GetDailySalesReportInput = z.infer<typeof getDailySalesReportSchema>;

export const getMonthlySalesReportSchema = z.object({
  year: z.number().int(),
  month: z.number().int().min(1).max(12)
});

export type GetMonthlySalesReportInput = z.infer<typeof getMonthlySalesReportSchema>;