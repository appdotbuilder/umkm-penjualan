import { serial, text, pgTable, timestamp, numeric, integer, foreignKey } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Products table
export const productsTable = pgTable('products', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'), // Nullable by default
  stock_quantity: integer('stock_quantity').notNull().default(0),
  purchase_price: numeric('purchase_price', { precision: 10, scale: 2 }).notNull(), // Harga beli
  selling_price: numeric('selling_price', { precision: 10, scale: 2 }).notNull(), // Harga jual
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Customers table
export const customersTable = pgTable('customers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone'), // Nullable by default
  email: text('email'), // Nullable by default
  address: text('address'), // Nullable by default
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Transactions table
export const transactionsTable = pgTable('transactions', {
  id: serial('id').primaryKey(),
  customer_id: integer('customer_id'), // Nullable for walk-in customers
  total_amount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
  transaction_date: timestamp('transaction_date').defaultNow().notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  customerFk: foreignKey({
    columns: [table.customer_id],
    foreignColumns: [customersTable.id]
  })
}));

// Transaction items table
export const transactionItemsTable = pgTable('transaction_items', {
  id: serial('id').primaryKey(),
  transaction_id: integer('transaction_id').notNull(),
  product_id: integer('product_id').notNull(),
  quantity: integer('quantity').notNull(),
  unit_price: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
  subtotal: numeric('subtotal', { precision: 10, scale: 2 }).notNull()
}, (table) => ({
  transactionFk: foreignKey({
    columns: [table.transaction_id],
    foreignColumns: [transactionsTable.id]
  }),
  productFk: foreignKey({
    columns: [table.product_id],
    foreignColumns: [productsTable.id]
  })
}));

// Relations
export const productsRelations = relations(productsTable, ({ many }) => ({
  transactionItems: many(transactionItemsTable),
}));

export const customersRelations = relations(customersTable, ({ many }) => ({
  transactions: many(transactionsTable),
}));

export const transactionsRelations = relations(transactionsTable, ({ one, many }) => ({
  customer: one(customersTable, {
    fields: [transactionsTable.customer_id],
    references: [customersTable.id],
  }),
  items: many(transactionItemsTable),
}));

export const transactionItemsRelations = relations(transactionItemsTable, ({ one }) => ({
  transaction: one(transactionsTable, {
    fields: [transactionItemsTable.transaction_id],
    references: [transactionsTable.id],
  }),
  product: one(productsTable, {
    fields: [transactionItemsTable.product_id],
    references: [productsTable.id],
  }),
}));

// TypeScript types for the table schemas
export type Product = typeof productsTable.$inferSelect;
export type NewProduct = typeof productsTable.$inferInsert;

export type Customer = typeof customersTable.$inferSelect;
export type NewCustomer = typeof customersTable.$inferInsert;

export type Transaction = typeof transactionsTable.$inferSelect;
export type NewTransaction = typeof transactionsTable.$inferInsert;

export type TransactionItem = typeof transactionItemsTable.$inferSelect;
export type NewTransactionItem = typeof transactionItemsTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = {
  products: productsTable,
  customers: customersTable,
  transactions: transactionsTable,
  transactionItems: transactionItemsTable
};