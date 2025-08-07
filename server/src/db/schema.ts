import { serial, text, pgTable, timestamp, numeric, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const paymentTypeEnum = pgEnum('payment_type', ['cash', 'card']);
export const orderStatusEnum = pgEnum('order_status', ['pending', 'completed', 'cancelled']);

// Products table
export const productsTable = pgTable('products', {
  id: serial('id').primaryKey(),
  qr_code: text('qr_code').notNull().unique(), // Unique QR code identifier for scanning
  name: text('name').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(), // Use numeric for monetary values
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Orders table
export const ordersTable = pgTable('orders', {
  id: serial('id').primaryKey(),
  total_amount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
  payment_type: paymentTypeEnum('payment_type').notNull(),
  status: orderStatusEnum('status').notNull().default('pending'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Order items table (junction table for orders and products)
export const orderItemsTable = pgTable('order_items', {
  id: serial('id').primaryKey(),
  order_id: integer('order_id').notNull().references(() => ordersTable.id, { onDelete: 'cascade' }),
  product_id: integer('product_id').notNull().references(() => productsTable.id, { onDelete: 'cascade' }),
  quantity: integer('quantity').notNull(),
  unit_price: numeric('unit_price', { precision: 10, scale: 2 }).notNull(), // Price at time of order
  subtotal: numeric('subtotal', { precision: 10, scale: 2 }).notNull(), // quantity * unit_price
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const ordersRelations = relations(ordersTable, ({ many }) => ({
  items: many(orderItemsTable),
}));

export const orderItemsRelations = relations(orderItemsTable, ({ one }) => ({
  order: one(ordersTable, {
    fields: [orderItemsTable.order_id],
    references: [ordersTable.id],
  }),
  product: one(productsTable, {
    fields: [orderItemsTable.product_id],
    references: [productsTable.id],
  }),
}));

export const productsRelations = relations(productsTable, ({ many }) => ({
  orderItems: many(orderItemsTable),
}));

// TypeScript types for the table schemas
export type Product = typeof productsTable.$inferSelect;
export type NewProduct = typeof productsTable.$inferInsert;

export type Order = typeof ordersTable.$inferSelect;
export type NewOrder = typeof ordersTable.$inferInsert;

export type OrderItem = typeof orderItemsTable.$inferSelect;
export type NewOrderItem = typeof orderItemsTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = { 
  products: productsTable,
  orders: ordersTable,
  orderItems: orderItemsTable
};

export const tableRelations = {
  ordersRelations,
  orderItemsRelations,
  productsRelations
};